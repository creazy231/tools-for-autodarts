/**
 * Which autodarts hosts the content scripts run on.
 *
 * Production targets both the current site and the v2 rebuild, so one build
 * serves users through the transition.
 *
 * `yarn dev` targets **v2 only**. During the migration the stable build is
 * installed in a real browser to keep using v1 normally; if the dev build also
 * claimed v1, two copies of the extension would run there at once and fight
 * over the same DOM. Restricting dev to v2 keeps the two out of each other's
 * way. Devtools builds (`yarn build:devtools`) are NOT dev mode, so they keep
 * both hosts — that is the build you install to use v1.
 */

const V1 = "*://play.autodarts.com/*";
const V2 = "*://play-v2.autodarts.com/*";

export const AUTODARTS_MATCHES: string[] = import.meta.env.DEV ? [ V2 ] : [ V1, V2 ];
