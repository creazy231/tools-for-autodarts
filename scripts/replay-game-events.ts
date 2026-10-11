/**
 * Replays a recorded autodarts WebSocket log through deriveTriggers
 * (utils/game-events/derive.ts), the way the extension feeds it: game events
 * held back for the next state frame of their match, a state without events
 * compared with the one acted on before, a correction merged as `activated`.
 *
 * It prints every update with the triggers it gives, and a count of them at
 * the end, to check a change to the derivation against real games without a
 * board. See docs/superpowers/specs/2026-10-11-game-event-processor-design.md.
 *
 * The log is one frame per line, `<ISO time> TEXT <frame JSON>`, as
 * darts-board-controler-py's ws capture writes it. Run from the repo root, so
 * that `@/` resolves:
 *
 *   npx tsx scripts/replay-game-events.ts <log> [--quiet]
 *
 * Names are the seats' own (no Teams), and nobody is signed in, so
 * `opponent_throw` never appears. Once-only triggers (gameon, bulloff, wins)
 * are marked `*`; the processor, not this script, plays them once.
 */
import { readFileSync } from "node:fs";

import type { IGameEvent, IGameTrigger } from "@/utils/game-events/types";
import type { IMatch } from "@/utils/websocket-helpers";

import { deriveTriggers } from "@/utils/game-events/derive";

interface Frame {
  channel?: string;
  topic?: string;
  data?: any;
}

const [ file, flag ] = process.argv.slice(2);
if (!file) {
  console.error("Usage: npx tsx scripts/replay-game-events.ts <log> [--quiet]");
  process.exit(1);
}
const quiet = flag === "--quiet";

const pending = new Map<string, IGameEvent[]>();
const counts: Record<string, number> = {};
const eventCounts: Record<string, number> = {};
let lastActed: IMatch | undefined;
let actedKey: string | undefined;
let turnStartScore: number | undefined;

/** What the settler compares (utils/settle-game-data.ts `whatHappened`), so a repeated state is acted on once. */
function stateKey(match: IMatch): string {
  const turn = match.turns?.[0];
  return JSON.stringify([
    match.id,
    match.set,
    match.leg,
    match.round,
    match.player,
    match.activated,
    match.gameWinner,
    match.winner,
    match.gameScores,
    match.state?.checkoutGuide,
    turn && [ turn.id, turn.points, turn.score, turn.busted, turn.throws?.map(dart => [ dart.id, dart.segment?.name ]) ],
  ]);
}

function label(trigger: IGameTrigger): string {
  const name = Array.isArray(trigger.trigger) ? `[${trigger.trigger.join(",")}]` : trigger.trigger as string;
  return trigger.onceKey ? `${name}*` : name;
}

/** Which line of the summary a trigger counts on: patterns and names are summed up. */
function bucket(trigger: IGameTrigger): string {
  const name = Array.isArray(trigger.trigger) ? trigger.trigger.join("+") : trigger.trigger as string;
  if (name.startsWith("target")) return "target<N>";
  if (name.startsWith("yr_")) return "yr_<n>";
  if (name.startsWith("you_require")) return "you_require…";
  if (trigger.category === "throw") return "<dart>";
  if (trigger.category === "total") return "<total>";
  if (trigger.category === "combo") return "<combo>";
  if ((trigger.category === "player" || trigger.category === "winner") && ![ "bot", "next_player" ].includes(name)) return "<name>";
  return name;
}

function act(time: string, match: IMatch, events: IGameEvent[]): void {
  if (!match?.turns?.length) return;
  if (match.activated !== undefined && match.activated >= 0) {
    if (!quiet) console.log(time.slice(11, 19), "EDIT");
    return;
  }

  const key = stateKey(match);
  if (!events.length && key === actedKey) return;
  actedKey = key;

  const prev = lastActed?.id === match.id ? lastActed : undefined;
  const seat = match.players?.[match.player]?.name;
  const winner = match.players?.[match.gameWinner]?.name;
  const triggers = deriveTriggers({
    events,
    state: match,
    prev,
    source: events.length ? "events" : "state",
    names: { turn: seat ? [ seat ] : [], matchWin: winner ? [ winner ] : [] },
    localUserId: null,
    turnStartScore,
  });
  lastActed = match;
  if (!match.turns[0].throws?.length) turnStartScore = match.gameScores?.[match.player];

  for (const trigger of triggers) {
    if (trigger.fallback) continue;
    counts[bucket(trigger)] = (counts[bucket(trigger)] ?? 0) + 1;
  }

  if (quiet) return;
  const darts = match.turns[0].throws.map(dart => dart.segment.name).join(",");
  console.log(
    time.slice(11, 19),
    (events.length ? "EV" : "ST").padEnd(3),
    `${match.variant} r${match.round} p${match.player} [${darts}]`.padEnd(40),
    events.map(event => event.event).join(",").padEnd(28),
    triggers.filter(trigger => !trigger.fallback).map(label).join(" "),
  );
}

for (const line of readFileSync(file, "utf8").split("\n")) {
  const at = line.indexOf(" TEXT ");
  if (at < 0) continue;

  let frame: Frame;
  try {
    frame = JSON.parse(line.slice(at + 6));
  } catch {
    continue;
  }
  if (frame.channel !== "autodarts.matches") continue;

  const [ matchId, kind ] = String(frame.topic ?? "").split(".");
  const time = line.slice(0, at);
  const data = frame.data;

  if (kind === "game-events") {
    eventCounts[data.event] = (eventCounts[data.event] ?? 0) + 1;
    pending.set(matchId, [ ...(pending.get(matchId) ?? []), { event: data.event, matchId, body: data.body } ]);
  } else if (kind === "state") {
    const events = pending.get(matchId) ?? [];
    pending.delete(matchId);
    act(time, data as IMatch, events);
  } else if (kind === "corrections" && lastActed) {
    act(time, { ...lastActed, activated: data.activated }, []);
  }
}

console.log("\ntriggers:", counts);
console.log("game events:", eventCounts);
