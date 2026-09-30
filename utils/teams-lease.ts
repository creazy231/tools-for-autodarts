/**
 * One tab at a time for a lobby's reorder (entrypoints/lobby.content/teams.ts
 * `keepOrder`). The same lobby open in two tabs would send every move twice,
 * and a move sent again undoes the one before, so the seats would swap back
 * and forth. The service worker is one for every tab, so it hands out the
 * turn: a lease per lobby, to one tab, until that tab gives it back or it runs
 * out. The page's own Web Locks can't do this for a content script in
 * Firefox, which refuses the promise a lock callback returns.
 */
interface Lease { holder: string; until: number }

/** Longer than a full reorder (six moves, each waiting up to 3 s for its update). */
const LEASE_MS = 30_000;

const leases = new Map<string, Lease>();

/** Whether `holder` may reorder `lobby` now; a yes holds the lobby for it. */
export function claimLease(lobby: string, holder: string, now: number): boolean {
  const lease = leases.get(lobby);
  if (lease && lease.holder !== holder && lease.until > now) return false;
  leases.set(lobby, { holder, until: now + LEASE_MS });
  return true;
}

export function releaseLease(lobby: string, holder: string) {
  if (leases.get(lobby)?.holder === holder) leases.delete(lobby);
}

/** For the tests. */
export function forgetLeases() {
  leases.clear();
}
