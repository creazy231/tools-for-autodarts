/**
 * The partner rule's bust, done (utils/teams.ts `teamView`): every dart of the
 * visit taken back with the site's undo, then the turn passed on. It runs in
 * the service worker, so however many tabs report the same checkout, and
 * however often the site sends the frame, the visit is undone once.
 */
export type Poster = (path: string) => Promise<{ ok: boolean; status: number }>;

/** Visits asked for, by match and darts, for as long as the service worker lives. */
const undone = new Set<string>();

export async function undoVisit(matchId: string, dartIds: readonly string[], post: Poster): Promise<{ ok: boolean; skipped?: boolean }> {
  const key = `${matchId}|${dartIds.join(",")}`;
  if (!matchId || !dartIds.length || undone.has(key)) return { ok: true, skipped: true };
  undone.add(key);
  for (let dart = 0; dart < dartIds.length; dart++) {
    if (!(await post(`/gs/v0/matches/${matchId}/undo`)).ok) return { ok: false };
  }
  return { ok: (await post(`/gs/v0/matches/${matchId}/players/next`)).ok };
}

/** For the tests. */
export function forgetUndone() {
  undone.clear();
}
