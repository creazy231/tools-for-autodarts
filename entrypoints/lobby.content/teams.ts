/**
 * Teams, in the lobby.
 *
 * An Add Team button beside the site's Add Player and Add Bot opens a drawer
 * where the host names a team, picks its colour and puts its players in
 * throwing order. The team joins the lobby as one guest on the host's board,
 * added with the site's own request (utils/lobby-guests.ts), and is saved under
 * its name (utils/teams.ts), so the match, and every later lobby, knows who is
 * in it.
 *
 * A team's row keeps everything the site draws, and gains the team's gradient
 * on its name tag, its throwing order under the name, and a pencil that opens
 * the drawer again to change the players or the colour.
 *
 * Every participant adds their own team, as the site lets every participant
 * add players of their own; the seat order stays the host's.
 *
 * Its words follow the site's language. What is redrawn on every pass (the
 * note on uneven teams, a row's "1 of 2") picks the new one up there; what is
 * written once (Add Team, the pencils, the partner rule's card) is rewritten
 * when the language changes.
 */

import { createApp, reactive } from "vue";

import AddTeamDrawer from "./AddTeamDrawer.vue";
import TeamInvite from "./TeamInvite.vue";
import TeamRoomStatus from "./TeamRoomStatus.vue";

import type { ILobbies } from "@/utils/websocket-helpers";
import type { ColorScheme } from "@/utils/storage";
import type { Connection, RoomSeat, RoomState, RoomStore, ScreenTeams } from "@/utils/team-room";
import type { RoomClientState } from "@/utils/team-room-client";
import type { Lineup, LineupStore, LineupTeam, OwnDraft, PartnerCard, SavedTeam, SeatLike, SeatSlot, TeamDraft, TeamFormat, TeamsMessage, TeamsProblem } from "@/utils/teams";

import { addStyles, removeStyles } from "@/utils";
import { SELECTORS, anyOf, qs, qsa } from "@/utils/selectors";
import { AutodartsToolsConfig, AutodartsToolsTeamLineups, AutodartsToolsTeamRoom } from "@/utils/storage";
import { AutodartsToolsLobbyData } from "@/utils/lobby-data-storage";
import { getUserIdFromToken } from "@/utils/helpers";
import { GUEST_KEY, forgetGuestPlayers } from "@/utils/guest-players";
import { addBot, addGuest, lobbyIdFromUrl, moveSeat } from "@/utils/lobby-guests";
import { language, onLanguageChange, t } from "@/utils/i18n";
import { checkOwnTeam, checkTeam, colourTaken, findTeam, forgettableNames, hasBots, interleave, lineupOf, lineupPartnerRule, memberOf, normalizeName, normalizeTeams, partnerCardState, pickSlots, pruneLineup, rejoinProblem, rejoinSlots, rememberTeam, resolveSlots, savedTeamProblem, seatMoves, sharedRowTeams, sharedTeams, uniqueNames, unseated, withFreeColour, withLineup, withPartnerRule } from "@/utils/teams";
import { memberLabel, unevenText } from "@/utils/teams-text";
import { inviteLists, myRoomTeams, otherAccounts, roomOf, screenTeams, seatOwner, shouldJoin } from "@/utils/team-room";
import { RoomClient, tokenIdentity } from "@/utils/team-room-client";
import { mirrorRoom } from "@/utils/team-room-mirror";

const BUTTON_ID = "adt-add-team";
const NOTE_ID = "adt-team-note";
const PARTNER_CARD_ID = "adt-partner-rule";
/** A reorder settles within this many moves: one fewer than the seats. */
const MAX_REORDER_MOVES = 6;
/** How long a move or an add waits for the lobby update it brings. */
const LOBBY_WAIT_MS = 3000;
const STYLE_ID = "teams-lobby";
/** On a row we have dressed: the team, its players and colour, so a change redresses it. */
const ROW_ATTR = "data-adt-team";
/** On a row's pencil: the team's name, for its spoken name in the language of the moment. */
const EDIT_ATTR = "data-adt-team-edit";
/** On a row of another account's team: no pencil, and the site's 🌐 hidden. */
const REMOTE_ATTR = "data-adt-team-remote";
const INVITE_ID = "adt-invite-team";
const STATUS_TAG = "autodarts-tools-team-room-status";
/** Material Symbols "link" (Apache 2.0). */
const ICON_LINK = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M7 17q-2.075 0-3.537-1.463T2 12t1.463-3.537T7 7h3q.425 0 .713.288T11 8t-.288.713T10 9H7q-1.25 0-2.125.875T4 12t.875 2.125T7 15h3q.425 0 .713.288T11 16t-.288.713T10 17zm2-4q-.425 0-.712-.288T8 12t.288-.712T9 11h6q.425 0 .713.288T16 12t-.288.713T15 13zm5 4q-.425 0-.712-.288T13 16t.288-.712T14 15h3q1.25 0 2.125-.875T20 12t-.875-2.125T17 9h-3q-.425 0-.712-.288T13 8t.288-.712T14 7h3q2.075 0 3.538 1.463T22 12t-1.463 3.538T17 17z\"/></svg>";

/** Material Symbols "group" (Apache 2.0), sized by the site's `[&_svg:not([class*='size-'])]:size-4`. */
const ICON_TEAM = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M1 17.2q0-.85.438-1.562T2.6 14.55q1.55-.775 3.15-1.162T9 13t3.25.388t3.15 1.162q.725.375 1.163 1.088T17 17.2v.8q0 .825-.587 1.413T15 20H3q-.825 0-1.412-.587T1 18zM18.45 20q.275-.45.413-.962T19 18v-1q0-1.1-.612-2.113T16.65 13.15q1.275.15 2.4.513t2.1.887q.9.5 1.375 1.112T23 17v1q0 .825-.587 1.413T21 20zM6.175 10.825Q5 9.65 5 8t1.175-2.825T9 4t2.825 1.175T13 8t-1.175 2.825T9 12t-2.825-1.175m11.65 0Q16.65 12 15 12q-.275 0-.7-.062t-.7-.138q.675-.8 1.038-1.775T15 8t-.362-2.025T13.6 4.2q.35-.125.7-.163T15 4q1.65 0 2.825 1.175T19 8t-1.175 2.825\"/></svg>";
/** Material Symbols "edit" (Apache 2.0). */
const ICON_EDIT = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M4 21q-.425 0-.712-.288T3 20v-2.425q0-.4.15-.763t.425-.637L16.2 3.575q.3-.275.663-.425t.762-.15t.775.15t.65.45L20.425 5q.3.275.437.65T21 6.4q0 .4-.138.763t-.437.662l-12.6 12.6q-.275.275-.638.425t-.762.15zM17.6 7.8L19 6.4L17.6 5l-1.4 1.4z\"/></svg>";

/** The site's name tag, as utils/selectors.ts names it. */
const NAME_TAG_BODY = anyOf(SELECTORS.nameTag.body);
const NAME_TAG_START = anyOf(SELECTORS.nameTag.start);
const NAME_TAG_END = anyOf(SELECTORS.nameTag.end);

const LOBBY_CSS = `
  [${ROW_ATTR}] ${NAME_TAG_BODY} {
    background-image: linear-gradient(to right, var(--adt-team-from), var(--adt-team-to)) !important;
  }
  [${ROW_ATTR}] ${NAME_TAG_BODY} > span.font-display { color: #f7f8fa !important; }
  [${ROW_ATTR}] ${NAME_TAG_START} { color: var(--adt-team-from) !important; }
  [${ROW_ATTR}] ${NAME_TAG_END} { color: var(--adt-team-to) !important; }
  [${ROW_ATTR}] > div:has(> .adt-team-order) { flex-wrap: wrap; }
  .adt-team-order {
    display: flex; flex-wrap: wrap; align-items: center; gap: 4px;
    flex-basis: 100%; padding-left: 40px; margin-top: 4px;
  }
  .adt-team-chip {
    display: inline-flex; align-items: center; height: 22px; padding: 0 9px;
    border-radius: 999px; background: rgb(255 255 255 / 10%); color: rgb(247 248 250 / 75%);
    font-size: 11px; font-weight: 700; line-height: 1; letter-spacing: .02em;
  }
  .adt-team-arrow { color: #4d525d; font-size: 10px; line-height: 1; }
  .adt-team-line { display: flex; flex-basis: 100%; padding-left: 40px; margin-top: 4px; }
  .adt-team-label {
    display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 10px 0 8px;
    border-radius: 999px; background: rgb(255 255 255 / 8%); color: #f7f8fa;
    font-size: 11px; font-weight: 800; line-height: 1; letter-spacing: .02em;
  }
  .adt-team-label i { width: 10px; height: 10px; border-radius: 3px; background: linear-gradient(to right, var(--adt-team-from), var(--adt-team-to)); }
  .adt-team-label small { font-size: 11px; font-weight: 700; color: rgb(247 248 250 / 55%); }
  [${ROW_ATTR}] > div:has(> .adt-team-line) { flex-wrap: wrap; }
  #${NOTE_ID} { margin: 4px 0 12px; font-size: 12px; font-weight: 600; color: #a1a1a1; }
  /* With Add Team there are three buttons: on a narrow screen they wrap rather than clip their labels. */
  div:has(> #${BUTTON_ID}) { flex-wrap: wrap; }
  div:has(> #${BUTTON_ID}) > button { min-width: max-content; }
  /* Online Teams' chip and Invite a team join the Players card's header: on a narrow screen it wraps rather than push the site's Shuffle off the card. */
  div:has(> ${STATUS_TAG}), div:has(> #${INVITE_ID}) { flex-wrap: wrap; row-gap: 8px; }
  /* Invite a team is a copy of Shuffle, auto margin and all: the two split the room between them unless one gives it up. */
  #${INVITE_ID} + button { margin-left: 0; }
  /* The partner rule's card goes under Autoscoring, the page's other switch, in the right-hand column. */
  @media (width >= 48rem) {
    div:has(> #${PARTNER_CARD_ID}[data-adt-beside]) { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-rows: auto 1fr; align-items: start; }
    div:has(> #${PARTNER_CARD_ID}[data-adt-beside]) > :first-child { grid-row: span 2; }
  }
  #${PARTNER_CARD_ID} [data-adt-line] { display: block; font-size: 12px; font-weight: 600; line-height: 16px; color: rgb(184 188 197); }
  #${PARTNER_CARD_ID} [data-adt-line][hidden] { display: none; }
  /* With no Autoscoring card to copy: the same card in the site's measured styles. */
  #${PARTNER_CARD_ID}[data-adt-fallback] { display: flex; flex-direction: column; gap: 12px; padding: 20px; border-radius: 18px; background: rgb(27 31 41); color: #f7f8fa; }
  #${PARTNER_CARD_ID}[data-adt-fallback] > div:first-child { display: flex; gap: 16px; align-items: flex-start; }
  #${PARTNER_CARD_ID}[data-adt-fallback] > div:first-child > div { flex: 1; font-family: "Bebas Neue", var(--ad-font-display, sans-serif); font-size: 24px; line-height: 1.2; }
  #${PARTNER_CARD_ID}[data-adt-fallback] > div:last-child { display: flex; flex-direction: column; gap: 16px; }
  #${PARTNER_CARD_ID}[data-adt-fallback] [role="switch"] { position: relative; flex: none; width: 51px; height: 24px; border-radius: 999px; background: #16181c; box-shadow: inset 0 0 0 1px rgb(55 76 152 / 60%); cursor: pointer; }
  #${PARTNER_CARD_ID}[data-adt-fallback] [role="switch"][aria-checked="true"] { background: #0b55df; box-shadow: none; }
  #${PARTNER_CARD_ID}[data-adt-fallback] [role="switch"] > span { position: absolute; top: 3px; left: 3px; width: 28px; height: 18px; border-radius: 999px; background: #fff; transition: transform 150ms; }
  #${PARTNER_CARD_ID}[data-adt-fallback] [role="switch"][aria-checked="true"] > span { transform: translateX(17px); }
  /* Online Teams: the site's "play on my board" would pull another account's team onto this board. */
  [${REMOTE_ATTR}] ${anyOf(SELECTORS.lobby.playerLinkButton)} { display: none !important; }
`;

/** A seat of the lobby, as Own scores' In this lobby offers it. */
export interface SeatChoice {
  id: string;
  name: string;
  kind: "guest" | "account" | "bot";
  /** The other own-score team this seat is on. */
  team?: string;
}

/** Everything the drawer shows and does; shared with AddTeamDrawer.vue. */
export interface DrawerState {
  /** The team being edited, or null to add one. */
  editing: SavedTeam | null;
  /** The lobby's guests, except the team being edited. */
  guestNames: string[];
  /**
   * Names a suggestion must not take: the lobby's guests and the saved teams,
   * so a new team never quietly replaces a saved one. Typing one on purpose
   * still does.
   */
  reservedNames: string[];
  /** Player → the other team they're on, for the greyed-out chips and the checks. */
  playerTeams: Record<string, string>;
  /** The other teams' colours, which the picker greys out. */
  takenColours: ColorScheme[];
  /** Names offered as chips. */
  offered: string[];
  /** Saved teams not in this lobby, added in one tap (not while editing). */
  savedTeams: SavedTeam[];
  /** Whether the lobby has no seat left. */
  full: boolean;
  /** The lobby's format once it has a team; the tabs keep to it. */
  lockedFormat: TeamFormat | undefined;
  /** The team that set it, for the tabs' note. */
  formatTeam: string;
  /** A lobby playing sets can't have own-score teams. */
  setsLobby: boolean;
  /** The lobby's "First to N legs", for the drawer's own-scores line. */
  legs: number;
  /** Every seat, for Own scores' In this lobby. */
  seats: SeatChoice[];
  /** The seats of the own-score team being edited, in order. */
  editingSeats: string[];
  /** The offered names a ✕ can delete: those no saved team has. */
  forgettable: string[];
  /** A saved team that can't join as the lobby stands → why, as a message the drawer words when it shows it. */
  savedProblems: Record<string, TeamsMessage>;
  /** Whether this lobby's game has bots. */
  botsOk: boolean;
  /** Each resolves to what went wrong, or what to know, as a message the drawer words when it shows it; or to nothing, once it has closed the drawer. */
  submit: (draft: TeamDraft) => Promise<TeamsProblem>;
  submitOwn: (draft: OwnDraft) => Promise<TeamsProblem>;
  addSaved: (team: SavedTeam) => Promise<TeamsProblem>;
  forget: (name: string) => Promise<void>;
  deleteSaved: (team: SavedTeam) => Promise<void>;
  close: () => void;
}

/** What the status chip shows; shared with TeamRoomStatus.vue. */
export interface StatusView {
  connection: Connection;
  rtt: number | undefined;
  joinedAt: number | undefined;
  room: RoomState | undefined;
  players: RoomSeat[];
  me: string | null;
  /** This account's name from its token, for the card until the room has it. */
  myName: string;
  firstSeen: Record<string, number>;
  /** This account's teams in the lobby, by name, for the chip's card. */
  myTeams: string[];
  retry: () => void;
}

/** What the invitation shows and does; shared with TeamInvite.vue. */
export interface InviteView {
  show: boolean;
  /** The other accounts' teams in the room. */
  teams: { name: string; colour: ColorScheme }[];
  host: string;
  game: { variant: string; mode: string; score: number; legs: number; sets: number };
  format: TeamFormat;
  /** This account's saved teams in the lobby's format, offered first; the others, greyed. */
  saved: SavedTeam[];
  other: SavedTeam[];
  /** Why the others can't join, each once: "format", or "sets" for own scores in a sets lobby. */
  reasons: ("format" | "sets")[];
  busy: boolean;
  problem: TeamsProblem;
  join: (team: SavedTeam) => void;
  newTeam: () => void;
  dismiss: () => void;
}

let ctxRef: any = null;
let drawerUi: any = null;
/**
 * A drawer on its way in. createShadowRootUi fetches the entrypoint's CSS
 * before it returns, and a second tap in that time used to mount a second
 * drawer that nothing held, so nothing could close it.
 */
let opening = false;
/** Closed before it had even appeared: it must not appear after all. */
let closedWhileOpening = false;
let observer: MutationObserver | null = null;
let unwatchLobby: (() => void) | null = null;
let unwatchConfig: (() => void) | null = null;
let stopLanguage: (() => void) | null = null;
/** Add Team's label, which a change of language rewrites in place. */
let addTeamLabel: Text | null = null;
let lobby: ILobbies | undefined;
let hostId: string | null = null;
/** This account's name, from its token. */
let myName = "";
let saved: SavedTeam[] = [];
let savedPlayers: string[] = [];
/** Teams' own switch, followed live: off, nothing of Teams stays in the lobby. */
let enabled = true;
/** The partner rule the next lobby starts from: the last one set. */
let partnerRuleDefault = false;
let scheduled = false;
let lineups: LineupStore = {};
let unwatchLineups: (() => void) | null = null;
/** One reorder at a time: the moves it makes come back as lobby updates. */
let reordering = false;
/** Online Teams' switch (`teams.online`), followed live. */
let online = true;
/** What the team room last said of each lobby (utils/team-room.ts). */
let roomStore: RoomStore = {};
let unwatchRoom: (() => void) | null = null;
/** This lobby's connection to the team room, while Teams and Online Teams are on. */
let roomClient: RoomClient | null = null;
let stopClientWatch: (() => void) | null = null;
/** When each other account's first seat was seen in this lobby: the chip's "isn't connected" counts from it. */
let firstSeen: Record<string, number> = {};
let firstSeenLobby = "";

/** What the status chip shows; shared with TeamRoomStatus.vue. */
const statusView = reactive<StatusView>({ connection: "idle", rtt: undefined, joinedAt: undefined, room: undefined, players: [], me: null, myName: "", firstSeen: {}, myTeams: [], retry: () => roomClient?.retry() });

/** Lobbies whose invitation was dismissed, for as long as the page is open. */
const dismissed = new Set<string>();

/** What the invitation shows; shared with TeamInvite.vue. */
const inviteView = reactive<InviteView>({
  show: false,
  teams: [],
  host: "",
  game: { variant: "X01", mode: "", score: 501, legs: 1, sets: 0 },
  format: "shared",
  saved: [],
  other: [],
  reasons: [],
  busy: false,
  problem: undefined,
  join: (team) => {
    joinWith(team).catch(e => console.error(e));
  },
  newTeam: () => {
    openDrawer(null).catch(e => console.error(e));
  },
  dismiss: () => {
    if (lobby) dismissed.add(lobby.id);
    inviteView.show = false;
  },
});

let statusUi: any = null;
let inviteUi: any = null;
/** On its way in: the first frames ask for the chip and the invitation several times before createShadowRootUi returns. */
let statusMounting = false;
let inviteMounting = false;
let inviteLabel: Text | null = null;
/** The two apps' props, kept out of the createApp calls: eslint-plugin-vue reads an object literal there as a component. */
const statusProps = { view: statusView };
const inviteProps = { view: inviteView };
/** Resolved on the next lobby update: the moves and the adds wait on it. */
const lobbyWaiters: (() => void)[] = [];

const drawer = reactive<DrawerState>({
  editing: null,
  guestNames: [],
  reservedNames: [],
  playerTeams: {},
  takenColours: [],
  offered: [],
  savedTeams: [],
  full: false,
  lockedFormat: undefined,
  formatTeam: "",
  setsLobby: false,
  legs: 0,
  seats: [],
  editingSeats: [],
  forgettable: [],
  savedProblems: {},
  botsOk: true,
  submit: submitDraft,
  submitOwn: submitOwnTeam,
  addSaved: addSavedTeam,
  forget: forgetName,
  deleteSaved: deleteSavedTeam,
  close: closeDrawer,
});

export async function teams(ctx: any) {
  console.log("Autodarts Tools: Teams - Starting (lobby)");
  ctxRef = ctx;
  hostId = await getUserIdFromToken();
  myName = (await tokenIdentity())?.name ?? "";
  readConfig(await AutodartsToolsConfig.getValue());
  lobby = currentLobby(await AutodartsToolsLobbyData.getValue());
  lineups = (await AutodartsToolsTeamLineups.getValue()) ?? {};
  roomStore = (await AutodartsToolsTeamRoom.getValue()) ?? {};
  addStyles(LOBBY_CSS, STYLE_ID);

  // Leaving one lobby for another runs this again without a teardown, so the
  // handles from the last one go first (#230).
  unwatchLobby?.();
  unwatchLobby = AutodartsToolsLobbyData.watch((value?: ILobbies) => {
    lobby = currentLobby(value);
    for (const done of lobbyWaiters.splice(0)) done();
    schedule();
  });
  unwatchLineups?.();
  unwatchLineups = AutodartsToolsTeamLineups.watch((value?: LineupStore) => {
    lineups = value ?? {};
    schedule();
  });
  unwatchRoom?.();
  unwatchRoom = AutodartsToolsTeamRoom.watch((value?: RoomStore) => {
    roomStore = value ?? {};
    schedule();
  });
  unwatchConfig?.();
  unwatchConfig = AutodartsToolsConfig.watch((config) => {
    readConfig(config);
    schedule();
  });
  observer?.disconnect();
  observer = new MutationObserver(() => schedule());
  observer.observe(document.body, { childList: true, subtree: true });
  stopLanguage?.();
  stopLanguage = onLanguageChange(relabel);
  apply();
}

export async function onRemove() {
  observer?.disconnect();
  observer = null;
  stopLanguage?.();
  stopLanguage = null;
  unwatchLobby?.();
  unwatchLobby = null;
  unwatchConfig?.();
  unwatchConfig = null;
  unwatchLineups?.();
  unwatchLineups = null;
  unwatchRoom?.();
  unwatchRoom = null;
  stopRoom();
  teardown();
  for (const done of lobbyWaiters.splice(0)) done();
  removeStyles(STYLE_ID);
  lobby = undefined;
}

function readConfig(config: any) {
  const teamsConfig = normalizeTeams(config?.teams);
  enabled = teamsConfig.enabled;
  saved = teamsConfig.saved;
  partnerRuleDefault = teamsConfig.partnerRule;
  online = teamsConfig.online;
  savedPlayers = Array.isArray(config?.recentLocalPlayers?.players) ? config.recentLocalPlayers.players : [];
}

/** The stored lobby when it is the one on screen: it can still be the one before. */
function currentLobby(value?: ILobbies): ILobbies | undefined {
  return value && value.id === lobbyIdFromUrl() ? value : undefined;
}

function isHost(): boolean {
  return Boolean(lobby && hostId && lobby.host?.id === hostId);
}

function isFull(): boolean {
  return Boolean(lobby) && (lobby!.players?.length ?? 0) >= (lobby!.maxPlayers || 6);
}

/** Once a frame at most: the observer fires on every change the site makes. */
function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    apply();
  });
}

function apply() {
  // Switched off in the settings: nothing of Teams in the lobby, until it's switched on again.
  if (!enabled) {
    teardown();
    stopRoom();
    return;
  }
  syncRoom();
  syncButton();
  const view = teamsView();
  const local = localLineup();
  if (local) pruneSeats(local);
  const lineup = view.lineup;
  if (lineup) {
    dressOwnRows(lineup, view.mine);
    keepOrder(lineup).catch(e => console.error(e));
  } else {
    dressRows(view);
  }
  noteUneven(lineup);
  syncPartnerCard(lineup);
  syncOnline(view);
}

/**
 * What Teams wrote into the lobby once, in the language now picked; the rest
 * picks it up on the pass this schedules. The drawer follows by itself.
 */
function relabel() {
  if (addTeamLabel) addTeamLabel.textContent = t("teams.lobby.addTeam");
  if (inviteLabel) inviteLabel.textContent = t("teams.online.invite.button");
  for (const edit of document.querySelectorAll<HTMLElement>(`[${EDIT_ATTR}]`)) labelPencil(edit);
  const card = document.getElementById(PARTNER_CARD_ID);
  if (card) labelPartnerCard(card);
  schedule();
}

/** Everything Teams draws in the lobby, taken out, and the drawer closed. */
function teardown() {
  closeDrawer();
  document.getElementById(BUTTON_ID)?.remove();
  document.getElementById(NOTE_ID)?.remove();
  document.getElementById(PARTNER_CARD_ID)?.remove();
  for (const row of document.querySelectorAll<HTMLElement>(`[${ROW_ATTR}]`)) undress(row);
  removeOnline();
}

/** This lobby's own-score lineup as this screen wrote it: this account's teams only. */
function localLineup(): Lineup | undefined {
  return lobby ? lineupOf(lineups, lobby.id) : undefined;
}

/** This lobby's teams as this screen shows them: its own, and what the room says of other accounts' (utils/team-room.ts). */
function teamsView(): ScreenTeams {
  return screenTeams({
    players: lobby?.players ?? [],
    saved,
    lineup: localLineup(),
    shifts: {},
    room: online ? roomOf(roomStore, lobby?.id) : undefined,
    me: hostId,
    hostId: lobby?.host?.id,
  });
}

/** This lobby's own-score teams, everyone's: what the order, the partner rule and the drawer's checks go by. */
function currentLineup(): Lineup | undefined {
  return teamsView().lineup;
}

/** The lobby's format once it has a team, anyone's: the first team sets it. */
function formatOf(view: ScreenTeams): TeamFormat | undefined {
  if (view.lineup?.teams.length) return "own";
  return view.shared.size ? "shared" : undefined;
}

/** The next lobby update, or a few seconds, whichever comes first. */
function nextLobbyUpdate(): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, LOBBY_WAIT_MS);
    lobbyWaiters.push(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function writeLineup(teams: readonly LineupTeam[]) {
  if (!lobby) return;
  // A lobby's first team takes the partner rule the last lobby left; later writes keep its own.
  lineups = withLineup(lineups, lobby.id, teams, Date.now(), lineupPartnerRule(localLineup(), partnerRuleDefault));
  await AutodartsToolsTeamLineups.setValue(lineups);
}

/** A team written into this lobby's lineup: an edited team keeps its place, a new one goes last. */
async function writeLineupTeam(team: LineupTeam) {
  const teams = [ ...(localLineup()?.teams ?? []) ];
  const index = teams.findIndex(other => other.name === team.name);
  if (index >= 0) teams.splice(index, 1, team);
  else teams.push(team);
  await writeLineup(teams);
}

/** A seat that left the lobby leaves its team. */
function pruneSeats(lineup: Lineup) {
  const ids = (lobby?.players ?? []).map(seat => seat.id).filter((id): id is string => Boolean(id));
  const pruned = pruneLineup(lineup.teams, ids);
  if (JSON.stringify(pruned) === JSON.stringify(lineup.teams)) return;
  writeLineup(pruned).catch(e => console.error(e));
}

/**
 * The seats in turn order (utils/teams.ts `interleave`). One move at a time,
 * each waiting for the lobby update it brings, from the order as it then
 * stands, so a drag or a Shuffle in between is taken as it is. Bounded, and
 * it stops at the first move the site refuses. Not while the drawer is open:
 * the drawer is about to change the teams.
 */
async function keepOrder(lineup: Lineup) {
  if (reordering || drawerUi || opening || !isHost() || !lobby) return;
  const teamOf = (id: string) => lineup.teams.find(team => team.seatIds.includes(id))?.name;
  const order = () => (lobby?.players ?? []).map(seat => seat.id ?? "");
  if (order().some(id => !id) || interleave(order(), teamOf).join() === order().join()) return;

  reordering = true;
  try {
    await oneTabAtATime(lobby.id, async () => {
      for (let moves = 0; moves < MAX_REORDER_MOVES; moves++) {
        const current = order();
        const [ move ] = seatMoves(current, interleave(current, teamOf));
        if (!move) break;
        const updated = nextLobbyUpdate();
        if (!await moveSeat(move.index, move.toIndex, "Teams")) break;
        await updated;
      }
    });
  } finally {
    reordering = false;
  }
}

/**
 * Runs the reorder in one tab only (utils/teams-lease.ts): the same lobby open
 * in two tabs would send every move twice, and the seats would swap back and
 * forth. The tab the service worker gives the lobby to moves; any other leaves
 * it, and sees the order it brings. A service worker that can't be asked
 * doesn't stop a lone tab.
 */
async function oneTabAtATime(lobbyId: string, run: () => Promise<void>) {
  const granted = await browser.runtime.sendMessage({ type: "teams:reorder-lease", lobbyId }).then(Boolean, () => true);
  if (!granted) return;
  try {
    await run();
  } finally {
    browser.runtime.sendMessage({ type: "teams:reorder-lease", lobbyId, release: true }).catch(e => console.error(e));
  }
}

// ----------------------------------------------------------- online teams

/**
 * Online Teams: the lobby's room, joined while it has something to say about
 * this lobby, and told this account's teams and, from the host, the partner
 * rule. What it says comes back through the mirror, whose watch redraws.
 */
function syncRoom() {
  if (!online || !lobby) {
    stopRoom();
    return;
  }
  if (!roomClient) {
    roomClient = new RoomClient({
      identity: tokenIdentity,
      onRoom: (state) => {
        mirrorRoom(state).catch(e => console.error(e));
      },
    });
    stopClientWatch = roomClient.subscribe(onClientState);
  }
  roomClient.start(lobby.id).catch(e => console.error(e));
  const players = lobby.players ?? [];
  const mine = myRoomTeams(players, saved, localLineup(), hostId);
  roomClient.setJoin(shouldJoin(players, mine, hostId, lobby.host?.id));
  roomClient.publishTeams(mine);
  if (isHost()) roomClient.publishRule(lineupPartnerRule(localLineup(), partnerRuleDefault));
  if (firstSeenLobby !== lobby.id) {
    firstSeen = {};
    firstSeenLobby = lobby.id;
  }
  const now = Date.now();
  for (const account of otherAccounts(players, hostId)) firstSeen[account.userId] ??= now;
}

function stopRoom() {
  stopClientWatch?.();
  stopClientWatch = null;
  roomClient?.stop();
  roomClient = null;
}

/** The connection's news, for the chip; a (re)join can change what is shown, so the lobby is redrawn too. */
function onClientState(state: RoomClientState) {
  Object.assign(statusView, { connection: state.connection, rtt: state.rtt, joinedAt: state.joinedAt, room: state.room });
  schedule();
}

/** Online Teams in the lobby's own parts: the chip, Invite a team (the host's), and the invitation. */
function syncOnline(view: ScreenTeams) {
  if (!online || !lobby || !ctxRef) {
    removeOnline();
    return;
  }
  Object.assign(statusView, { players: lobby.players ?? [], me: hostId, myName, firstSeen: { ...firstSeen }, myTeams: [ ...view.mine ] });
  syncInviteButton();
  const format: TeamFormat = view.remote.some(team => team.format === "own") ? "own" : "shared";
  const lists = inviteLists(saved, format, lobby.sets ?? 0);
  Object.assign(inviteView, {
    show: view.remote.length > 0 && view.mine.size === 0 && !dismissed.has(lobby.id),
    teams: view.remote.map(team => ({ name: team.name, colour: team.colour })),
    host: normalizeName(lobby.host?.name),
    game: { variant: lobby.variant, mode: lobby.settings?.gameMode ?? "", score: lobby.settings?.baseScore ?? 0, legs: lobby.legs ?? 1, sets: lobby.sets ?? 0 },
    format,
    saved: lists.saved,
    other: lists.other,
    reasons: lists.reasons,
  });
  if (!statusUi && !statusMounting) {
    statusMounting = true;
    mountStatus().catch(e => console.error(e)).finally(() => {
      statusMounting = false;
    });
  }
  if (!inviteUi && !inviteMounting) {
    inviteMounting = true;
    mountInvite().catch(e => console.error(e)).finally(() => {
      inviteMounting = false;
    });
  }
}

function removeOnline() {
  statusUi?.remove();
  statusUi = null;
  inviteUi?.remove();
  inviteUi = null;
  document.getElementById(INVITE_ID)?.remove();
  inviteLabel = null;
}

/** The chip, after the seat count in the Players card's header; WXT mounts it whenever the header is there. */
async function mountStatus() {
  const ui = await createShadowRootUi(ctxRef, {
    name: STATUS_TAG,
    position: "inline",
    // A selector, not an element: autoMount watches for it.
    anchor: anyOf(SELECTORS.lobby.playerCountChip),
    append: "after",
    onMount: (container: HTMLElement) => {
      const app = createApp(TeamRoomStatus, statusProps);
      app.mount(container);
      return app;
    },
    onRemove: (app: any) => app?.unmount(),
  });
  if (statusUi || !online) return;
  statusUi = ui;
  ui.autoMount();
}

/** The invitation, above the Players card. */
async function mountInvite() {
  const ui = await createShadowRootUi(ctxRef, {
    name: "autodarts-tools-team-invite",
    position: "inline",
    anchor: anyOf(SELECTORS.lobby.playersCard),
    append: "before",
    onMount: (container: HTMLElement) => {
      const app = createApp(TeamInvite, inviteProps);
      app.mount(container);
      return app;
    },
    onRemove: (app: any) => app?.unmount(),
  });
  if (inviteUi || !online) return;
  inviteUi = ui;
  ui.autoMount();
}

/**
 * Invite a team, the host's: a copy of the site's Shuffle, as Discord Webhooks
 * copies it, before it in the Players card's header. It copies the lobby's
 * own link: the site's /join/ link would seat whoever opens it as a player too.
 */
function syncInviteButton() {
  const existing = document.getElementById(INVITE_ID) as HTMLButtonElement | null;
  if (!isHost()) {
    existing?.remove();
    return;
  }
  const shuffle = qs<HTMLButtonElement>(SELECTORS.lobby.shuffleButton);
  if (!shuffle?.parentElement) return;
  let button = existing;
  if (!button) {
    button = shuffle.cloneNode(false) as HTMLButtonElement;
    for (const attr of [ "data-disabled", "aria-disabled", "data-focus-visible", "aria-describedby", "tabindex" ]) button.removeAttribute(attr);
    button.id = INVITE_ID;
    button.type = "button";
    button.innerHTML = ICON_LINK;
    inviteLabel = document.createTextNode(t("teams.online.invite.button"));
    button.append(inviteLabel);
    button.addEventListener("click", () => {
      copyInvite().catch(e => console.error(e));
    });
  }
  if (shuffle.previousElementSibling !== button) shuffle.before(button);
}

async function copyInvite() {
  if (!lobby) return;
  const copied = await navigator.clipboard.writeText(`https://play.autodarts.com/lobby/${lobby.id}`).then(() => true, () => false);
  if (inviteLabel) inviteLabel.textContent = t(copied ? "teams.online.invite.copied" : "teams.online.invite.copyFailed");
  setTimeout(() => {
    if (inviteLabel) inviteLabel.textContent = t("teams.online.invite.button");
  }, 2000);
}

/** The invitation's one tap: the saved team seated on this account's board, as the drawer's saved teams are. */
async function joinWith(team: SavedTeam) {
  inviteView.busy = true;
  inviteView.problem = undefined;
  try {
    Object.assign(drawer, drawerContext(null));
    inviteView.problem = await addSavedTeam(team);
  } finally {
    inviteView.busy = false;
  }
}

// ------------------------------------------------------------------ button

/**
 * A copy of the site's Add Bot, so it looks as the site's buttons look, now and
 * after a restyle. The copy carries no React fiber, so the click is ours. Add
 * Bot is drawn disabled in the party games; a guest team is fine there, so the
 * copy is enabled unless the lobby is full.
 */
function syncButton() {
  const existing = document.getElementById(BUTTON_ID) as HTMLButtonElement | null;
  const template = qs<HTMLButtonElement>(SELECTORS.lobby.addBotButton) ?? qs<HTMLButtonElement>(SELECTORS.lobby.addPlayerButton);
  if (!template?.parentElement) return;

  let button = existing;
  if (!button) {
    button = template.cloneNode(false) as HTMLButtonElement;
    // Base UI marks a disabled or focused button with attributes of its own,
    // which a copy of a party game's disabled Add Bot would keep.
    for (const attr of [ "data-disabled", "aria-disabled", "data-focus-visible", "aria-describedby", "tabindex" ]) button.removeAttribute(attr);
    button.id = BUTTON_ID;
    button.type = "button";
    button.innerHTML = ICON_TEAM;
    addTeamLabel = document.createTextNode(t("teams.lobby.addTeam"));
    button.append(addTeamLabel);
    button.addEventListener("click", () => {
      openDrawer(null);
    });
  }
  if (template.nextElementSibling !== button) template.after(button);
  const full = isFull();
  if (button.disabled !== full) button.disabled = full;
}

// -------------------------------------------------------------------- rows

/** The lobby's shared-score teams' rows, this account's and the others', found by name, or by seat where two seats share one. */
function dressRows(view: ScreenTeams) {
  const rows = qsa<HTMLElement>(SELECTORS.lobby.playerRows);
  const teams = sharedRowTeams(rows.map(row => qs(SELECTORS.lobby.playerNameInRow, row)?.textContent), lobby?.players ?? [], view.shared);
  rows.forEach((row, index) => {
    const team = teams[index];
    if (team) dress(row, team, view.mine.has(team.name));
    else if (row.hasAttribute(ROW_ATTR)) undress(row);
  });
}

function dress(row: HTMLElement, team: SavedTeam, mine: boolean) {
  const key = `${team.name}|${team.players.join(",")}|${team.colour.from}|${team.colour.to}`;
  // Keyed on the order row alone. The pencil needs the row's ✕ to copy, and a
  // row drawn without one was redrawn every frame waiting for it.
  if (row.getAttribute(ROW_ATTR) !== key || !row.querySelector(".adt-team-order")) {
    row.setAttribute(ROW_ATTR, key);
    row.style.setProperty("--adt-team-from", team.colour.from);
    row.style.setProperty("--adt-team-to", team.colour.to);

    row.querySelector(".adt-team-order")?.remove();
    qs<HTMLElement>(SELECTORS.lobby.playerNameColumn, row)?.append(orderRow(team.players));
  }
  // Another account's team: theirs to edit, and to keep on their board.
  row.toggleAttribute(REMOTE_ATTR, !mine);
  if (!mine) {
    row.querySelector(".adt-team-edit")?.remove();
    return;
  }
  if (!row.querySelector(".adt-team-edit")) {
    addEditButton(row, team.name, () => {
      const current = findTeam(sharedTeams(saved), normalizeName(qs(SELECTORS.lobby.playerNameInRow, row)?.textContent));
      if (current) openDrawer(current);
    });
  }
}

/** A copy of the row's own ✕, so it sits and hovers like the site's buttons, before the first of them. */
function addEditButton(row: HTMLElement, label: string, onEdit: () => void) {
  const remove = qs<HTMLButtonElement>(SELECTORS.lobby.playerRemoveButton, row);
  if (!remove) return;

  const edit = remove.cloneNode(false) as HTMLButtonElement;
  edit.classList.add("adt-team-edit");
  edit.type = "button";
  edit.disabled = false;
  edit.setAttribute(EDIT_ATTR, label);
  labelPencil(edit);
  edit.innerHTML = ICON_EDIT;
  edit.addEventListener("click", (event) => {
    event.stopPropagation();
    onEdit();
  });
  const firstButton = [ ...row.children ].find(child => child.matches("button[data-slot='button']")) ?? remove;
  firstButton.before(edit);
}

/** A pencil's tooltip and spoken name, in the language of the moment: when it is made, and again on a change. */
function labelPencil(edit: HTMLElement) {
  edit.title = t("teams.lobby.edit.title");
  edit.setAttribute("aria-label", t("teams.lobby.edit.label", { name: edit.getAttribute(EDIT_ATTR) ?? "" }));
}

/** An own-score team's rows: rows come in seat order, so row `i` is `lobby.players[i]`, which tells two bots of one level apart. */
function dressOwnRows(lineup: Lineup, mine: ReadonlySet<string>) {
  const seats = lobby?.players ?? [];
  qsa<HTMLElement>(SELECTORS.lobby.playerRows).forEach((row, index) => {
    const seatId = seats[index]?.id;
    const team = seatId ? lineup.teams.find(candidate => candidate.seatIds.includes(seatId)) : undefined;
    if (!team || !seatId) {
      if (row.hasAttribute(ROW_ATTR)) undress(row);
      return;
    }
    const place = team.seatIds.indexOf(seatId) + 1;
    // The language too: its "1 of 2" is written into the row.
    const key = `own|${team.name}|${place}|${team.seatIds.length}|${team.colour.from}|${team.colour.to}|${language.value}`;
    if (row.getAttribute(ROW_ATTR) !== key || !row.querySelector(".adt-team-line")) {
      row.setAttribute(ROW_ATTR, key);
      row.style.setProperty("--adt-team-from", team.colour.from);
      row.style.setProperty("--adt-team-to", team.colour.to);
      row.querySelector(".adt-team-order")?.remove();
      row.querySelector(".adt-team-line")?.remove();
      qs<HTMLElement>(SELECTORS.lobby.playerNameColumn, row)?.append(teamLabel(team, place));
    }
    row.toggleAttribute(REMOTE_ATTR, !mine.has(team.name));
    if (!mine.has(team.name)) row.querySelector(".adt-team-edit")?.remove();
    else if (!row.querySelector(".adt-team-edit")) addEditButton(row, team.name, () => openOwnEditor(team.name));
  });
}

/** The team a member plays for, on its own line under the name, as a shared team's order is. */
function teamLabel(team: LineupTeam, place: number): HTMLElement {
  const line = document.createElement("div");
  line.className = "adt-team-line";
  const label = document.createElement("span");
  label.className = "adt-team-label";
  const swatch = document.createElement("i");
  swatch.setAttribute("aria-hidden", "true");
  const order = memberLabel(place, team.seatIds.length);
  // The space is for screen readers: the flex gap already spaces the parts on screen.
  if (order) {
    const count = document.createElement("small");
    count.textContent = order;
    label.append(swatch, team.name, " ", count);
  } else {
    label.append(swatch, team.name);
  }
  line.append(label);
  return line;
}

/** Under the players when the teams aren't the same size: the bigger team throws more often. */
function noteUneven(lineup: Lineup | undefined) {
  const text = lineup ? unevenText(lineup.teams) : "";
  let note = document.getElementById(NOTE_ID);
  if (!text) {
    note?.remove();
    return;
  }
  const buttons = qs<HTMLElement>(SELECTORS.lobby.addPlayerButton)?.parentElement;
  if (!buttons) return;
  if (!note) {
    note = document.createElement("p");
    note.id = NOTE_ID;
  }
  if (note.textContent !== text) note.textContent = text;
  if (buttons.previousElementSibling !== note) buttons.before(note);
}

/** The pencil on a member's row: the drawer on that team's seats. */
function openOwnEditor(name: string) {
  const team = localLineup()?.teams.find(candidate => candidate.name === name);
  if (!team) return;
  const players = team.seatIds.map(id => normalizeName(lobby?.players?.find(seat => seat.id === id)?.name));
  openDrawer({ name: team.name, players, colour: { ...team.colour }, format: "own" }, [ ...team.seatIds ]);
}

function undress(row: HTMLElement) {
  row.removeAttribute(ROW_ATTR);
  row.removeAttribute(REMOTE_ATTR);
  row.style.removeProperty("--adt-team-from");
  row.style.removeProperty("--adt-team-to");
  row.querySelector(".adt-team-order")?.remove();
  row.querySelector(".adt-team-line")?.remove();
  row.querySelector(".adt-team-edit")?.remove();
}

function orderRow(players: readonly string[]): HTMLElement {
  const order = document.createElement("div");
  order.className = "adt-team-order";
  players.forEach((player, index) => {
    if (index) {
      const arrow = document.createElement("span");
      arrow.className = "adt-team-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "▸";
      order.append(arrow);
    }
    const chip = document.createElement("span");
    chip.className = "adt-team-chip";
    chip.textContent = player;
    order.append(chip);
  });
  return order;
}

// ------------------------------------------------------------ partner rule

/**
 * The partner rule, as a switch card beside the site's Autoscoring on the
 * lobby page, where the game is set up. Each lobby keeps its own, and the next
 * one starts from the last set (utils/teams.ts `partnerCardState`).
 */
function syncPartnerCard(lineup: Lineup | undefined) {
  const existing = document.getElementById(PARTNER_CARD_ID);
  const state = lobby && isHost() ? partnerCardState(lobby, lineup, saved, hostId, partnerRuleDefault) : undefined;
  if (!state?.show) {
    existing?.remove();
    return;
  }
  // After the last switch card, in its row, or failing that, under the game's
  // own card, in its column; only the first makes the row two columns.
  // Indexed, not .at(-1): Safari has Array.prototype.at from 15.4, and the app supports iOS 15.0.
  const switchCards = qsa<HTMLElement>(SELECTORS.lobby.switchCard);
  const switchCard = switchCards[switchCards.length - 1];
  const anchor = switchCard ?? qs<HTMLElement>(SELECTORS.lobby.gameCard);
  if (!anchor) return;
  const card = existing ?? buildPartnerCard(switchCard ?? null);
  card.toggleAttribute("data-adt-beside", Boolean(switchCard));
  if (anchor.nextElementSibling !== card) anchor.after(card);
  renderPartnerCard(card, state);
}

/** A shallow copy of one of the site's elements, so it keeps the site's styling; or a plain one when there's nothing to copy. */
function copyOf<K extends keyof HTMLElementTagNameMap>(source: Element | null | undefined, tag: K): HTMLElementTagNameMap[K] {
  const copy = (source ? source.cloneNode(false) : document.createElement(tag)) as HTMLElementTagNameMap[K];
  copy.removeAttribute("id");
  return copy;
}

/**
 * The card, as a copy of the site's Autoscoring card: its card, header, title
 * and line, and its switch, which Base UI drives there and this drives here.
 * With no card to copy, the same thing in the site's measured styles (LOBBY_CSS).
 */
function buildPartnerCard(template: HTMLElement | null): HTMLElement {
  const header = template?.querySelector(":scope > [data-slot='card-header']");
  const siteSwitch = header?.querySelector("[data-slot='switch']");
  const content = template?.querySelector(":scope > [data-slot='card-content']");

  const card = copyOf(template, "div");
  card.id = PARTNER_CARD_ID;
  if (!template) card.dataset.adtFallback = "";
  const head = copyOf(header, "div");
  const title = copyOf(header?.querySelector("[data-slot='card-title']"), "div");
  title.setAttribute("data-adt-partner-title", "");
  const toggle = copyOf(siteSwitch, "span");
  toggle.append(copyOf(siteSwitch?.querySelector("[data-slot='switch-thumb']"), "span"));
  toggle.setAttribute("role", "switch");
  toggle.tabIndex = 0;
  toggle.addEventListener("click", () => {
    setPartnerRule(toggle.getAttribute("aria-checked") !== "true").catch(e => console.error(e));
  });
  toggle.addEventListener("keydown", (event) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    toggle.click();
  });
  head.append(title, toggle);
  const body = copyOf(content, "div");
  // The lines are our own, in the style of the site's card line ("You'll score
  // this match yourself", LOBBY_CSS). Copying Autoscoring's first line took the
  // board picker's text style whenever autoscoring was on.
  const text = document.createElement("span");
  text.dataset.adtLine = "text";
  const pending = document.createElement("span");
  pending.dataset.adtLine = "pending";
  body.append(text, pending);
  card.append(head, body);
  labelPartnerCard(card);
  return card;
}

/** The card's title, its switch's spoken name and its two lines, in the language of the moment: when it is built, and again on a change. */
function labelPartnerCard(card: HTMLElement) {
  const title = card.querySelector<HTMLElement>("[data-adt-partner-title]");
  if (title) title.textContent = t("teams.lobby.partnerRule.title");
  card.querySelector("[role='switch']")?.setAttribute("aria-label", t("teams.lobby.partnerRule.title"));
  const text = card.querySelector<HTMLElement>("[data-adt-line='text']");
  if (text) text.textContent = t("teams.lobby.partnerRule.text");
  const pending = card.querySelector<HTMLElement>("[data-adt-line='pending']");
  if (pending) pending.textContent = t("teams.lobby.partnerRule.pending");
}

/** The switch as the site draws its own: its data attributes pick the colours, and the thumb follows. */
function renderPartnerCard(card: HTMLElement, state: PartnerCard) {
  const toggle = card.querySelector<HTMLElement>("[role='switch']");
  if (!toggle) return;
  for (const part of [ toggle, toggle.firstElementChild ]) {
    part?.toggleAttribute("data-checked", state.on);
    part?.toggleAttribute("data-unchecked", !state.on);
  }
  if (toggle.getAttribute("aria-checked") !== String(state.on)) toggle.setAttribute("aria-checked", String(state.on));
  const pending = card.querySelector<HTMLElement>("[data-adt-line='pending']");
  if (pending) pending.hidden = !state.on || state.applies;
}

/** The card's switch: this lobby's rule, and the one the next lobby starts from. */
async function setPartnerRule(on: boolean) {
  partnerRuleDefault = on;
  if (lobby && localLineup()) lineups = withPartnerRule(lineups, lobby.id, on, Date.now());
  syncPartnerCard(currentLineup());
  if (lobby && localLineup()) await AutodartsToolsTeamLineups.setValue(lineups);
  const config = await AutodartsToolsConfig.getValue();
  await AutodartsToolsConfig.setValue({ ...config, teams: { ...normalizeTeams(config.teams), partnerRule: on } });
  roomClient?.publishRule(on);
}

// ------------------------------------------------------------------ drawer

function siteGuests(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(GUEST_KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((name: unknown): name is string => typeof name === "string") : [];
  } catch {
    return [];
  }
}

function drawerContext(editing: SavedTeam | null, editingSeats: string[] = []): Omit<DrawerState, "submit" | "addSaved" | "close" | "submitOwn" | "forget" | "deleteSaved"> {
  const view = teamsView();
  const lobbyTeams = [ ...view.shared.values() ].filter(team => team.name !== editing?.name);
  const guests = uniqueNames((lobby?.players ?? []).filter(seat => !seat.userId && !seat.cpuPPR).map(seat => seat.name));
  const playerTeams: Record<string, string> = {};
  for (const team of lobbyTeams) for (const player of team.players) playerTeams[player] = team.name;
  const lineup = view.lineup;
  const format = formatOf(view);
  const ownTeams = (lineup?.teams ?? []).filter(team => team.name !== editing?.name);
  const seatTeam = new Map<string, string>();
  for (const team of ownTeams) for (const id of team.seatIds) seatTeam.set(id, team.name);
  const inLobby = (team: SavedTeam) => team.format === "own" ? Boolean(lineup?.teams.some(other => other.name === team.name)) : guests.includes(team.name);
  const seatNameTeams: Record<string, string> = {};
  for (const team of ownTeams) {
    for (const id of team.seatIds) {
      const seat = lobby?.players?.find(candidate => candidate.id === id);
      if (seat) seatNameTeams[normalizeName(seat.name)] = team.name;
    }
  }
  const offered = uniqueNames([ ...savedPlayers, ...siteGuests(), ...saved.flatMap(team => team.players) ]);
  // A lobby with sets offers no own-score team (utils/teams.ts `rejoinProblem`).
  const savedTeams = editing ? [] : saved.filter(team => (!format || team.format === format) && !(lobby?.sets && team.format === "own") && !inLobby(team));
  const savedProblems: Record<string, TeamsMessage> = {};
  for (const team of savedTeams) {
    const problem = savedTeamProblem(team, { playerTeams, seatTeams: seatNameTeams });
    if (problem) savedProblems[team.name] = problem;
  }
  // Online Teams: a seat of an account whose own Tools is in the room is theirs to put on a team.
  const room = online ? roomOf(roomStore, lobby?.id) : undefined;
  const inRoom = new Set([ ...(room?.peers ?? []).map(peer => peer.userId), ...(room?.teams ?? []).map(team => team.owner) ]);
  const theirs = (seat: SeatLike) => {
    const owner = seatOwner(seat);
    return Boolean(owner) && owner !== hostId && inRoom.has(owner!);
  };
  return {
    editing,
    guestNames: guests.filter(name => name !== editing?.name),
    reservedNames: uniqueNames([ ...guests, ...saved.map(team => team.name) ]),
    playerTeams,
    takenColours: format === "own" ? ownTeams.map(team => team.colour) : lobbyTeams.map(team => team.colour),
    offered,
    forgettable: forgettableNames(offered, saved),
    savedTeams,
    savedProblems,
    full: isFull(),
    lockedFormat: editing ? editing.format : format,
    formatTeam: format === "own" ? (lineup?.teams[0]?.name ?? "") : ([ ...view.shared.values() ][0]?.name ?? ""),
    setsLobby: Boolean(lobby?.sets),
    legs: lobby?.legs ?? 0,
    seats: (lobby?.players ?? []).filter(seat => seat.id && !theirs(seat)).map(seat => ({ id: seat.id!, name: normalizeName(seat.name), kind: memberOf(seat).kind, team: seatTeam.get(seat.id!) })),
    editingSeats,
    botsOk: hasBots(lobby?.variant),
  };
}

async function openDrawer(editing: SavedTeam | null, editingSeats: string[] = []) {
  if (!ctxRef) return;
  Object.assign(drawer, drawerContext(editing, editingSeats));
  if (drawerUi || opening) return;

  opening = true;
  closedWhileOpening = false;
  try {
    const ui = await createShadowRootUi(ctxRef, {
      name: "autodarts-tools-teams-drawer",
      position: "inline",
      // On body, appended last, and pinned from inside: see match.content's
      // overlays for why the host itself cannot be positioned.
      anchor: "body",
      append: "last",
      onMount: (container: HTMLElement) => {
        const app = createApp(AddTeamDrawer, { state: drawer });
        app.mount(container);
        return app;
      },
      onRemove: (app: any) => app?.unmount(),
    });
    if (closedWhileOpening) {
      ui.remove();
      return;
    }
    drawerUi = ui;
    ui.mount();
  } finally {
    opening = false;
  }
}

function closeDrawer() {
  if (opening) closedWhileOpening = true;
  drawerUi?.remove();
  drawerUi = null;
}

/** A name out of the drawer's offer: out of Saved players and the site's own recent guests, as the Saved players panel deletes one, so no sync brings it back. */
async function forgetName(name: string) {
  const config = await AutodartsToolsConfig.getValue();
  const players = (config.recentLocalPlayers?.players ?? []).filter(player => normalizeName(player) !== name);
  await AutodartsToolsConfig.setValue({ ...config, recentLocalPlayers: { ...config.recentLocalPlayers, players } });
  forgetGuestPlayers([ name ]);
  savedPlayers = players;
  refreshDrawer();
}

/** A saved team deleted from the drawer, as from Teams' settings panel. */
async function deleteSavedTeam(team: SavedTeam) {
  const config = await AutodartsToolsConfig.getValue();
  const current = normalizeTeams(config.teams);
  const remaining = current.saved.filter(other => other.name !== team.name);
  await AutodartsToolsConfig.setValue({ ...config, teams: { ...current, saved: remaining } });
  saved = remaining;
  refreshDrawer();
}

/** The open drawer, redrawn from the lobby as it now stands. */
function refreshDrawer() {
  if (drawerUi || opening) Object.assign(drawer, drawerContext(drawer.editing, drawer.editingSeats));
}

async function saveTeam(team: SavedTeam) {
  const config = await AutodartsToolsConfig.getValue();
  const current = normalizeTeams(config.teams);
  await AutodartsToolsConfig.setValue({ ...config, teams: { ...current, saved: rememberTeam(current.saved, team) } });
}

async function submitDraft(draft: TeamDraft): Promise<TeamsProblem> {
  const editing = drawer.editing;
  if (!editing && drawer.full) return { key: "teams.problems.lobbyFull" };
  const problem = checkTeam(editing ? { ...draft, name: editing.name } : draft, {
    guestNames: drawer.guestNames,
    otherTeamPlayers: Object.keys(drawer.playerTeams),
  });
  if (problem) return problem;
  // The picker greys out the presets other teams have; a custom pair can only be caught here.
  if (colourTaken(draft.colour, drawer.takenColours)) return { key: "teams.problems.colourTaken" };

  const team: SavedTeam = { name: editing?.name ?? normalizeName(draft.name), players: uniqueNames(draft.players), colour: { ...draft.colour }, format: "shared" };
  await saveTeam(team);
  if (!editing && !await addGuest(team.name, "Teams")) {
    return { key: "teams.problems.savedNotAdded" };
  }
  closeDrawer();
  return undefined;
}

async function addSavedTeam(savedTeam: SavedTeam): Promise<TeamsProblem> {
  if (savedTeam.format === "own") return addSavedOwnTeam(savedTeam);
  if (drawer.full) return { key: "teams.problems.lobbyFull" };
  // Another team here may have its colour by now, say a new team offered the
  // same red; then it plays in the next free one, and keeps that.
  const team = withFreeColour(savedTeam, drawer.takenColours);
  const problem = checkTeam(team, { guestNames: drawer.guestNames, otherTeamPlayers: Object.keys(drawer.playerTeams) });
  if (problem) return problem;
  await saveTeam(team);
  if (!await addGuest(team.name, "Teams")) return { key: "teams.problems.teamNotAdded" };
  closeDrawer();
  return undefined;
}

// --------------------------------------------------------------- own scores

/** How long an add waits for the lobby update that seats the new players. */
const SEAT_WAIT_MS = 5000;

/** Seats the new slots (guests and bots) and waits for the lobby update that holds them. */
async function seatSlots(slots: readonly SeatSlot[]): Promise<(string | undefined)[]> {
  const known = new Set((lobby?.players ?? []).map(seat => seat.id).filter((id): id is string => Boolean(id)));
  for (const slot of slots) {
    const ok = slot.kind === "guest" ? await addGuest(slot.name, "Teams") : slot.kind === "bot" ? await addBot(slot.name, slot.ppr, "Teams") : true;
    if (!ok) break;
  }
  const deadline = Date.now() + SEAT_WAIT_MS;
  let ids = resolveSlots(slots, known, lobby?.players ?? []);
  while (ids.some((id, index) => !id && slots[index].kind !== "missing") && Date.now() < deadline) {
    await nextLobbyUpdate();
    ids = resolveSlots(slots, known, lobby?.players ?? []);
  }
  return ids;
}

/** The team as it is saved: its players, and how each of them joined. */
function ownSavedTeam(name: string, colour: ColorScheme, seatIds: readonly string[]): SavedTeam {
  const members = seatIds.map(id => memberOf(lobby?.players?.find(seat => seat.id === id) ?? {}));
  return { name, players: members.map(member => member.name), colour: { ...colour }, format: "own", members };
}

async function submitOwnTeam(draft: OwnDraft): Promise<TeamsProblem> {
  if (!lobby) return { key: "teams.problems.notLoaded" };
  const editing = drawer.editing;
  const others = (currentLineup()?.teams ?? []).filter(team => team.name !== editing?.name);
  const problem = checkOwnTeam(editing ? { ...draft, name: editing.name } : draft, {
    seatNames: (lobby.players ?? []).map(seat => seat.name ?? ""),
    takenSeats: new Set(others.flatMap(team => team.seatIds)),
    teamNames: others.map(team => team.name),
    freeSeats: Math.max(0, (lobby.maxPlayers || 6) - (lobby.players?.length ?? 0)),
  });
  if (problem) return problem;
  if (colourTaken(draft.colour, others.map(team => team.colour))) return { key: "teams.problems.colourTaken" };

  const slots = pickSlots(draft.picks);
  const ids = await seatSlots(slots);
  if (ids.some(id => !id)) return { key: "teams.problems.playersNotAdded" };
  const name = editing?.name ?? normalizeName(draft.name);
  const seatIds = ids as string[];
  await writeLineupTeam({ name, colour: { ...draft.colour }, seatIds });
  await saveTeam(ownSavedTeam(name, draft.colour, seatIds));
  closeDrawer();
  return undefined;
}

async function addSavedOwnTeam(savedTeam: SavedTeam): Promise<TeamsProblem> {
  if (!lobby) return { key: "teams.problems.notLoaded" };
  const others = currentLineup()?.teams ?? [];
  const team = withFreeColour(savedTeam, others.map(other => other.colour));
  const slots = rejoinSlots(team, lobby.players ?? [], hostId, new Set(others.flatMap(other => other.seatIds)));
  const problem = rejoinProblem(team, slots, lobby);
  if (problem) return problem;
  const adding = slots.filter(slot => slot.kind === "guest" || slot.kind === "bot").length;
  const free = Math.max(0, (lobby.maxPlayers || 6) - (lobby.players?.length ?? 0));
  if (adding > free) return { key: "teams.problems.roomFor", params: { count: free } };

  const ids = await seatSlots(slots);
  // Half a team is not written: whoever did join stays as a plain seat, and
  // is picked up again when the team is added once more.
  const left = unseated(slots, ids);
  if (left.length) return { key: "teams.problems.namesNotAdded", lists: { names: left } };
  const seatIds = ids.filter((id): id is string => Boolean(id));
  if (seatIds.length < 1) return { key: "teams.problems.teamNotAdded" };
  await writeLineupTeam({ name: team.name, colour: team.colour, seatIds });
  await saveTeam({ ...team, members: team.members });
  const missing = slots.filter(slot => slot.kind === "missing").map(slot => slot.name);
  if (missing.length) return { key: "teams.problems.notInLobby", params: { count: missing.length }, lists: { names: missing } };
  closeDrawer();
  return undefined;
}
