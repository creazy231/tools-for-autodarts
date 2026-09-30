/**
 * Teams, on the match screen.
 *
 * A team is one seat whose players take turns on its score (utils/teams.ts).
 * The site draws that seat like any other; this makes it read as a team:
 *
 *   - while a team is up, the site's "this player is up" gradient becomes the
 *     team's, wherever the site paints it: the card in every layout, the
 *     stacked layout's band, cricket's cells. One stylesheet, no DOM work
 *   - a waiting team's name tag carries its gradient instead
 *   - each team's card lists its players in throwing order, the one throwing
 *     filled white and a waiting team's next one outlined in its colour. A tap
 *     on a name says "it's actually their turn", and the order carries on
 *     from them for the rest of the match
 *   - a pill under the turn bar says who's up, in the site's own words, for
 *     every seat while the match has a team, so the board never jumps
 *   - when the turn passes to a team, its card pulses once
 *
 * Cards are found by name: they carry no ids, and `match.players` is put in
 * throwing order every leg, so no index points at the same card for long.
 * A bust and a won leg are left alone: they are signals, and the site draws
 * them with gradients of their own that the "up" rule does not reach.
 */

import { createApp, reactive } from "vue";

import TeamsPill from "./TeamsPill.vue";

import type { IMatch } from "@/utils/websocket-helpers";
import type { Lineup, LineupStore, LineupTeam, PillNote, SavedTeam, ShiftStore } from "@/utils/teams";
import type { PillView } from "@/utils/teams-pill";

import { addStyles, removeStyles } from "@/utils";
import { SITE_CARD, normalizeColors } from "@/utils/colors";
import { SELECTORS, anyOf, qs } from "@/utils/selectors";
import { AutodartsToolsConfig, AutodartsToolsTeamLineups, AutodartsToolsTeamShifts } from "@/utils/storage";
import { AutodartsToolsGameData, type IGameData } from "@/utils/game-data-storage";
import { getUserIdFromToken } from "@/utils/helpers";
import { TEAMS_PILL_TAG, assignCards, decidedTeam, lineupOf, lineupPartnerRule, lineupTeams, normalizeName, normalizeTeams, playerUp, ruleBustNote, ruleRefusedNote, shiftFor, shiftsOf, teamLegs, teamSeats, withShift } from "@/utils/teams";
import { ownPill, sharedPill } from "@/utils/teams-pill";

const STYLE_ID = "teams-match";
const CARD_ATTR = "data-adt-team";
const WAITING_ATTR = "data-adt-team-waiting";
const ARRIVE_ATTR = "data-adt-team-arrive";
/** Own scores: under a member's name, the team and its legs. */
const LEGS_CLASS = "adt-team-legs";
/** Holds Next Leg back while the leg that decided the match is on screen. */
const HOLD_STYLE_ID = "teams-match-hold";
/** Cards narrower than this show only the player who's up. */
const NARROW_CARD_PX = 220;

/** The site's name tag, as utils/selectors.ts names it. */
const NAME_TAG_BODY = anyOf(SELECTORS.nameTag.body);
const NAME_TAG_SHAPE = anyOf(SELECTORS.nameTag.shape);

const BASE_CSS = `
  [${WAITING_ATTR}] ${NAME_TAG_BODY} {
    background-image: linear-gradient(to right, var(--adt-team-from), var(--adt-team-to)) !important;
  }
  [${WAITING_ATTR}] ${NAME_TAG_BODY} > span.font-display { color: #f7f8fa !important; }
  [${WAITING_ATTR}] ${NAME_TAG_SHAPE} { color: var(--adt-team-to) !important; }
  .adt-team-order { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
  .adt-team-chip {
    all: unset; box-sizing: border-box; display: inline-flex; align-items: center; height: 24px;
    padding: 0 10px; border-radius: 999px; background: rgb(255 255 255 / 10%);
    color: rgb(247 248 250 / 60%); font-family: inherit; font-size: 12px; font-weight: 700;
    line-height: 1; letter-spacing: .02em; cursor: pointer;
    transition: background-color 300ms cubic-bezier(.2, .6, .2, 1), color 300ms cubic-bezier(.2, .6, .2, 1), box-shadow 300ms cubic-bezier(.2, .6, .2, 1);
  }
  .adt-team-chip:hover { color: #f7f8fa; }
  .adt-team-chip:focus-visible { outline: 2px solid #0b55df; outline-offset: 2px; }
  .adt-team-chip.is-up { background: #f7f8fa; color: #16181c; }
  .adt-team-chip.is-next { background: transparent; color: #f7f8fa; box-shadow: inset 0 0 0 1.5px var(--adt-team-to); }
  [${ARRIVE_ATTR}] { animation: adt-team-arrive 900ms cubic-bezier(.2, .6, .2, 1) 1; }
  @keyframes adt-team-arrive {
    0% { box-shadow: inset 0 0 0 0 var(--adt-team-to); }
    30% { box-shadow: inset 0 0 0 6px var(--adt-team-to); }
    100% { box-shadow: inset 0 0 0 0 transparent; }
  }
  .${LEGS_CLASS} {
    display: inline-flex; align-items: center; gap: 6px; height: 20px; padding: 0 9px 0 7px; margin: 2px auto 0;
    border-radius: 999px; background: rgb(0 0 0 / 28%); color: #f7f8fa; font-size: 10.5px; font-weight: 800; letter-spacing: .02em; white-space: nowrap;
  }
  .${LEGS_CLASS} i { width: 9px; height: 9px; border-radius: 3px; background: linear-gradient(to right, var(--adt-team-from), var(--adt-team-to)); }
  .${LEGS_CLASS} b { font-size: 12px; }
  @media (prefers-reduced-motion: reduce) {
    [${ARRIVE_ATTR}] { animation: none; }
    .adt-team-chip { transition: none; }
  }
`;

/** Anything with a name and a colour: a saved team, or a lineup's. */
interface Coloured { name: string; colour: { from: string; to: string } }

/** What the pill shows (utils/teams-pill.ts); shared with TeamsPill.vue. */
const pill = reactive<PillView>({ turnKey: "", text: "", detail: "", ...SITE_CARD, left: [], right: [], target: 0, noteKind: "" });

let ctxRef: any = null;
let pillUi: any = null;
let mounting = false;
let observer: MutationObserver | null = null;
let unwatchGameData: (() => void) | null = null;
let unwatchConfig: (() => void) | null = null;
let unwatchShifts: (() => void) | null = null;
let hostId: string | null = null;
let saved: SavedTeam[] = [];
/** The card gradient for seats that are no team: Colors' when it paints one, else the site's. */
let otherCard: { from: string; to: string } = SITE_CARD;
let shiftStore: ShiftStore = {};
let lineupStore: LineupStore = {};
let unwatchLineups: (() => void) | null = null;
/** The partner rule for a lineup that has none of its own: the last one set in a lobby. */
let partnerRuleDefault = false;
let holding = false;
/** The partner-rule bust last sent to be undone, by match and darts. */
let lastUndo = "";
/**
 * "ANNA's checkout didn't count": shown from the bust through the visit after
 * it. `bustTurn` is the busted visit, whose frames go on arriving while the
 * undo runs; `shownFor` is the first visit after it.
 */
let bustNote: { note: PillNote; bustTurn: string; shownFor?: string } | undefined;
let match: IMatch | undefined;
let lastStyles = "";
let lastTurn = "";
let scheduled = false;

export async function teams(ctx: any) {
  ctxRef = ctx;
  hostId = await getUserIdFromToken();
  readConfig(await AutodartsToolsConfig.getValue());
  shiftStore = (await AutodartsToolsTeamShifts.getValue()) ?? {};
  lineupStore = (await AutodartsToolsTeamLineups.getValue()) ?? {};
  match = thisMatch((await AutodartsToolsGameData.getValue())?.match);

  unwatchGameData?.();
  unwatchGameData = AutodartsToolsGameData.watch((value: IGameData) => {
    const next = thisMatch(value?.match);
    if (next) match = next;
    schedule();
  });
  unwatchConfig?.();
  unwatchConfig = AutodartsToolsConfig.watch((config) => {
    readConfig(config);
    schedule();
  });
  unwatchShifts?.();
  unwatchShifts = AutodartsToolsTeamShifts.watch((value) => {
    shiftStore = value ?? {};
    schedule();
  });
  unwatchLineups?.();
  unwatchLineups = AutodartsToolsTeamLineups.watch((value) => {
    lineupStore = value ?? {};
    schedule();
  });

  observer?.disconnect();
  observer = new MutationObserver(() => schedule());
  // Text too: the phone layout's top bar keeps its cells and writes the next
  // player's name into them, which adds and removes no node at all.
  observer.observe(document.body, { childList: true, characterData: true, subtree: true });
  apply();
  console.log("Autodarts Tools: Teams - Started (match)");
}

export function onRemove() {
  observer?.disconnect();
  observer = null;
  unwatchGameData?.();
  unwatchGameData = null;
  unwatchConfig?.();
  unwatchConfig = null;
  unwatchShifts?.();
  unwatchShifts = null;
  unwatchLineups?.();
  unwatchLineups = null;
  clear();
  match = undefined;
  lastTurn = "";
  lastUndo = "";
  bustNote = undefined;
}

function readConfig(config: any) {
  const teamsConfig = normalizeTeams(config?.teams);
  saved = teamsConfig.saved;
  partnerRuleDefault = teamsConfig.partnerRule;
  const colors = normalizeColors(config?.colors);
  otherCard = colors.enabled && colors.card.preset !== "default" ? colors.card : SITE_CARD;
}

/**
 * Game data is one key every autodarts tab writes to. On a match page, only
 * this match's frames count; a board page names no match, so it takes what
 * comes.
 */
function thisMatch(value: IMatch | undefined): IMatch | undefined {
  const id = window.location.pathname.match(/\/matches\/([0-9a-f-]+)/i)?.[1];
  return !value || (id && value.id !== id) ? undefined : value;
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    apply();
  });
}

function clear() {
  removeStyles(STYLE_ID);
  lastStyles = "";
  for (const card of document.querySelectorAll<HTMLElement>(`[${CARD_ATTR}]`)) undressCard(card);
  pillUi?.remove();
  pillUi = null;
  holdNextLeg(false);
}

function apply() {
  const lineup = match ? lineupOf(lineupStore, match.id) : undefined;
  if (lineup) applyOwn(lineup);
  else applyShared();
}

function applyShared() {
  const seats = match ? teamSeats(match.players ?? [], saved, hostId) : new Map<number, SavedTeam>();
  if (!match || !seats.size) {
    clear();
    return;
  }

  const shifts = shiftsOf(shiftStore, match.id);
  const up = match.player ?? 0;
  const upTeam = seats.get(up);
  writeStyles([ ...new Set(seats.values()) ]);
  dressCards(seats, shifts, up);
  Object.assign(pill, sharedPill(match, seats, shifts, otherCard, siteLanguage()));
  ensurePill();
  handover(upTeam, up);
  holdNextLeg(false);
}

/** Own scores: every member's card in its team's colours, the team's legs, and the team win. */
function applyOwn(lineup: Lineup) {
  const seats = lineupTeams(match!.players ?? [], lineup);
  if (!seats.size) {
    clear();
    return;
  }
  const up = match!.player ?? 0;
  const upTeam = seats.get(up);
  const decided = match!.adtTeams?.decided ?? decidedTeam(match!, lineup);
  const panelUp = (match!.gameWinner ?? -1) >= 0;
  askUndo();
  writeStyles(decided ? undefined : lineup.teams);
  dressOwnCards(seats, up, lineup);
  Object.assign(pill, ownPill(match!, lineup, { other: otherCard, language: siteLanguage(), partnerRule: lineupPartnerRule(lineup, partnerRuleDefault), note: shownBustNote(up) }));
  ensurePill();
  holdNextLeg(Boolean(decided && panelUp));
  handover(decided ? undefined : upTeam, up);
}

/** A visit's key: it changes whenever a new visit (or another player) comes up. */
function turnKeyOf(up: number): string {
  return `${match!.set}|${match!.leg}|${match!.round}|${up}|${normalizeName(match!.players?.[up]?.name)}`;
}

/** A checkout the team view made a bust: the service worker undoes it (utils/teams-undo.ts). */
function askUndo() {
  const bust = match?.adtTeams?.bust;
  if (!bust || !match) return;
  const key = `${match.id}|${bust.dartIds.join(",")}`;
  if (key === lastUndo) return;
  lastUndo = key;
  const note = { note: ruleBustNote(bust.breach), bustTurn: turnKeyOf(bust.seat) };
  bustNote = note;
  // When autodarts refuses, the checkout still stands on the site: say so,
  // rather than that it didn't count.
  const settle = (result?: { ok?: boolean }) => {
    if (result?.ok !== false || bustNote !== note) return;
    note.note = ruleRefusedNote(bust.breach);
    apply();
  };
  browser.runtime.sendMessage({ type: "teams:undo-visit", matchId: match.id, dartIds: bust.dartIds }).then(settle, (e) => {
    console.error(e);
    settle({ ok: false });
  });
}

/**
 * The site's highlight on whoever is up, in that player's team colours, read
 * off the cards rather than off who the game data says is up. The site moves
 * its highlight a moment before the game data arrives, and a rule keyed on
 * the team that was up painted the next card in the last team's colours for a
 * frame or two.
 *   - A highlighted team card (the wide and sidebar layouts, cricket's cells)
 *     takes its own colours, which the dressing keeps on every card.
 *   - The stacked and phone layouts highlight a band round all the cards; it
 *     takes the team of the one big card in it, whoever is up.
 * A seat on no team keeps the site's highlight, or Colors'.
 */
function writeStyles(teams?: readonly Coloured[]) {
  const rules = [ BASE_CSS ];
  if (teams?.length) {
    const highlight = `:is(${anyOf(SELECTORS.match.activeHighlight)})`;
    // `html body` outranks Colors' `#root main …` rule, which has the same !important.
    rules.push(`
      html body #root main [${CARD_ATTR}]${highlight},
      html body #root main [${CARD_ATTR}] ${highlight} {
        background-image: linear-gradient(to bottom right, var(--adt-team-from) 0%, var(--adt-team-to) 100%) !important;
      }`);
    for (const team of teams) {
      rules.push(`
      html body #root main ${highlight}:has(div.\\@container[${CARD_ATTR}="${CSS.escape(team.name)}"]) {
        background-image: linear-gradient(to bottom right, ${team.colour.from} 0%, ${team.colour.to} 100%) !important;
      }`);
    }
  }
  const css = rules.join("\n");
  if (css === lastStyles) return;
  lastStyles = css;
  addStyles(css, STYLE_ID);
}

/** Every card a seat's name is drawn on: the score cards of each layout, and cricket's player cells. */
function allCards(): HTMLElement[] {
  return [ ...document.querySelectorAll<HTMLElement>(anyOf([ ...SELECTORS.match.scoreCard, ...SELECTORS.match.cricketPlayerCell ])) ];
}

function dressCards(seats: Map<number, SavedTeam>, shifts: Record<string, number>, up: number) {
  const byName = new Map<string, { seat: number; team: SavedTeam }>();
  seats.forEach((team, seat) => byName.set(team.name, { seat, team }));

  for (const card of allCards()) {
    const entry = byName.get(normalizeName(card.querySelector(SELECTORS.match.playerName[0])?.textContent));
    if (!entry) {
      if (card.hasAttribute(CARD_ATTR)) undressCard(card);
      continue;
    }
    const { seat, team } = entry;
    const throwing = seat === up;
    if (card.getAttribute(CARD_ATTR) !== team.name) card.setAttribute(CARD_ATTR, team.name);
    card.toggleAttribute(WAITING_ATTR, !throwing);
    card.style.setProperty("--adt-team-from", team.colour.from);
    card.style.setProperty("--adt-team-to", team.colour.to);
    renderOrder(card, team, seat, playerUp(match!, seat, team, shifts[team.name] ?? 0), throwing);
  }
}

function undressCard(card: HTMLElement) {
  card.removeAttribute(CARD_ATTR);
  card.removeAttribute(WAITING_ATTR);
  card.removeAttribute(ARRIVE_ATTR);
  card.style.removeProperty("--adt-team-from");
  card.style.removeProperty("--adt-team-to");
  card.querySelector(":scope .adt-team-order")?.remove();
  card.querySelector(`:scope .${LEGS_CLASS}`)?.remove();
}

function dressOwnCards(seats: Map<number, LineupTeam>, up: number, lineup: Lineup) {
  const cards = allCards();
  const players = match!.players ?? [];
  const shown = assignCards(cards.map(card => ({
    name: card.querySelector(SELECTORS.match.playerName[0])?.textContent ?? "",
    small: card.matches(anyOf(SELECTORS.match.smallScoreCard)),
  })), players, up);
  const legs = teamLegs(match!, lineup);
  cards.forEach((card, index) => {
    const team = seats.get(shown[index]);
    if (!team) {
      if (card.hasAttribute(CARD_ATTR)) undressCard(card);
      return;
    }
    if (card.getAttribute(CARD_ATTR) !== team.name) card.setAttribute(CARD_ATTR, team.name);
    card.toggleAttribute(WAITING_ATTR, shown[index] !== up);
    card.style.setProperty("--adt-team-from", team.colour.from);
    card.style.setProperty("--adt-team-to", team.colour.to);
    renderLegs(card, team, legs[team.name] ?? 0);
  });
}

/** Under a member's name: the team, and its legs. */
function renderLegs(card: HTMLElement, team: LineupTeam, legs: number) {
  const key = `${team.name}|${legs}`;
  const current = card.querySelector<HTMLElement>(`:scope .${LEGS_CLASS}`);
  if (current?.dataset.key === key) return;
  const nameRow = qs<HTMLElement>(SELECTORS.match.nameRow, card);
  current?.remove();
  if (!nameRow) return;
  const label = document.createElement("span");
  label.className = LEGS_CLASS;
  label.dataset.key = key;
  const swatch = document.createElement("i");
  swatch.setAttribute("aria-hidden", "true");
  const count = document.createElement("b");
  count.textContent = String(legs);
  label.append(swatch, `${team.name} `, count);
  nameRow.after(label);
}

function renderOrder(card: HTMLElement, team: SavedTeam, seat: number, index: number, throwing: boolean) {
  const small = card.matches(anyOf(SELECTORS.match.smallScoreCard)) || card.getBoundingClientRect().width < NARROW_CARD_PX;
  const key = `${team.players.join(",")}|${index}|${throwing ? 1 : 0}|${small ? 1 : 0}`;
  const current = card.querySelector<HTMLElement>(":scope .adt-team-order");
  if (current?.dataset.key === key) return;

  const nameRow = qs<HTMLElement>(SELECTORS.match.nameRow, card);
  current?.remove();
  if (!nameRow) return;

  const order = document.createElement("div");
  order.className = "adt-team-order";
  order.dataset.key = key;
  for (const i of small ? [ index ] : team.players.map((_, i) => i)) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "adt-team-chip";
    if (i === index) chip.classList.add(throwing ? "is-up" : "is-next");
    chip.textContent = team.players[i];
    chip.setAttribute("aria-pressed", String(i === index));
    chip.title = throwing ? `${team.players[i]} is throwing` : `${team.players[i]} throws next`;
    chip.addEventListener("click", (event) => {
      event.stopPropagation();
      correct(team, seat, i);
    });
    order.append(chip);
  }
  nameRow.after(order);
}

/** Tap to correct: the tapped player is up (or next), and the order carries on from them. */
async function correct(team: SavedTeam, seat: number, wanted: number) {
  if (!match) return;
  shiftStore = withShift(shiftStore, match.id, team.name, shiftFor(match, seat, team, wanted), Date.now());
  schedule();
  await AutodartsToolsTeamShifts.setValue(shiftStore);
}

function siteLanguage(): string {
  return localStorage.getItem("autodarts.settings.language") || navigator.language || "en";
}

/**
 * The bust's line, from the busted visit, whose frames go on arriving while
 * the undo runs, through the visit after it. It goes when the next one comes up.
 */
function shownBustNote(up: number): PillNote | undefined {
  if (!bustNote) return undefined;
  const turn = turnKeyOf(up);
  const onBustVisit = turn === bustNote.bustTurn;
  if (!onBustVisit) bustNote.shownFor ??= turn;
  if (onBustVisit || bustNote.shownFor === turn) return bustNote.note;
  bustNote = undefined;
  return undefined;
}

/**
 * While the leg that decided the match is on screen, its Next Leg is hidden
 * and Space and Enter (the site's own shortcuts for it) are held back. The
 * site's match is still open; the team's is over.
 */
function holdNextLeg(on: boolean) {
  if (on === holding) return;
  holding = on;
  if (on) {
    addStyles(`html body ${anyOf(SELECTORS.match.nextLegButton)} { display: none !important; }`, HOLD_STYLE_ID);
    window.addEventListener("keydown", holdKeys, true);
  } else {
    removeStyles(HOLD_STYLE_ID);
    window.removeEventListener("keydown", holdKeys, true);
  }
}

function holdKeys(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  if (target?.closest("input, textarea, [contenteditable='true']")) return;
  if (event.code !== "Space" && event.code !== "Enter" && event.code !== "NumpadEnter") return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

async function ensurePill() {
  const anchor = qs<HTMLElement>(SELECTORS.match.turnBarRow);
  if (pillUi && pillUi.shadowHost?.isConnected && pillUi.shadowHost.previousElementSibling === anchor) return;
  if (!anchor || mounting || !ctxRef) return;

  mounting = true;
  try {
    pillUi?.remove();
    pillUi = await createShadowRootUi(ctxRef, {
      name: TEAMS_PILL_TAG,
      position: "inline",
      anchor: () => qs(SELECTORS.match.turnBarRow),
      append: "after",
      onMount: (container: HTMLElement) => {
        const app = createApp(TeamsPill, { view: pill });
        app.mount(container);
        return app;
      },
      onRemove: (app: any) => app?.unmount(),
    });
    pillUi.mount();
  } finally {
    mounting = false;
  }
}

/** One pulse on the cards of the team whose turn has just come, never on the first paint. */
function handover(upTeam: Coloured | undefined, up: number) {
  const turn = `${match!.id}|${match!.set}|${match!.leg}|${match!.round}|${up}`;
  if (turn === lastTurn) return;
  const first = lastTurn === "";
  lastTurn = turn;
  if (!upTeam || first) return;

  // The cards of whoever is up: with own scores, not their teammates'.
  for (const card of document.querySelectorAll<HTMLElement>(`[${CARD_ATTR}="${CSS.escape(upTeam.name)}"]:not([${WAITING_ATTR}])`)) {
    card.removeAttribute(ARRIVE_ATTR);
    // a layout read between the two, so the animation starts again
    card.getBoundingClientRect();
    card.setAttribute(ARRIVE_ATTR, "");
    setTimeout(() => card.removeAttribute(ARRIVE_ATTR), 1000);
  }
}
