import { AutodartsToolsBoardData, type IBoard } from "./board-data-storage";
import { AutodartsToolsBoardImages } from "./board-image-storage";
import { AutodartsToolsGameData } from "./game-data-storage";
import { AutodartsToolsLobbyData } from "./lobby-data-storage";

import type { RoomStore } from "@/utils/team-room";
import type { AdtTeams, LineupStore, TeamViewContext } from "@/utils/teams";
import type { IGameEvent, IGameEventBatch } from "@/utils/game-events/types";

import { AutodartsToolsConfig, AutodartsToolsGlobalStatus, AutodartsToolsTeamLineups, AutodartsToolsTeamRoom } from "@/utils/storage";
import { roomOf, screenTeams, tokenAccount } from "@/utils/team-room";
import { lineupOf, lineupPartnerRule, normalizeTeams, teamView, voidedVisit } from "@/utils/teams";
import { VOID_CHECKOUT_ATTR } from "@/utils/void-checkout";

interface IUserSettings {
  callCheckouts: boolean;
  callScores: boolean;
  caller: string;
  callerEmotion: string;
  callerLanguage: string;
  callerVolume: number;
  countEachThrow: boolean;
  showAnimations: boolean;
  showChalkboard: boolean;
  showCheckoutGuide: boolean;
  showSeasonalEffects: boolean;
}

interface IUser {
  avatarUrl: string;
  average: number;
  averageUntil170: number;
  checkoutRate: number;
  country: string;
  first9Average: number;
  id: string;
  legsPlayed: number;
  name: string;
  total180s: number;
  tournament180s: number;
  tournamentAverage: number;
  tournamentAverageUntil170: number;
  tournamentWins: number;
  tournamentsPlayed: number;
  userSettings: IUserSettings;
}

export interface IPlayer {
  avatarUrl: string;
  boardId: string;
  boardName: string;
  cpuPPR: number | null;
  host: IUser;
  hostId: string;
  id: string;
  index: number;
  name: string;
  user: IUser;
  userId: string;
}

interface ILobbySettings {
  baseScore: number;
  bullMode: string;
  inMode: string;
  maxRounds: number;
  outMode: string;
  /** Cricket's mode: `Cricket`, `Tactics` or `Hidden Cricket`. */
  gameMode?: string;
}

export interface ILobbies {
  bullOffMode: "Off" | "Normal" | "Official";
  createdAt: string;
  host: IUser;
  id: string;
  isPrivate: boolean;
  maxPlayers: number;
  /** "First to N legs". */
  legs?: number | null;
  /** Sets to win, or null in a legs match. */
  sets?: number | null;
  players: IPlayer[];
  settings: ILobbySettings;
  variant: "Bull-off" | "X01" | "Cricket" | "Bermuda" | "Shanghai" | "Gotcha" | "ATC" | "RTW" | "Random Checkout" | "CountUp" | "Segment Training" | "Bob's 27";
}

export interface IMatchSettings {
  mode: string;
  gameMode: string;
}

export interface ISegment {
  name: string;
  number: number;
  bed: string;
  multiplier: number;
}

export interface ICoords {
  x: number;
  y: number;
}

export interface IThrow {
  id: string;
  throw: number;
  createdAt: string;
  segment: ISegment;
  coords?: ICoords;
  entry: string;
  marks: any | null;
}

export interface ITurn {
  id: string;
  createdAt: string;
  finishedAt: string;
  round: number;
  turn: number;
  playerId: string;
  score: number;
  points: number;
  marks: any | null;
  busted: boolean;
  throws: IThrow[];
}

export interface IStats {
  segmentNumber?: number;
  bullDistance?: number;
  coords?: ICoords | null;
  average?: number;
  averageUntil170?: number;
  checkoutPercent?: number;
  checkoutPoints?: number;
  checkoutPointsAverage?: number;
  checkouts?: number;
  checkoutsHit?: number;
  dartsThrown?: number;
  dartsUntil170?: number;
  first9Average?: number;
  first9Score?: number;
  gameId?: string;
  less60?: number;
  playerId?: string;
  plus100?: number;
  plus140?: number;
  plus170?: number;
  plus60?: number;
  score?: number;
  scoreUntil170?: number;
  total180?: number;
}

export interface IPlayerStats {
  matchStats: IStats;
  setStats: IStats | null;
  legStats: IStats | null;
}

export interface IChalkboardRow {
  isPointsStruck: boolean;
  isScoreStruck: boolean;
  points: number;
  round: number;
  score: number;
}

export interface IChalkboard {
  rows: IChalkboardRow[];
}

export interface IScore {
  legs: number;
  sets: number;
}

export interface IX01Settings extends IMatchSettings {
  baseScore: number;
  bullMode: string;
  gameId: string;
  inMode: string;
  maxRounds: number;
  outMode: string;
}

/**
 * Gotcha counts up to a target instead of down to zero, so its settings say how
 * far there is to go and how you have to land on it. That is the whole payload
 * — no `mode`, no `gameMode`, no in-mode — so it neither extends
 * {@link IMatchSettings} nor joins the union on {@link IMatch}: putting it
 * there would only stop the `settings.mode` reads inside other variants'
 * branches from narrowing. Read it off a match with a cast, as
 * utils/checkout.ts does.
 */
export interface IGotchaSettings {
  targetScore: number;
  outMode: "Straight" | "Double" | "Master";
  maxRounds: number;
}

export interface IMatch {
  body?: any;
  id: string;
  activated?: -1 | 0 | 1 | 2;
  createdAt: string;
  host: IUser;
  variant: string;
  settings: IX01Settings | IMatchSettings;
  players: IPlayer[];
  scores: IScore[] | null;
  type: string;
  set: number;
  leg: number;
  sets?: number;
  legs?: number;
  finished: boolean;
  winner: number;
  turns: ITurn[];
  round: number;
  player: number;
  turnScore: number;
  turnBusted: boolean;
  gameScores: number[];
  gameFinished: boolean;
  gameWinner: number;
  stats: IPlayerStats[];
  state: Record<string, any>;
  chalkboards?: IChalkboard[];
  /** Set by Teams' team view (utils/teams.ts) on a frame it changed: not the server's. */
  adtTeams?: AdtTeams;
}

/**
 * `event` values that belong to the channel rather than to a board.
 *
 * The site announces its own subscriptions on `autodarts.boards`, as
 * `{event: "start", id: "<matchId>"}` and its `delete` counterpart — no status,
 * no board, and an id that is not a board's. A board's own events read as
 * "Throw detected", "Takeout started", "Takeout finished", which several
 * features match on, so only these two words are turned away and only when the
 * frame carries no board state at all.
 */
const CHANNEL_EVENTS = new Set([ "start", "delete" ]);

/** A board page names its board in the URL: `/boards/<id>`. */
function boardIdFromUrl(): string | undefined {
  return window.location.href.match(/\/boards\/([0-9a-f-]+)/i)?.[1];
}

/**
 * Whether a board frame describes a board this page is about.
 *
 * `autodarts.boards` is a shared channel and there is one {@link IBoard} record
 * behind it, so without this every board the socket mentions wrote the state
 * the whole extension reads — a takeout on a board with no connection to this
 * page put "Removing Darts" across the screen. It was the only case in the
 * switch below with no identity check; lobbies and matches both filter on the
 * id in the URL.
 *
 * Rejection needs positive evidence, because a frame wrongly turned away is a
 * feature that quietly stops working: a board is somebody else's only when we
 * know of boards this page is about and it is none of them. A frame that names
 * no board, and a page with no board to compare against, are both kept.
 *
 * Which boards those are is the page: watching one names it in the URL, and
 * that is the board on screen whoever happens to be signed in. Otherwise it is
 * whatever is playing in this match — an opponent's takeout holds this match up
 * just as yours does — plus `selectedBoard`, the site's own note of which board
 * this browser is pointed at, for the moments before the match data lands.
 */
async function isWatchedBoard(id: string | undefined): Promise<boolean> {
  if (!id) return true;

  const watched = boardIdFromUrl();
  if (watched) return id === watched;

  const match = (await AutodartsToolsGameData.getValue())?.match;
  const known = new Set((match?.players ?? []).map(player => player.boardId).filter(Boolean));

  const selected = localStorage.getItem("selectedBoard");
  if (selected) known.add(selected);

  return known.size ? known.has(id) : true;
}

/**
 * Teams' settings and own-score lineups, for the team view: read once, then
 * kept current by watchers, so storing a frame waits on nothing after the first.
 */
let teamsContext: { enabled: boolean; partnerRule: boolean; online: boolean; lineups: LineupStore; rooms: RoomStore; me: string | null } | undefined;
let teamsContextLoad: Promise<void> | undefined;

function loadTeamsContext(): Promise<void> {
  teamsContextLoad ??= (async () => {
    const [ config, lineups, rooms, status ] = await Promise.all([ AutodartsToolsConfig.getValue(), AutodartsToolsTeamLineups.getValue(), AutodartsToolsTeamRoom.getValue(), AutodartsToolsGlobalStatus.getValue() ]);
    const teams = normalizeTeams(config?.teams);
    teamsContext = { enabled: teams.enabled, partnerRule: teams.partnerRule, online: teams.online, lineups: lineups ?? {}, rooms: rooms ?? {}, me: tokenAccount(status?.auth?.token)?.userId ?? null };
    AutodartsToolsConfig.watch((next) => {
      const nextTeams = normalizeTeams(next?.teams);
      if (!teamsContext) return;
      teamsContext.enabled = nextTeams.enabled;
      teamsContext.partnerRule = nextTeams.partnerRule;
      teamsContext.online = nextTeams.online;
      flagVoidedVisit();
    });
    AutodartsToolsTeamLineups.watch((next) => {
      if (teamsContext) teamsContext.lineups = next ?? {};
      flagVoidedVisit();
    });
    AutodartsToolsTeamRoom.watch((next) => {
      if (teamsContext) teamsContext.rooms = next ?? {};
      flagVoidedVisit();
    });
    // The token can arrive after this script, which runs at document_start.
    AutodartsToolsGlobalStatus.watch((next) => {
      if (teamsContext) teamsContext.me = tokenAccount(next?.auth?.token)?.userId ?? null;
    });
  })();
  return teamsContextLoad;
}

/**
 * Teams' rules for a frame: the lineup is the frame's own match's, whatever
 * page this tab is on, with Online Teams' other accounts' teams added
 * (utils/team-room.ts), and so is its partner rule, which is the host's.
 */
function teamContext(match: IMatch): TeamViewContext | undefined {
  if (!teamsContext) return undefined;
  const view = screenTeams({
    players: match.players ?? [],
    saved: [],
    lineup: lineupOf(teamsContext.lineups, match.id),
    shifts: {},
    room: teamsContext.online ? roomOf(teamsContext.rooms, match.id) : undefined,
    me: teamsContext.me,
    hostId: match.host?.id,
  });
  return { enabled: teamsContext.enabled, partnerRule: lineupPartnerRule(view.lineup, teamsContext.partnerRule), lineup: view.lineup };
}

/**
 * The match as Teams' rules see it (utils/teams.ts): an own-score team's
 * deciding leg as the match won, a partner-rule checkout as a bust. Every
 * feature reads game data from here, so none of them needs team code.
 */
function asTeamsSee(match: IMatch): IMatch {
  const context = teamContext(match);
  return context ? teamView(match, context) : match;
}

/** The last frame as Teams' rules saw it, for when those rules change mid-visit. */
let lastSeen: IMatch | undefined;

/**
 * Names the visit up on `<html>` while the partner rule would take its
 * checkout back, so that the page script shows the site that checkout as the
 * bust we see, with no GAME SHOT (utils/void-checkout.ts); takes the name down
 * otherwise. A frame reaches the site before it reaches us, so this is set
 * from the frames before the checkout's.
 */
function flagVoidedVisit(match: IMatch | undefined = lastSeen): void {
  lastSeen = match;
  const context = match && teamContext(match);
  const visit = match && context ? voidedVisit(match, context) : undefined;
  if (visit) document.documentElement.setAttribute(VOID_CHECKOUT_ATTR, visit);
  else document.documentElement.removeAttribute(VOID_CHECKOUT_ATTR);
}

/**
 * A match's game events (utils/game-events/types.ts), held back for the state
 * frame they belong to. The server sends them a moment before that frame, so
 * they are stored with it, as `IGameData.batch`, and whoever reads the state
 * reads what happened in the same update.
 */
const pendingEvents = new Map<string, IGameEvent[]>();
/** Events older than this when a state comes were for a state that never came. */
const EVENT_MAX_AGE_MS = 5000;
/** A new id for every frame stored, unique to this page: a reload starts the count again. */
const batchPage = Math.random().toString(36).slice(2, 8);
let batchCount = 0;
/** The match whose state was stored last, for events on a board page, whose address names no match. */
let lastStateMatchId: string | undefined;
/**
 * A match's frames are stored one after the other. Each waits on storage, and
 * two in quick succession used to land in either order; with the events going
 * with them, the order is what says which dart they were about.
 */
let matchFrames: Promise<unknown> = Promise.resolve();

/** `<matchId>.<kind>`: the frame's match and what sort of frame it is. */
function matchTopic(topic: string | undefined): { matchId?: string; kind?: string } {
  const dot = topic?.indexOf(".") ?? -1;
  return topic && dot > 0 ? { matchId: topic.slice(0, dot), kind: topic.slice(dot + 1) } : {};
}

function bufferGameEvent(matchId: string | undefined, data: IGameEvent): void {
  if (!matchId || !data?.event) return;
  const pageMatch = window.location.href.match(/matches\/([0-9a-f-]+)/)?.[1];
  if (matchId !== pageMatch && matchId !== lastStateMatchId) return;

  const events = pendingEvents.get(matchId) ?? [];
  events.push({ event: data.event, matchId, body: data.body, receivedAt: Date.now() });
  pendingEvents.set(matchId, events.slice(-20));
}

function takeGameEvents(matchId: string): IGameEvent[] {
  const events = pendingEvents.get(matchId) ?? [];
  pendingEvents.delete(matchId);
  const now = Date.now();
  return events.filter(event => now - (event.receivedAt ?? now) <= EVENT_MAX_AGE_MS);
}

async function storeMatchFrame(data: IMatch, events: IGameEvent[]): Promise<void> {
  if (data.body) return;

  const id = window.location.href.match(/matches\/([0-9a-f-]+)/)?.[1];
  const playersBoard = data.players?.find(player => player.boardId === window.location.href.match(/boards\/([0-9a-f-]+)/)?.[1]);
  if ((id !== data.id && !playersBoard) && data.activated === undefined) return;

  const gameData = await AutodartsToolsGameData.getValue();
  await loadTeamsContext();
  // A frame without events keeps the id before it, and none of its events: a
  // frame sent again is then the same as the one stored, and WXT's watch,
  // which leaves out a value equal to the old one, wakes nobody for it.
  const batch: IGameEventBatch | undefined = events.length
    ? { id: `${batchPage}:${++batchCount}`, events }
    : gameData.batch && { id: gameData.batch.id, events: [] };
  if (data.activated !== undefined) {
    // Merge activated state with existing match data
    await AutodartsToolsGameData.setValue({
      ...gameData,
      match: gameData.match
        ? {
            ...gameData.match,
            activated: data.activated,
          }
        : {
            ...data,
          },
      batch,
    });
  } else {
    // Replace entire match data
    lastStateMatchId = data.id;
    const seen = asTeamsSee(data);
    await AutodartsToolsGameData.setValue({
      ...gameData,
      match: seen,
      batch,
    });
    flagVoidedVisit(seen);
  }
}

/**
 * A frame from the site's socket, by its channel. `topic` is the frame's
 * `<id>.<kind>`; without one (the match state fetched at page load) a match
 * frame is taken as a state.
 */
export async function processWebSocketMessage(channel: string, data: ILobbies | IMatch | IBoard | string, topic?: string) {
  // Frames that only name their topic, as some at a match's start do, carry nothing to act on.
  if (data == null) return;
  // do a switch on the channel
  switch (channel) {
    case "autodarts.lobbies": {
      data = data as ILobbies;
      // The rebuilt site moved this route to /lobby/<id>. Matching only the old
      // spelling meant `id` was undefined on v2 and every lobby message was
      // dropped here, leaving Discord announcements with an empty settings list.
      const id = window.location.href.match(/\/lobb(?:y|ies)\/([0-9a-f-]+)/)?.[1];
      if (id !== data.id) return;

      AutodartsToolsLobbyData.setValue(data as ILobbies);

      break;
    }
    case "autodarts.matches": {
      const { matchId, kind } = matchTopic(topic);

      if (kind === "game-events") {
        bufferGameEvent(matchId ?? (data as unknown as IGameEvent).matchId, data as unknown as IGameEvent);
        break;
      }
      // `.events`, `.referee` and the like carry nothing stored.
      if (kind && kind !== "state" && kind !== "corrections") break;

      // Taken now, before anything waits: the next visit's events can arrive
      // while this frame is still being stored, and must not go with it.
      const events = kind === "state" && matchId ? takeGameEvents(matchId) : [];
      const stored = matchFrames.then(() => storeMatchFrame(data as IMatch, events));
      matchFrames = stored.catch(() => undefined);
      await stored;

      break;
    }
    case "autodarts.boards": {
      // Partial, because that is what arrives: a board sends the fields that
      // changed, and the site sends frames that are not a board at all.
      const board = data as Partial<IBoard>;

      // Some of those frames are the channel talking about itself rather than
      // about a board — see CHANNEL_EVENTS. Merging one in as though it were a
      // board wiped real state and left a match id sitting in `id`.
      const stateless = board.status === undefined && board.connected === undefined;
      if (stateless && CHANNEL_EVENTS.has(board.event ?? "")) break;

      if (!await isWatchedBoard(board.id)) break;

      const boardData = await AutodartsToolsBoardData.getValue();

      AutodartsToolsBoardData.setValue({
        ...boardData,
        ...board,
        status: board.status || "",
      });

      // Search DOM for img with blob: src URL after 250ms delay
      setTimeout(async () => {
        const images = document.querySelectorAll("img[src^=\"blob:\"]");
        if (images.length === 0) return;

        const img = images[0] as HTMLImageElement;
        const blobUrl = img.src;

        try {
          // Convert blob URL to base64 data URL
          const response = await fetch(blobUrl);
          const blob = await response.blob();
          const reader = new FileReader();
          const base64DataUrl = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const boardImages = await AutodartsToolsBoardImages.getValue();
          // Check for duplicates before adding
          if (!boardImages.images.includes(base64DataUrl)) {
            boardImages.images.push(base64DataUrl);
            while (boardImages.images.length > 6) {
              boardImages.images.shift();
            }
            AutodartsToolsBoardImages.setValue(boardImages);
          }
        } catch (error) {
          console.error("Failed to convert blob URL to base64:", error);
        }
      }, 500);

      break;
    }
    case "autodarts.boards.images": {
      break; // Temp disabled because it's not working as expected since last update
      data = data as any;
      const boardImages = await AutodartsToolsBoardImages.getValue();
      const imageUrl = `https://boards.ws.autodarts.com${(data as any).url as string}`;

      // Check for duplicates before adding
      if (!boardImages.images.includes(imageUrl)) {
        boardImages.images.push(imageUrl);
        while (boardImages.images.length > 6) {
          boardImages.images.shift();
        }
        AutodartsToolsBoardImages.setValue(boardImages);
      }

      break;
    }
    default: {
      console.log("Unknown channel", channel);
      // console.log(data);

      break;
    }
  }
}
