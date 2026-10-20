/**
 * The shapes a trigger can take. The matcher (utils/game-events/match.ts) only
 * reads `ranges`; the rest are the settings' trigger validation
 * (validateAnimationTriggers in utils/helpers.ts). Kept free of imports so the
 * matcher stays loadable outside the extension, as the replay script loads it.
 */
export const triggerPatterns = {
  // Points: 0 to 180
  points: /^(180|1[0-7][0-9]|[1-9][0-9]|[0-9])$/,

  // Ranges: 100-140 or range_100_140
  ranges: /^(?:range_)?(180|1[0-7][0-9]|[1-9][0-9]|[0-9])[-_](180|1[0-7][0-9]|[1-9][0-9]|[0-9])$/,

  // Singles: s0 to s20 and 25
  singles: /^s(1[0-9]|20|[0-9]|25)$/,

  // Doubles: d1 to d20
  doubles: /^d(1[0-9]|20|[1-9])$/,

  // Triples: t1 to t20
  triples: /^t(1[0-9]|20|[1-9])$/,

  // Misses: m1 to m20 beside a number, miss from the keypad
  misses: /^(m(1[0-9]|20|[1-9])|miss)$/,

  // Special events
  specialEvents: /^(bull|outside|busted|partner_rule|gameshot|matchshot|luckynumber|cricket_hit|cricket_miss|gotcha|killer_became_killer|killer_killed)$/,

  // Combination tags: Format: [first dart]_[second dart]_[third dart]
  // Each dart can be a single, double, triple, miss, or bull; 25 is the single bull as set up before s25
  dartPattern: /^(s(1[0-9]|20|[0-9]|25)|d(1[0-9]|20|[1-9])|t(1[0-9]|20|[1-9])|m(1[0-9]|20|[1-9])|miss|bull|25)$/,
};
