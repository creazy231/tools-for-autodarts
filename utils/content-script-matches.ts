/**
 * Which autodarts hosts the content scripts run on.
 *
 * One host. It used to be two: the rebuild lived at `play-v2.autodarts.com`
 * while v1 held the main hostname, and each build claimed a different subset so
 * a v2 dev build and a v1 reference build could sit in the same browser without
 * both injecting into the same page. autodarts has since finished the switch —
 * v2 serves from `play.autodarts.com` and `play-v2` is a 301 to it — so there
 * is nothing left to keep apart.
 *
 * Two hosts are deliberately NOT listed:
 *
 *   play-v2  a 301. A content script there would load into a page that
 *            immediately navigates away, and an unused host is a needless
 *            permission for users and a question from store reviewers.
 *   play-v1  where autodarts parked the old Chakra site, reachable from
 *            "Switch to classic design" in the user drawer. v1 is retired as
 *            far as this extension is concerned, and it has never matched this
 *            host. Adding it would mean maintaining the v1 markup again, which
 *            is the opposite of the migration.
 *
 * Still a module rather than an inline literal because eight entrypoints
 * declare it. They must not drift apart: a mismatch means one feature silently
 * fails to load on a page where the others do.
 */

export const AUTODARTS_MATCHES: string[] = [ "*://play.autodarts.com/*" ];
