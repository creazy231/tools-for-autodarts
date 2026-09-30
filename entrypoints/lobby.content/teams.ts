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
 * Only in a lobby the user hosts: nobody else can add players there.
 */

import { createApp, reactive } from "vue";

import AddTeamDrawer from "./AddTeamDrawer.vue";

import type { ILobbies } from "@/utils/websocket-helpers";
import type { ColorScheme } from "@/utils/storage";
import type { Lineup, LineupStore, LineupTeam, OwnDraft, SavedTeam, SeatSlot, TeamDraft, TeamFormat } from "@/utils/teams";

import { addStyles, removeStyles } from "@/utils";
import { SELECTORS, anyOf, qs, qsa } from "@/utils/selectors";
import { AutodartsToolsConfig, AutodartsToolsTeamLineups } from "@/utils/storage";
import { AutodartsToolsLobbyData } from "@/utils/lobby-data-storage";
import { getUserIdFromToken } from "@/utils/helpers";
import { GUEST_KEY } from "@/utils/guest-players";
import { addBot, addGuest, lobbyIdFromUrl, moveSeat } from "@/utils/lobby-guests";
import { checkOwnTeam, checkTeam, colourTaken, findTeam, interleave, isHostedGuest, joinNames, lineupOf, lobbyFormat, memberOf, normalizeName, normalizeTeams, pickSlots, pruneLineup, rejoinProblem, rejoinSlots, rememberTeam, resolveSlots, seatMoves, sharedTeams, unevenText, uniqueNames, unseated, withFreeColour, withLineup } from "@/utils/teams";

const BUTTON_ID = "adt-add-team";
const NOTE_ID = "adt-team-note";
/** A reorder settles within this many moves: one fewer than the seats. */
const MAX_REORDER_MOVES = 6;
/** How long a move or an add waits for the lobby update it brings. */
const LOBBY_WAIT_MS = 3000;
const STYLE_ID = "teams-lobby";
/** On a row we have dressed: the team, its players and colour, so a change redresses it. */
const ROW_ATTR = "data-adt-team";

/** Material Symbols "group" (Apache 2.0), sized by the site's `[&_svg:not([class*='size-'])]:size-4`. */
const ICON_TEAM = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M1 17.2q0-.85.438-1.562T2.6 14.55q1.55-.775 3.15-1.162T9 13t3.25.388t3.15 1.162q.725.375 1.163 1.088T17 17.2v.8q0 .825-.587 1.413T15 20H3q-.825 0-1.412-.587T1 18zM18.45 20q.275-.45.413-.962T19 18v-1q0-1.1-.612-2.113T16.65 13.15q1.275.15 2.4.513t2.1.887q.9.5 1.375 1.112T23 17v1q0 .825-.587 1.413T21 20zM6.175 10.825Q5 9.65 5 8t1.175-2.825T9 4t2.825 1.175T13 8t-1.175 2.825T9 12t-2.825-1.175m11.65 0Q16.65 12 15 12q-.275 0-.7-.062t-.7-.138q.675-.8 1.038-1.775T15 8t-.362-2.025T13.6 4.2q.35-.125.7-.163T15 4q1.65 0 2.825 1.175T19 8t-1.175 2.825\"/></svg>";
/** Material Symbols "edit" (Apache 2.0). */
const ICON_EDIT = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M4 21q-.425 0-.712-.288T3 20v-2.425q0-.4.15-.763t.425-.637L16.2 3.575q.3-.275.663-.425t.762-.15t.775.15t.65.45L20.425 5q.3.275.437.65T21 6.4q0 .4-.138.763t-.437.662l-12.6 12.6q-.275.275-.638.425t-.762.15zM17.6 7.8L19 6.4L17.6 5l-1.4 1.4z\"/></svg>";

/** The site's name tag, as utils/selectors.ts names it. */
const NAME_TAG_BODY = anyOf(SELECTORS.nameTag.body);
const NAME_TAG_SHAPE = anyOf(SELECTORS.nameTag.shape);

const LOBBY_CSS = `
  [${ROW_ATTR}] ${NAME_TAG_BODY} {
    background-image: linear-gradient(to right, var(--adt-team-from), var(--adt-team-to)) !important;
  }
  [${ROW_ATTR}] ${NAME_TAG_BODY} > span.font-display { color: #f7f8fa !important; }
  [${ROW_ATTR}] ${NAME_TAG_SHAPE} { color: var(--adt-team-to) !important; }
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
  submit: (draft: TeamDraft) => Promise<string | undefined>;
  submitOwn: (draft: OwnDraft) => Promise<string | undefined>;
  addSaved: (team: SavedTeam) => Promise<string | undefined>;
  close: () => void;
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
let lobby: ILobbies | undefined;
let hostId: string | null = null;
let saved: SavedTeam[] = [];
let savedPlayers: string[] = [];
let scheduled = false;
let lineups: LineupStore = {};
let unwatchLineups: (() => void) | null = null;
/** One reorder at a time: the moves it makes come back as lobby updates. */
let reordering = false;
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
  submit: submitDraft,
  submitOwn: submitOwnTeam,
  addSaved: addSavedTeam,
  close: closeDrawer,
});

export async function teams(ctx: any) {
  console.log("Autodarts Tools: Teams - Starting (lobby)");
  ctxRef = ctx;
  hostId = await getUserIdFromToken();
  readConfig(await AutodartsToolsConfig.getValue());
  lobby = currentLobby(await AutodartsToolsLobbyData.getValue());
  lineups = (await AutodartsToolsTeamLineups.getValue()) ?? {};
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
  unwatchConfig?.();
  unwatchConfig = AutodartsToolsConfig.watch((config) => {
    readConfig(config);
    schedule();
  });
  observer?.disconnect();
  observer = new MutationObserver(() => schedule());
  observer.observe(document.body, { childList: true, subtree: true });
  apply();
}

export async function onRemove() {
  observer?.disconnect();
  observer = null;
  unwatchLobby?.();
  unwatchLobby = null;
  unwatchConfig?.();
  unwatchConfig = null;
  unwatchLineups?.();
  unwatchLineups = null;
  closeDrawer();
  document.getElementById(BUTTON_ID)?.remove();
  document.getElementById(NOTE_ID)?.remove();
  for (const done of lobbyWaiters.splice(0)) done();
  for (const row of document.querySelectorAll<HTMLElement>(`[${ROW_ATTR}]`)) undress(row);
  removeStyles(STYLE_ID);
  lobby = undefined;
}

function readConfig(config: any) {
  saved = normalizeTeams(config?.teams).saved;
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
  syncButton();
  const lineup = currentLineup();
  if (lineup) {
    pruneSeats(lineup);
    dressOwnRows(lineup);
    keepOrder(lineup).catch(e => console.error(e));
  } else {
    dressRows();
  }
  noteUneven(lineup);
}

/** This lobby's own-score lineup, if it has one. */
function currentLineup(): Lineup | undefined {
  return lobby ? lineupOf(lineups, lobby.id) : undefined;
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
  lineups = withLineup(lineups, lobby.id, teams, Date.now());
  await AutodartsToolsTeamLineups.setValue(lineups);
}

/** A team written into this lobby's lineup: an edited team keeps its place, a new one goes last. */
async function writeLineupTeam(team: LineupTeam) {
  const teams = [ ...(currentLineup()?.teams ?? []) ];
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

// ------------------------------------------------------------------ button

/**
 * A copy of the site's Add Bot, so it looks as the site's buttons look, now and
 * after a restyle. The copy carries no React fiber, so the click is ours. Add
 * Bot is drawn disabled in the party games; a guest team is fine there, so the
 * copy is enabled unless the lobby is full.
 */
function syncButton() {
  const existing = document.getElementById(BUTTON_ID) as HTMLButtonElement | null;
  if (!isHost()) {
    existing?.remove();
    return;
  }

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
    button.append("Add Team");
    button.addEventListener("click", () => {
      openDrawer(null);
    });
  }
  if (template.nextElementSibling !== button) template.after(button);
  const full = isFull();
  if (button.disabled !== full) button.disabled = full;
}

// -------------------------------------------------------------------- rows

/** The lobby's seats that are teams: guests of this host under a saved team's name. */
function teamsInLobby(): Map<string, SavedTeam> {
  const out = new Map<string, SavedTeam>();
  for (const seat of lobby?.players ?? []) {
    if (!isHostedGuest(seat, hostId)) continue;
    const team = findTeam(sharedTeams(saved), seat.name);
    if (team) out.set(team.name, team);
  }
  return out;
}

function dressRows() {
  const lobbyTeams = teamsInLobby();
  for (const row of qsa<HTMLElement>(SELECTORS.lobby.playerRows)) {
    const team = lobbyTeams.get(normalizeName(qs(SELECTORS.lobby.playerNameInRow, row)?.textContent));
    if (team) dress(row, team);
    else if (row.hasAttribute(ROW_ATTR)) undress(row);
  }
}

function dress(row: HTMLElement, team: SavedTeam) {
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
  edit.title = "Edit team";
  edit.setAttribute("aria-label", `Edit ${label}`);
  edit.innerHTML = ICON_EDIT;
  edit.addEventListener("click", (event) => {
    event.stopPropagation();
    onEdit();
  });
  const firstButton = [ ...row.children ].find(child => child.matches("button[data-slot='button']")) ?? remove;
  firstButton.before(edit);
}

/** An own-score team's rows: rows come in seat order, so row `i` is `lobby.players[i]`, which tells two bots of one level apart. */
function dressOwnRows(lineup: Lineup) {
  const seats = lobby?.players ?? [];
  qsa<HTMLElement>(SELECTORS.lobby.playerRows).forEach((row, index) => {
    const seatId = seats[index]?.id;
    const team = seatId ? lineup.teams.find(candidate => candidate.seatIds.includes(seatId)) : undefined;
    if (!team || !seatId) {
      if (row.hasAttribute(ROW_ATTR)) undress(row);
      return;
    }
    const place = team.seatIds.indexOf(seatId) + 1;
    const key = `own|${team.name}|${place}|${team.seatIds.length}|${team.colour.from}|${team.colour.to}`;
    if (row.getAttribute(ROW_ATTR) !== key || !row.querySelector(".adt-team-line")) {
      row.setAttribute(ROW_ATTR, key);
      row.style.setProperty("--adt-team-from", team.colour.from);
      row.style.setProperty("--adt-team-to", team.colour.to);
      row.querySelector(".adt-team-order")?.remove();
      row.querySelector(".adt-team-line")?.remove();
      qs<HTMLElement>(SELECTORS.lobby.playerNameColumn, row)?.append(teamLabel(team, place));
    }
    if (!row.querySelector(".adt-team-edit")) addEditButton(row, team.name, () => openOwnEditor(team.name));
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
  const count = document.createElement("small");
  count.textContent = `${place} of ${team.seatIds.length}`;
  // The space is for screen readers: the flex gap already spaces the parts on screen.
  label.append(swatch, team.name, " ", count);
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
  const team = currentLineup()?.teams.find(candidate => candidate.name === name);
  if (!team) return;
  const players = team.seatIds.map(id => normalizeName(lobby?.players?.find(seat => seat.id === id)?.name));
  openDrawer({ name: team.name, players, colour: { ...team.colour }, format: "own" }, [ ...team.seatIds ]);
}

function undress(row: HTMLElement) {
  row.removeAttribute(ROW_ATTR);
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

// ------------------------------------------------------------------ drawer

function siteGuests(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(GUEST_KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((name: unknown): name is string => typeof name === "string") : [];
  } catch {
    return [];
  }
}

function drawerContext(editing: SavedTeam | null, editingSeats: string[] = []): Omit<DrawerState, "submit" | "addSaved" | "close" | "submitOwn"> {
  const lobbyTeams = [ ...teamsInLobby().values() ].filter(team => team.name !== editing?.name);
  const guests = uniqueNames((lobby?.players ?? []).filter(seat => !seat.userId && !seat.cpuPPR).map(seat => seat.name));
  const playerTeams: Record<string, string> = {};
  for (const team of lobbyTeams) for (const player of team.players) playerTeams[player] = team.name;
  const lineup = currentLineup();
  const format = lobbyFormat(lobby?.players ?? [], lineup, saved, hostId);
  const ownTeams = (lineup?.teams ?? []).filter(team => team.name !== editing?.name);
  const seatTeam = new Map<string, string>();
  for (const team of ownTeams) for (const id of team.seatIds) seatTeam.set(id, team.name);
  const inLobby = (team: SavedTeam) => team.format === "own" ? Boolean(lineup?.teams.some(other => other.name === team.name)) : guests.includes(team.name);
  return {
    editing,
    guestNames: guests.filter(name => name !== editing?.name),
    reservedNames: uniqueNames([ ...guests, ...saved.map(team => team.name) ]),
    playerTeams,
    takenColours: format === "own" ? ownTeams.map(team => team.colour) : lobbyTeams.map(team => team.colour),
    offered: uniqueNames([ ...savedPlayers, ...siteGuests(), ...saved.flatMap(team => team.players) ]),
    // A lobby with sets offers no own-score team (utils/teams.ts `rejoinProblem`).
    savedTeams: editing ? [] : saved.filter(team => (!format || team.format === format) && !(lobby?.sets && team.format === "own") && !inLobby(team)),
    full: isFull(),
    lockedFormat: editing ? editing.format : format,
    formatTeam: format === "own" ? (lineup?.teams[0]?.name ?? "") : ([ ...teamsInLobby().keys() ][0] ?? ""),
    setsLobby: Boolean(lobby?.sets),
    legs: lobby?.legs ?? 0,
    seats: (lobby?.players ?? []).filter(seat => seat.id).map(seat => ({ id: seat.id!, name: normalizeName(seat.name), kind: memberOf(seat).kind, team: seatTeam.get(seat.id!) })),
    editingSeats,
  };
}

async function openDrawer(editing: SavedTeam | null, editingSeats: string[] = []) {
  if (!isHost() || !ctxRef) return;
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

async function saveTeam(team: SavedTeam) {
  const config = await AutodartsToolsConfig.getValue();
  const current = normalizeTeams(config.teams);
  await AutodartsToolsConfig.setValue({ ...config, teams: { ...current, saved: rememberTeam(current.saved, team) } });
}

async function submitDraft(draft: TeamDraft): Promise<string | undefined> {
  const editing = drawer.editing;
  if (!editing && drawer.full) return "The lobby is full.";
  const problem = checkTeam(editing ? { ...draft, name: editing.name } : draft, {
    guestNames: drawer.guestNames,
    otherTeamPlayers: Object.keys(drawer.playerTeams),
  });
  if (problem) return problem;
  // The picker greys out the presets other teams have; a custom pair can only be caught here.
  if (colourTaken(draft.colour, drawer.takenColours)) return "Another team in this lobby already has that colour.";

  const team: SavedTeam = { name: editing?.name ?? normalizeName(draft.name), players: uniqueNames(draft.players), colour: { ...draft.colour }, format: "shared" };
  await saveTeam(team);
  if (!editing && !await addGuest(team.name, "Teams")) {
    return "The team is saved, but autodarts didn't add it to the lobby. Add it again from Saved teams.";
  }
  closeDrawer();
  return undefined;
}

async function addSavedTeam(savedTeam: SavedTeam): Promise<string | undefined> {
  if (savedTeam.format === "own") return addSavedOwnTeam(savedTeam);
  if (drawer.full) return "The lobby is full.";
  // Another team here may have its colour by now, say a new team offered the
  // same red; then it plays in the next free one, and keeps that.
  const team = withFreeColour(savedTeam, drawer.takenColours);
  const problem = checkTeam(team, { guestNames: drawer.guestNames, otherTeamPlayers: Object.keys(drawer.playerTeams) });
  if (problem) return problem;
  await saveTeam(team);
  if (!await addGuest(team.name, "Teams")) return "autodarts didn't add the team. Try again.";
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

async function submitOwnTeam(draft: OwnDraft): Promise<string | undefined> {
  if (!lobby) return "The lobby isn't loaded yet. Try again in a moment.";
  const editing = drawer.editing;
  const others = (currentLineup()?.teams ?? []).filter(team => team.name !== editing?.name);
  const problem = checkOwnTeam(editing ? { ...draft, name: editing.name } : draft, {
    seatNames: (lobby.players ?? []).map(seat => seat.name ?? ""),
    takenSeats: new Set(others.flatMap(team => team.seatIds)),
    teamNames: others.map(team => team.name),
    freeSeats: Math.max(0, (lobby.maxPlayers || 6) - (lobby.players?.length ?? 0)),
  });
  if (problem) return problem;
  if (colourTaken(draft.colour, others.map(team => team.colour))) return "Another team in this lobby already has that colour.";

  const slots = pickSlots(draft.picks);
  const ids = await seatSlots(slots);
  if (ids.some(id => !id)) return "autodarts didn't add every new player. Try again.";
  const name = editing?.name ?? normalizeName(draft.name);
  const seatIds = ids as string[];
  await writeLineupTeam({ name, colour: { ...draft.colour }, seatIds });
  await saveTeam(ownSavedTeam(name, draft.colour, seatIds));
  closeDrawer();
  return undefined;
}

async function addSavedOwnTeam(savedTeam: SavedTeam): Promise<string | undefined> {
  if (!lobby) return "The lobby isn't loaded yet. Try again in a moment.";
  const others = currentLineup()?.teams ?? [];
  const team = withFreeColour(savedTeam, others.map(other => other.colour));
  const slots = rejoinSlots(team, lobby.players ?? [], hostId, new Set(others.flatMap(other => other.seatIds)));
  const problem = rejoinProblem(team, slots, lobby);
  if (problem) return problem;
  const adding = slots.filter(slot => slot.kind === "guest" || slot.kind === "bot").length;
  const free = Math.max(0, (lobby.maxPlayers || 6) - (lobby.players?.length ?? 0));
  if (adding > free) return `The lobby has room for ${free} more ${free === 1 ? "player" : "players"}.`;

  const ids = await seatSlots(slots);
  // Half a team is not written: whoever did join stays as a plain seat, and
  // is picked up again when the team is added once more.
  const left = unseated(slots, ids);
  if (left.length) return `autodarts didn't add ${joinNames(left)}. Try again.`;
  const seatIds = ids.filter((id): id is string => Boolean(id));
  if (seatIds.length < 1) return "autodarts didn't add the team. Try again.";
  await writeLineupTeam({ name: team.name, colour: team.colour, seatIds });
  await saveTeam({ ...team, members: team.members });
  const missing = slots.filter(slot => slot.kind === "missing").map(slot => slot.name);
  if (missing.length) return `Added. ${joinNames(missing)} ${missing.length === 1 ? "isn't" : "aren't"} in the lobby: signed-in players join from their own board.`;
  closeDrawer();
  return undefined;
}
