/**
 * Teams in words, in the language autodarts is showing: who's up and who won
 * for the match's pill, the partner rule's lines, the lobby's labels and its
 * note on uneven teams, the name a new team is offered, and the drawer's
 * problems.
 *
 * utils/teams.ts holds the rules and no text. The service worker loads it
 * through utils/storage.ts, and a catalog imported there would ride along into
 * background.js. So its checks return a problem as a message key and its values
 * (`TeamsProblem`), and `problemText` words it when it is shown: an open drawer
 * follows a switch of language. Every function here reads the language of the
 * moment it is called.
 *
 * Pure apart from that, so it runs under tsx; the imports are relative for it.
 */

import { list, t } from "./i18n";
import { normalizeName } from "./teams";

import type { MessageKey, Params } from "./i18n";
import type { ColorScheme } from "./storage";
import type { Breach, LineupTeam, PillNote, TeamsProblem } from "./teams";

/** The word a colour gives a team's suggested name, by the colour's preset id. A custom pair has none. */
const COLOUR_WORDS: Readonly<Record<string, MessageKey>> = {
  default: "teams.colourWords.default",
  blueberry: "teams.colourWords.blueberry",
  ocean: "teams.colourWords.ocean",
  lime: "teams.colourWords.lime",
  petrol: "teams.colourWords.petrol",
  orange: "teams.colourWords.orange",
  crimson: "teams.colourWords.crimson",
  gold: "teams.colourWords.gold",
  slate: "teams.colourWords.slate",
  qwellcode: "teams.colourWords.qwellcode",
};

/**
 * A problem from utils/teams.ts, or the drawer's own, in words: its lists
 * joined as the language joins one ("A, B and C"). "" when there is none.
 */
export function problemText(problem: TeamsProblem): string {
  if (!problem) return "";
  const params: Params = { ...problem.params };
  for (const [ name, names ] of Object.entries(problem.lists ?? {})) params[name] = list(names);
  return t(problem.key, params);
}

/**
 * The name a new team is offered: TEAM and its colour's word, numbered when
 * that is taken ("TEAM RED 2"). A custom pair has no word, so it is TEAM 1,
 * TEAM 2 and so on. The word is in the language of the moment it is offered;
 * the name, once given, never changes with the language.
 */
export function suggestName(colour: ColorScheme, takenNames: readonly string[]): string {
  const taken = new Set(takenNames.map(normalizeName));
  const word = COLOUR_WORDS[colour.preset];
  if (word) {
    const base = `TEAM ${t(word).toUpperCase()}`;
    if (!taken.has(base)) return base;
    for (let n = 2; ; n++) {
      if (!taken.has(`${base} ${n}`)) return `${base} ${n}`;
    }
  }
  for (let n = 1; ; n++) {
    if (!taken.has(`TEAM ${n}`)) return `TEAM ${n}`;
  }
}

/** The note under the lobby's players when the teams aren't the same size, or "". */
export function unevenText(teams: readonly LineupTeam[]): string {
  const sizes = teams.map(team => team.seatIds.length);
  if (teams.length < 2 || sizes.every(size => size === sizes[0])) return "";
  const [ first, ...rest ] = teams;
  const parts = [
    t("teams.lobby.uneven.first", { name: first.name, count: first.seatIds.length }),
    ...rest.map(team => t("teams.lobby.uneven.rest", { name: team.name, count: team.seatIds.length })),
  ];
  return t("teams.lobby.uneven.note", { teams: list(parts) });
}

/** A member's place in its own-score team, for the lobby row: "1 of 2", or nothing in a team of one. */
export function memberLabel(place: number, size: number): string {
  return size > 1 ? t("teams.lobby.memberOf", { place, size }) : "";
}

/** "TOM to throw", in the site's own words for its language (Killer's `game.killer.toThrow`). */
export function toThrowText(player: string): string {
  return t("teams.pill.toThrow", { name: player });
}

/** The pill while the site's Winner panel is up for a leg. */
export function legWonText(name: string): string {
  return t("teams.pill.legWon", { name });
}

/** The pill once a team, or a player, has won the match. */
export function decidedText(team: string): string {
  return t("teams.pill.matchWon", { name: team });
}

/** While the partner rule stops the player up from checking out. */
export function ruleWarningNote(breach: Breach): PillNote {
  return {
    primary: t("teams.pill.noCheckout"),
    secondary: t("teams.pill.ruleWarning", { teammate: breach.teammate, left: breach.teammateLeft, opponents: list(breach.opponents), opponentsLeft: breach.opponentsLeft }),
  };
}

/** After a checkout the partner rule turned into a bust. */
export function ruleBustNote(breach: Breach): PillNote {
  return { primary: t("teams.pill.notCounted", { name: breach.player }), secondary: t("teams.pill.partnerRule") };
}

/** When the checkout was taken back but autodarts wouldn't pass the turn on: the visit is empty, so Next is all that's left. */
export function ruleNextNote(breach: Breach): PillNote {
  return { primary: t("teams.pill.notCounted", { name: breach.player }), secondary: t("teams.pill.pressNext") };
}

/** When autodarts refused to take a rule-breaking checkout back. */
export function ruleRefusedNote(breach: Breach): PillNote {
  return { primary: t("teams.pill.undoYourself", { name: breach.player }), secondary: t("teams.pill.refused") };
}
