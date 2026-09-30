/**
 * The partner rule's bust, done (utils/teams.ts `teamView`): every dart of the
 * visit taken back with the site's undo, then the turn passed on. It runs in
 * the service worker, so however many tabs report the same checkout, and
 * however often the site sends the frame, the visit is undone once. Every ask
 * learns how it went, so any tab can say when autodarts refused.
 */
export type Poster = (path: string) => Promise<{ ok: boolean; status: number }>;

/** How a visit's take-back went; `stage` names the step autodarts refused. */
interface UndoResult { ok: boolean; skipped?: boolean; stage?: "undo" | "next" }

/** How long to wait before passing the turn again: the server can still be reopening the leg. */
const NEXT_RETRY_MS = [ 400, 1200 ];

const pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** Visits asked for, by match and darts, for as long as the service worker lives. */
const undone = new Map<string, Promise<UndoResult>>();

export async function undoVisit(matchId: string, dartIds: readonly string[], post: Poster, wait: (ms: number) => Promise<void> = pause): Promise<UndoResult> {
  const key = `${matchId}|${dartIds.join(",")}`;
  if (!matchId || !dartIds.length) return { ok: true, skipped: true };
  const asked = undone.get(key);
  if (asked) return { ...(await asked), skipped: true };
  const run = takeBack(matchId, dartIds.length, post, wait);
  undone.set(key, run);
  return run;
}

async function takeBack(matchId: string, darts: number, post: Poster, wait: (ms: number) => Promise<void>): Promise<UndoResult> {
  // A request that can't be made at all is refused as much as a 403 is.
  const sent = (path: string) => post(path).then(response => response.ok, () => false);
  for (let dart = 0; dart < darts; dart++) {
    if (!await sent(`/gs/v0/matches/${matchId}/undo`)) return { ok: false, stage: "undo" };
  }
  // The darts are gone now; only the turn is left to pass. It failed once
  // live straight after the undos, and worked by hand a moment later.
  if (await sent(`/gs/v0/matches/${matchId}/players/next`)) return { ok: true };
  for (const ms of NEXT_RETRY_MS) {
    await wait(ms);
    if (await sent(`/gs/v0/matches/${matchId}/players/next`)) return { ok: true };
  }
  return { ok: false, stage: "next" };
}

/** For the tests. */
export function forgetUndone() {
  undone.clear();
}
