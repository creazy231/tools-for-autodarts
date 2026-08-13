/**
 * Central registry of every selector that targets the AUTODARTS page DOM.
 *
 * Why this exists
 * ---------------
 * autodarts.com is being rebuilt (v1 Chakra UI -> v2 Tailwind + shadcn/ui).
 * Before this module the ~97 site-facing selectors were inline literals spread
 * across ~30 files, many of them structural chains like
 *   #root > div > div:nth-of-type(2) > div > div:nth-of-type(2) > ... > tbody > tr
 * which cannot survive a redesign. Centralising them turns the migration from an
 * archaeology dig into a one-file remap.
 *
 * How to use
 * ----------
 * Every entry is an ORDERED list of candidates, v2 first, v1 last:
 *
 *   waitForElement(SELECTORS.match.menuBar)     // takes string[] natively
 *   qs(SELECTORS.lobby.playerRows)              // querySelector with fallback
 *   qsa(SELECTORS.lobby.playerRows)             // querySelectorAll with fallback
 *
 * Keeping both versions in one list means a single build works on the old and
 * new site during the transition. Once v1 is retired, delete the trailing
 * candidates - no call site changes.
 *
 * Prefer stable anchors when filling in v2 entries, in this order:
 *   1. [data-slot="..."]   - shadcn/ui marks every primitive with one
 *   2. semantic #id        - v2 uses real ids (#emailOrUsername), not React noise
 *   3. [aria-label], [role]
 *   4. text content        - via waitForElementWithTextContent
 *   5. structural chains   - last resort; these are what broke in the first place
 *
 * Do NOT anchor on:
 *   - .chakra-*  : gone in v2
 *   - .css-*     : Emotion hashes, regenerated on every build
 *   - #base-ui-_r_6_ / #_r_h_ : Base UI generates these per render
 *
 * TODO markers below are entries whose v2 equivalent is not yet known. Most are
 * on the in-match screen, which needs a live match to inspect. Fill them in as
 * each feature is migrated - see docs/v2-migration-map.md.
 */

/** Ordered selector candidates. First one that matches wins. */
export type SelectorSet = string[];

export type SiteVersion = "v1" | "v2";

/**
 * Which version of the site are we on?
 *
 * Detection is by rendered markup rather than hostname, because v2 will
 * eventually take over the play.autodarts.com hostname.
 */
export function detectSiteVersion(): SiteVersion {
  // shadcn/ui stamps data-slot on every primitive; Chakra never emits it.
  if (document.querySelector("[data-slot]")) return "v2";
  if (document.querySelector("[class*='chakra-']")) return "v1";
  // Fall back to hostname while the v2 preview lives on its own subdomain.
  return location.hostname.includes("play-v2") ? "v2" : "v1";
}

// ---------------------------------------------------------------- query helpers

/** querySelector across an ordered candidate list. */
export function qs<T extends Element = HTMLElement>(
  set: SelectorSet,
  root: ParentNode = document,
): T | null {
  for (const selector of set) {
    const el = root.querySelector<T>(selector);
    if (el) return el;
  }
  return null;
}

/**
 * querySelectorAll across an ordered candidate list.
 * Returns the matches for the FIRST candidate that matches anything, so v1 and
 * v2 results are never mixed together.
 */
export function qsa<T extends Element = HTMLElement>(
  set: SelectorSet,
  root: ParentNode = document,
): T[] {
  for (const selector of set) {
    const els = root.querySelectorAll<T>(selector);
    if (els.length) return Array.from(els);
  }
  return [];
}

/** True when any candidate matches. */
export function exists(set: SelectorSet, root: ParentNode = document): boolean {
  return qs(set, root) !== null;
}

// -------------------------------------------------------------------- registry

export const SELECTORS = {
  /** App shell — present on every page. */
  app: {
    root: [ "#root" ],
    /**
     * The scrolling content area, where the settings overlay mounts.
     *
     * `main` is semantic HTML and there is exactly one. The previous anchor,
     * `#root > div > div:nth-of-type(2)`, resolves on v2 to an empty
     * zero-height trailing div — so the overlay mounted in the wrong place and
     * the hide-page-content logic hid nothing.
     */
    contentRoot: [ "main", "[role='main']" ],
    navigation: [
      "[data-slot='navigation']",
      "nav[aria-label='Main navigation']",
      "#root .navigation",
    ],
    /**
     * Hook autodarts v1 emits specifically so extensions can inject into the
     * user menu. NOT present on any captured v2 page — see the migration map;
     * this is worth raising with the autodarts team rather than working around.
     */
    userMenuExtra: [ ".ad-ext-user-menu-extra" ],
    /** Logged-in user's name. v1 emits an explicit hook class for this. */
    userName: [
      "[data-slot='avatar'] ~ * p",
      ".ad-ext-player-name",
    ],
    userMenuButton: [
      "button[aria-label='Open user menu']",
      "button[aria-label='Open menu']",
    ],
    notificationsButton: [ "button[aria-label='Open notifications']" ],
  },

  /**
   * User drawer — the panel behind the avatar in the header.
   *
   * Ported to v2, so these carry no v1 candidates. Anchors are `data-slot`
   * (shadcn/ui stamps one on every primitive) and routes, both of which survive
   * class and layout changes. Do not add index-based selectors here: one extra
   * drawer entry would shift every index and silently retarget us.
   */
  drawer: {
    /** The `role="list"` wrapper holding every drawer entry. */
    itemGroup: [ "[data-slot='item-group']" ],
    /** Any entry in the drawer, link or button. */
    item: [ "[data-slot='item']" ],
    /** Entries that navigate — these come before the action buttons. */
    linkItems: [ "a[data-slot='item']" ],
    /** We insert directly after this one. */
    legalItem: [ "a[data-slot='item'][href='/legal']" ],
    /** Icon slot within an entry. */
    itemMedia: [ "[data-slot='item-media']" ],
    /** Entry label. */
    itemTitle: [ "[data-slot='item-title']" ],
    /** Optional subtitle (the Upgrade entry has one). */
    itemDescription: [ "[data-slot='item-description']" ],
    /** Opens the drawer. */
    trigger: [ "[data-slot='drawer-trigger']", "button[aria-label='Open user menu']" ],
  },

  /** Lobby list and lobby detail — entrypoints/lobby.content. */
  lobby: {
    /** Rows in the lobby's player table. */
    playerRows: [
      // TODO(v2): confirm on a live v2 lobby
      "#root > div > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) table > tbody > tr",
    ],
    /** Player name within a lobby row (query relative to the row). */
    playerNameInRow: [
      // TODO(v2)
      "td:nth-of-type(2) > span > div p",
    ],
    /** Container holding the lobby action buttons (Start, Leave, ...). */
    actionButtons: [
      // TODO(v2)
      "#root > div > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div:last-of-type",
    ],
    /** Per-row reorder controls, relative to a row. */
    movePlayerUp: [ "button:nth-of-type(1)" ],
    movePlayerDown: [ "button:nth-of-type(2)" ],
  },

  /**
   * New-lobby / game-mode screens — entrypoints/lobbynew.content.
   * Route moved: v1 /lobbies/new/<variant>  ->  v2 /play
   */
  lobbyNew: {
    settingsContainer: [
      // TODO(v2)
      "#root > div > div:nth-of-type(2)",
    ],
    variantCards: [
      "[data-slot='card']",
    ],
  },

  /**
   * In-match screen — entrypoints/match.content, the largest feature surface.
   *
   * Every v2 entry here is unverified: capturing the match DOM needs a live
   * match, which the snapshot tooling cannot start on its own. Run
   * `./scripts/dev-chrome.sh`, start a match, and fill these in.
   */
  match: {
    /** autodarts-emitted hooks on the match screen (v1). */
    playerDisplay: [ "#ad-ext-player-display" ],
    turn: [ "#ad-ext-turn" ],
    gameVariant: [ "#ad-ext-game-variant" ],
    playerCards: [ ".ad-ext-player" ],
    playerName: [ ".ad-ext-player-name" ],
    playerScore: [ ".ad-ext-player-score" ],
    playerWinner: [ ".ad-ext-player-winner" ],

    /** Top menu bar of the match view. */
    menuBar: [
      // TODO(v2)
      "#root > div > div:nth-of-type(2) > div .chakra-wrap",
      "#root > div > div:nth-of-type(2) > div > div > div > div:last-of-type",
    ],
    /** The whole menu block, hidden by the HideMenu feature. */
    menu: [
      // TODO(v2)
      "#root > div > div",
    ],
    /** Legs/sets counters inside a player card (query relative to the card). */
    legsSetsSpans: [
      // TODO(v2)
      ".chakra-stack span",
    ],
  },

  /** Boards page — entrypoints/boards.content. */
  boards: {
    boardRows: [
      "[data-slot='card']",
      // TODO(v2): verify; v1 used a structural chain
      "#root > div > div:nth-of-type(2)",
    ],
  },

  /** Login form — used by the capture tooling, and stable on both sites. */
  auth: {
    email: [ "#emailOrUsername", "input[autocomplete='username']" ],
    password: [ "#password", "input[autocomplete='current-password']" ],
    submit: [ "button[type='submit']" ],
  },
} as const satisfies Record<string, Record<string, SelectorSet>>;

// ------------------------------------------------------------------ site routes

/**
 * Route patterns, which also changed in the rebuild. The extension currently
 * hardcodes v1 paths in several entrypoints (see docs/v2-migration-map.md).
 */
export const ROUTES = {
  v1: {
    lobbyList: /\/lobbies$/,
    lobbyDetail: /\/lobbies\/(?!.*new\/)([0-9a-f-]+)/,
    lobbyNew: /\/lobbies\/new\//,
    match: /\/matches\/([0-9a-f-]+)/,
    boards: /\/boards/,
    settings: /\/settings/,
  },
  v2: {
    // v2 collapses the per-variant new-lobby routes into a single /play picker.
    lobbyNew: /\/play$/,
    tournaments: /\/tournaments/,
    statistics: /\/statistics/,
    subscriptions: /\/subscriptions/,
    // TODO(v2): lobby detail and match routes are not yet known — they are
    // created dynamically and need a live session to observe.
  },
} as const;
