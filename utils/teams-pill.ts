/**
 * What the match screen's Teams pill says (entrypoints/match.content/TeamsPill.vue):
 * who's up, a won leg or match, or the partner rule's line. With own scores,
 * the teams' legs go either side of it. Pure, so it runs under tsx; the match
 * script only renders it.
 *
 * It's one line whatever it says. The site sizes the board's column from what's
 * in it, measuring the pill's row at no width at all. Anything that can wrap
 * then stands many lines tall, which shrank the board and let the side cards
 * over it (spec 2026-09-30-teams-review-and-lobby).
 */

import type { Lineup, PillNote, SavedTeam, TeamMatch } from "@/utils/teams";

import { decidedTeam, decidedText, legWonText, lineupTeams, normalizeName, partnerRuleBreach, playerUp, resultText, ruleWarningNote, teamLegs, toThrowText } from "@/utils/teams";

/** A team's legs, beside the pill. */
export interface TallyTeam {
  name: string;
  legs: number;
  from: string;
  to: string;
}

export interface PillView {
  /** Changes whenever what the pill says changes; the text slides in on it. */
  turnKey: string;
  /** Who's up, who won, or the partner rule's news. */
  text: string;
  /** At lower emphasis: the team, the player who checked out, the result, or the rule's reason. */
  detail: string;
  /** The pill's gradient, and its lines' colour. */
  from: string;
  to: string;
  /** Own scores: the teams' legs, either side of the pill. */
  left: TallyTeam[];
  right: TallyTeam[];
  /** "first to N", or 0. */
  target: number;
  /** The pill as a partner-rule line, in place of the gradient. */
  noteKind: "" | "rule" | "bust";
}

interface Colours {
  from: string;
  to: string;
}

type ViewParts = Partial<Omit<PillView, "from" | "to">> & Pick<PillView, "turnKey" | "text"> & { colour: Colours };

function view({ colour, ...parts }: ViewParts): PillView {
  return { detail: "", left: [], right: [], target: 0, noteKind: "", ...parts, from: colour.from, to: colour.to };
}

/** The tally's two sides: the first half of the teams, rounded up, on the left. */
export function tallySides<T>(items: readonly T[]): [ T[], T[] ] {
  const left = Math.ceil(items.length / 2);
  return [ items.slice(0, left), items.slice(left) ];
}

/** A visit's place in the match: set, leg, round and seat. */
function visitKey(match: TeamMatch, seat: number): string {
  return `${match.set}|${match.leg}|${match.round}|${seat}`;
}

/** A shared score: whose visit it is, or whose leg or match. */
export function sharedPill(match: TeamMatch, seats: ReadonlyMap<number, SavedTeam>, shifts: Readonly<Record<string, number>>, other: Colours, language: string): PillView {
  const player = (seat: number) => {
    const team = seats.get(seat);
    return team ? team.players[playerUp(match, seat, team, shifts[team.name] ?? 0)] ?? "" : normalizeName(match.players?.[seat]?.name);
  };
  const won = match.gameWinner ?? -1;
  if (won >= 0) {
    const team = seats.get(won);
    const matchWon = (match.winner ?? -1) >= 0;
    const name = team?.name ?? player(won);
    return view({
      turnKey: `won|${visitKey(match, won)}|${matchWon ? "match" : "leg"}`,
      text: matchWon ? decidedText(name, language) : legWonText(name, language),
      detail: team ? player(won) : "",
      colour: team?.colour ?? other,
    });
  }
  const up = match.player ?? 0;
  const team = seats.get(up);
  const name = player(up);
  return view({ turnKey: `${visitKey(match, up)}|${name}`, text: toThrowText(name, language), detail: team?.name ?? "", colour: team?.colour ?? other });
}

export interface OwnPillOptions {
  /** The colours of a seat on no team: Colors' card, or the site's. */
  other: Colours;
  language: string;
  /** Whether this match plays the partner rule. */
  partnerRule: boolean;
  /** The bust line, while the script shows it: from the bust through the visit after it. */
  note?: PillNote;
}

/** Own scores: the teams' legs round the pill, and who's up, who won, or the partner rule's line. */
export function ownPill(match: TeamMatch, lineup: Lineup, options: OwnPillOptions): PillView {
  const players = match.players ?? [];
  const seats = lineupTeams(players, lineup);
  const legs = teamLegs(match, lineup);
  const [ left, right ] = tallySides(lineup.teams.map(team => ({ name: team.name, legs: legs[team.name] ?? 0, from: team.colour.from, to: team.colour.to })));
  const base = { left, right, target: match.legs ?? 0 };
  const name = (seat: number) => normalizeName(players[seat]?.name);

  // After the deciding leg, even if the players carry on: the match is the team's.
  const decided = match.adtTeams?.decided ?? decidedTeam(match, lineup);
  if (decided) {
    const team = lineup.teams.find(candidate => candidate.name === decided);
    return view({ ...base, turnKey: `decided|${decided}`, text: decidedText(decided, options.language), detail: resultText(legs, decided, lineup), colour: team?.colour ?? options.other });
  }
  const won = match.gameWinner ?? -1;
  if (won >= 0) {
    const team = seats.get(won);
    const matchWon = (match.winner ?? -1) >= 0;
    const winner = team?.name ?? name(won);
    return view({
      ...base,
      turnKey: `won|${visitKey(match, won)}|${matchWon ? "match" : "leg"}`,
      text: matchWon ? decidedText(winner, options.language) : legWonText(winner, options.language),
      detail: team ? name(won) : "",
      colour: team?.colour ?? options.other,
    });
  }
  const up = match.player ?? 0;
  const team = seats.get(up);
  const colour = team?.colour ?? options.other;
  const turnKey = `${visitKey(match, up)}|${name(up)}`;
  // For these visits the rule's line stands in for "ANNA to throw", which the
  // site's own highlight already says with own scores.
  const breach = options.partnerRule ? partnerRuleBreach(match, lineup, up) : undefined;
  const note = options.note ?? (breach ? ruleWarningNote(breach) : undefined);
  if (note) {
    const noteKind = options.note ? "bust" : "rule";
    return view({ ...base, turnKey: `${turnKey}|${noteKind}`, text: note.primary, detail: note.secondary, colour, noteKind });
  }
  return view({ ...base, turnKey, text: toThrowText(name(up), options.language), detail: team?.name ?? "", colour });
}
