import type { IMatch } from "@/utils/websocket-helpers";

/**
 * A name for the win a match frame reports — the same name every time that win
 * is reported — or `undefined` while nobody has won.
 *
 * The match state is pushed on every change, and a won leg goes on being
 * reported long after the dart that won it. Finish is the plainest case: the
 * server sends the finished match once more, identical but for the winning
 * visit's `finishedAt`, a moment before the site moves on to the stats page. So
 * "the frame has a winner" is not "a leg has just been won", and every feature
 * that took it for one called the gameshot or matchshot again on Finish — the
 * sound, the animation and the WLED effect. Reported by @andypech06 in #243.
 *
 * The winning dart's id is what names the win. A correction rewrites where a
 * dart landed but keeps its id, so a corrected checkout is still the same win;
 * an undo and a new checkout is a new dart, so a new win. The match, set and leg
 * go in as well, for a win reported with no dart in the visit to name it.
 */
export function winId(match: IMatch | undefined): string | undefined {
  if (!match) return undefined;
  if ((match.gameWinner ?? -1) < 0 && (match.winner ?? -1) < 0) return undefined;

  const dart = match.turns?.[0]?.throws?.at(-1)?.id ?? "";
  return `${match.id}:${match.set}:${match.leg}:${dart}`;
}
