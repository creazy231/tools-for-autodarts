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
import type { SavedTeam, TeamDraft } from "@/utils/teams";

import { addStyles, removeStyles } from "@/utils";
import { SELECTORS, anyOf, qs, qsa } from "@/utils/selectors";
import { AutodartsToolsConfig } from "@/utils/storage";
import { AutodartsToolsLobbyData } from "@/utils/lobby-data-storage";
import { getUserIdFromToken } from "@/utils/helpers";
import { GUEST_KEY } from "@/utils/guest-players";
import { addGuest, lobbyIdFromUrl } from "@/utils/lobby-guests";
import { checkTeam, colourTaken, findTeam, isHostedGuest, normalizeName, normalizeTeams, rememberTeam, uniqueNames } from "@/utils/teams";

const BUTTON_ID = "adt-add-team";
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
`;

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
  submit: (draft: TeamDraft) => Promise<string | undefined>;
  addSaved: (team: SavedTeam) => Promise<string | undefined>;
  close: () => void;
}

let ctxRef: any = null;
let drawerUi: any = null;
let observer: MutationObserver | null = null;
let unwatchLobby: (() => void) | null = null;
let unwatchConfig: (() => void) | null = null;
let lobby: ILobbies | undefined;
let hostId: string | null = null;
let saved: SavedTeam[] = [];
let savedPlayers: string[] = [];
let scheduled = false;

const drawer = reactive<DrawerState>({
  editing: null,
  guestNames: [],
  reservedNames: [],
  playerTeams: {},
  takenColours: [],
  offered: [],
  savedTeams: [],
  full: false,
  submit: submitDraft,
  addSaved: addSavedTeam,
  close: closeDrawer,
});

export async function teams(ctx: any) {
  console.log("Autodarts Tools: Teams - Starting (lobby)");
  ctxRef = ctx;
  hostId = await getUserIdFromToken();
  readConfig(await AutodartsToolsConfig.getValue());
  lobby = currentLobby(await AutodartsToolsLobbyData.getValue());
  addStyles(LOBBY_CSS, STYLE_ID);

  // Leaving one lobby for another runs this again without a teardown, so the
  // handles from the last one go first (#230).
  unwatchLobby?.();
  unwatchLobby = AutodartsToolsLobbyData.watch((value?: ILobbies) => {
    lobby = currentLobby(value);
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
  closeDrawer();
  document.getElementById(BUTTON_ID)?.remove();
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
  dressRows();
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
    const team = findTeam(saved, seat.name);
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
  const whole = row.querySelector(".adt-team-order") && row.querySelector(".adt-team-edit");
  if (row.getAttribute(ROW_ATTR) === key && whole) return;

  row.setAttribute(ROW_ATTR, key);
  row.style.setProperty("--adt-team-from", team.colour.from);
  row.style.setProperty("--adt-team-to", team.colour.to);

  row.querySelector(".adt-team-order")?.remove();
  qs<HTMLElement>(SELECTORS.lobby.playerNameColumn, row)?.append(orderRow(team.players));

  if (!row.querySelector(".adt-team-edit")) {
    const remove = qs<HTMLButtonElement>(SELECTORS.lobby.playerRemoveButton, row);
    if (remove) {
      // A copy of the row's own ✕, so it sits and hovers like the site's
      // buttons, before the first of them.
      const edit = remove.cloneNode(false) as HTMLButtonElement;
      edit.classList.add("adt-team-edit");
      edit.type = "button";
      edit.disabled = false;
      edit.title = "Edit team";
      edit.setAttribute("aria-label", `Edit ${team.name}`);
      edit.innerHTML = ICON_EDIT;
      edit.addEventListener("click", (event) => {
        event.stopPropagation();
        const name = normalizeName(qs(SELECTORS.lobby.playerNameInRow, row)?.textContent);
        const current = findTeam(saved, name);
        if (current) openDrawer(current);
      });
      const firstButton = [ ...row.children ].find(child => child.matches("button[data-slot='button']")) ?? remove;
      firstButton.before(edit);
    }
  }
}

function undress(row: HTMLElement) {
  row.removeAttribute(ROW_ATTR);
  row.style.removeProperty("--adt-team-from");
  row.style.removeProperty("--adt-team-to");
  row.querySelector(".adt-team-order")?.remove();
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

function drawerContext(editing: SavedTeam | null): Omit<DrawerState, "submit" | "addSaved" | "close"> {
  const lobbyTeams = [ ...teamsInLobby().values() ].filter(team => team.name !== editing?.name);
  const guests = uniqueNames((lobby?.players ?? []).filter(seat => !seat.userId && !seat.cpuPPR).map(seat => seat.name));
  const playerTeams: Record<string, string> = {};
  for (const team of lobbyTeams) for (const player of team.players) playerTeams[player] = team.name;
  return {
    editing,
    guestNames: guests.filter(name => name !== editing?.name),
    reservedNames: uniqueNames([ ...guests, ...saved.map(team => team.name) ]),
    playerTeams,
    takenColours: lobbyTeams.map(team => team.colour),
    offered: uniqueNames([ ...savedPlayers, ...siteGuests(), ...saved.flatMap(team => team.players) ]),
    savedTeams: editing ? [] : saved.filter(team => !guests.includes(team.name)),
    full: isFull(),
  };
}

async function openDrawer(editing: SavedTeam | null) {
  if (!isHost() || !ctxRef) return;
  Object.assign(drawer, drawerContext(editing));
  if (drawerUi) return;

  drawerUi = await createShadowRootUi(ctxRef, {
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
  drawerUi.mount();
}

function closeDrawer() {
  drawerUi?.remove();
  drawerUi = null;
}

async function saveTeam(team: SavedTeam) {
  const config = await AutodartsToolsConfig.getValue();
  const current = normalizeTeams(config.teams);
  await AutodartsToolsConfig.setValue({ ...config, teams: { enabled: current.enabled, saved: rememberTeam(current.saved, team) } });
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

  const team: SavedTeam = { name: editing?.name ?? normalizeName(draft.name), players: uniqueNames(draft.players), colour: { ...draft.colour } };
  await saveTeam(team);
  if (!editing && !await addGuest(team.name, "Teams")) {
    return "The team is saved, but autodarts didn't add it to the lobby. Add it again from Saved teams.";
  }
  closeDrawer();
  return undefined;
}

async function addSavedTeam(team: SavedTeam): Promise<string | undefined> {
  if (drawer.full) return "The lobby is full.";
  const problem = checkTeam(team, { guestNames: drawer.guestNames, otherTeamPlayers: Object.keys(drawer.playerTeams) });
  if (problem) return problem;
  await saveTeam(team);
  if (!await addGuest(team.name, "Teams")) return "autodarts didn't add the team. Try again.";
  closeDrawer();
  return undefined;
}
