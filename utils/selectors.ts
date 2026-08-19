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
 *   waitForElement(SELECTORS.app.contentRoot)   // takes string[] natively
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

/**
 * querySelectorAll narrowed to elements whose trimmed text is one of `texts`.
 *
 * For the handful of v2 controls that carry no data-slot, id or aria-label of
 * their own — Start Game is the notable one. Comparison is case-insensitive,
 * but this is still the one kind of selector a language switch breaks, so reach
 * for it only when the markup offers nothing better.
 */
export function qsaText<T extends Element = HTMLElement>(
  set: SelectorSet,
  texts: SelectorSet,
  root: ParentNode = document,
): T[] {
  const wanted = texts.map(t => t.toLowerCase());
  return qsa<T>(set, root).filter(el => wanted.includes((el.textContent ?? "").trim().toLowerCase()));
}

/** First match of {@link qsaText}. */
export function qsText<T extends Element = HTMLElement>(
  set: SelectorSet,
  texts: SelectorSet,
  root: ParentNode = document,
): T | null {
  return qsaText<T>(set, texts, root)[0] ?? null;
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

  /** Lobby detail — entrypoints/lobby.content. */
  lobby: {
    /**
     * The site's own Shuffle button, in the "Players" card header.
     *
     * The only button that is a direct child of a card header on the lobby
     * page, which makes this pair of data-slots unique without touching text
     * or an index. Text is not usable: the site ships a language switcher, so
     * "Shuffle" and "Players" are not stable anchors.
     */
    shuffleButton: [ "[data-slot='card-header'] > button[data-slot='button']" ],

    /**
     * The header row that button lives in — also the lobby's "am I rendered
     * yet" signal. The v2 lobby has no h1/h2/h3 at all, so the old
     * `waitForElementWithTextContent("h2", "Lobby")` gate never resolved.
     */
    playersCardHeader: [ "[data-slot='card-header']:has(> button[data-slot='button'])" ],

    /**
     * The site's own "Share lobby QR code" button, in the top right corner.
     *
     * Anchored on the data-slot plus the FontAwesome glyph name rather than the
     * aria-label, which the language switcher rewrites.
     */
    siteQrButton: [
      "button[data-slot='popover-trigger']:has([data-icon='qrcode'])",
      "button[aria-label='Share lobby QR code']",
    ],

    /** Body of that same card — the player rows, then Add Player / Add Bot. */
    playersCardContent: [
      "[data-slot='card']:has(> [data-slot='card-header'] > button[data-slot='button']) > [data-slot='card-content']",
    ],

    /**
     * The Start Game button at the foot of the lobby.
     *
     * Text is the only anchor available — it carries no distinguishing
     * data-slot, id or aria-label — so it has to be matched with
     * `waitForElementWithTextContent`, which a language switch breaks. Worth
     * asking autodarts for a hook; see docs/v2-migration-map.md.
     */
    startGameButton: [ "button[data-slot='button']" ],
    startGameText: [ "Start Game" ],

    /**
     * The player counter chip beside the "Players" title, e.g. "2/6".
     *
     * Digits and a slash, so reading a count out of it survives the language
     * switcher. Scoped to the players card header so the other cards' headers
     * cannot answer instead.
     */
    playerCountChip: [ "[data-slot='card-header']:has(> button[data-slot='button']) > span" ],

    /**
     * Rows in the lobby's player list.
     *
     * v2 renders each row as a drag-and-drop item; dnd-kit stamps
     * `aria-roledescription="sortable"` on the grab handle, which is the only
     * attribute in the row that is not a Tailwind class.
     */
    playerRows: [
      "[data-slot='card-content'] div:has(> [aria-roledescription='sortable'])",
      "#root > div > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) table > tbody > tr",
    ],
    /** Player name within a lobby row (query relative to the row). */
    playerNameInRow: [
      "span.font-display",
      "td:nth-of-type(2) > span > div p",
    ],

    /**
     * Per-row controls, queried relative to a player row.
     *
     * The buttons carry no data-slot of their own beyond the generic `button`,
     * but FontAwesome stamps `data-icon` on the glyph it renders, which names
     * the action without depending on a class or a position. The board button
     * is v1's "Use my board"; the site disables it while that player is already
     * playing here.
     */
    playerBoardButton: [ "button[data-slot='button']:has([data-icon='house'])" ],
    playerRemoveButton: [ "button[data-slot='button']:has([data-icon='xmark'])" ],
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
   * Entries still marked TODO(v2) are unverified: they belong to features that
   * have not been ported yet. The ones below them were filled in from a live
   * X01 match on the rebuilt site.
   */
  match: {
    /**
     * The square block holding the dartboard, or the board camera view when a
     * board is attached. This is what Animations covers in "board only" mode.
     *
     * v1's equivalent was `#ad-ext-turn`'s next sibling, narrowed to the
     * `.showAnimations` element the old site rendered around the board image.
     * The rebuilt match screen emits neither, so both anchors below are ours:
     * the site's own aria-label first, then the single square block in `main`,
     * which is the same element one level out.
     */
    boardArea: [
      "main [role='img'][aria-label='Dartboard']",
      "main div.aspect-square",
    ],

    /**
     * The dartboard itself — four stacked inline SVGs, not an image.
     *
     * Layer 0 is the segments, 1 and 2 the printed artwork, 3 the hit
     * highlight. Cloning the lot costs well under a millisecond, so Darts Zoom
     * takes a copy per dart rather than trying to be clever about layers.
     */
    board: [ "main [role='img'][aria-label='Dartboard']" ],

    /**
     * One per player: the whole flanking column, score card plus chalkboard.
     *
     * v1 marked these `.ad-ext-player`. The rebuilt screen emits no hook, so
     * the anchors are the column's own width class first and its shape second
     * — the only element whose grandchild is the rounded score card.
     */
    playerCards: [
      "main div.w-100",
      "main div:has(> div > div.rounded-t-2xl)",
    ],
    /**
     * The box whose height decides how big the board is drawn — the same
     * element in every layout the site has, and the only one that works.
     *
     * It is `position: absolute` and the board is sized from it, so pulling one
     * edge in shrinks the board and moves it off that edge. Its own child, the
     * flex box that centres the board, does not: shrink that and the square
     * simply overflows it, moving without getting any smaller.
     *
     * Named by the path down to the board rather than by class, since the
     * wide-screen layout reaches it through a grid and the narrow ones through
     * a flex column.
     */
    boardStage: [ "main div:has(> div.absolute.inset-0 > div > [role='img'][aria-label='Dartboard'])" ],

    /** The score card within a player column — the part that carries colour. */
    playerScoreCard: [ "div.rounded-t-2xl > div" ],
    /** Whose turn it is: the site paints that one card with its gradient. */
    activePlayerCard: [ "main div[class*='bg-raspberry']" ],
    /** Player name, relative to a card. */
    playerName: [ "span.font-display" ],
    /**
     * The remaining score, relative to a card.
     *
     * Fixed height with `overflow-hidden`, so anything that grows the type here
     * has to grow the line box with it or the digits are clipped.
     */
    playerScore: [ "div.font-number.font-bold" ],
    /** Legs (or sets) won, the small boxed number beside the score. */
    playerLegsSets: [ "div.rounded-sm.size-8" ],
    /** The "Leg 0.0 / Match 0.0" averages row. */
    playerMatchData: [ "div.hidden:has(> div.flex.gap-2)" ],
    /** The site's own checkout route, shown down the side of the card. */
    checkoutSuggestion: [ ".text-checkout-suggestion" ],
    /** Per-player scoring history, under the score card. */
    chalkboard: [ "div.grid-rows-6" ],
    /**
     * The visible card inside a player column, score card plus chalkboard.
     *
     * The column is stretched to the height of the whole row and centres this
     * within it, so anything drawn on the column — a ring, a caption — is
     * anchored to the row rather than to what you can actually see. Query it
     * relative to a card from {@link playerCards}.
     */
    playerCardBody: [ ":scope > div.flex.w-full.flex-col", ":scope > div" ],

    /**
     * The board's own Reset control, which clears a stuck takeout.
     *
     * Text is the only anchor: it appears alongside the camera view and only
     * while a board is attached, so it is absent from every capture taken with
     * a virtual board. Matched case-insensitively via `qsText`, and treated as
     * optional by the one caller — see takeout.ts.
     */
    boardReset: [ "button" ],
    boardResetText: [ "Reset", "Zurücksetzen", "Resetten", "Réinitialiser" ],

    /** Every button on the match screen, for the text fallbacks below. */
    matchButtons: [ "main button", "button" ],

    /**
     * The action bar along the bottom of the match screen — undo and Next sit
     * in it, and the site fills it with a one-off `bg-[#042963]`.
     *
     * Anchored on being the rounded block whose grandchildren are buttons,
     * which is what separates it from the turn bar above the board; the site's
     * own colour is the last resort, being an arbitrary Tailwind value that a
     * palette change would rewrite.
     */
    actionBar: [
      "main div.rounded-2xl:has(> div > button[data-slot='button'])",
      "main div.rounded-2xl:has(button[data-slot='button'])",
      "main div[class*='bg-[#042963]']",
    ],

    /**
     * The primary action in the turn bar — "Next", which ends the current visit.
     *
     * The fill is not the anchor it was taken for: the camera and undo buttons
     * beside it carry the same `bg-blue-60`, and both come earlier in the
     * document, so a bare fill selector returns one of those instead. Next is
     * the only one of the three that is a label rather than a glyph, which is
     * what `:not(:has(svg))` separates out.
     *
     * Its caller tries the label first — see next-player-on-take-out-stuck.ts —
     * so this is the fallback for a language `nextButtonText` does not list.
     */
    nextButton: [
      "main button[data-slot='button'].bg-blue-60:not(:has(svg))",
      "main button.bg-blue-60:not(:has(svg))",
    ],
    nextButtonText: [ "Next", "Weiter", "Volgende" ],

    /**
     * Advances to the next leg once one is won.
     *
     * FontAwesome stamps `data-icon` on the glyph it renders, which names the
     * action without depending on the label — and the label is exactly what the
     * site's language switcher rewrites. The same icon carries the set button,
     * so this finds "Next Set" too.
     */
    nextLegButton: [
      "main button[data-slot='button']:has([data-icon='forward-step'])",
      "main button:has([data-icon='forward-step'])",
    ],
    nextLegButtonText: [ "Next Leg", "Nächstes Leg", "Volgende leg", "Next Set", "Nächstes Set" ],

    /**
     * The bar above the board: three dart slots then the turn total.
     * v1's equivalent was `#ad-ext-turn` and its `.ad-ext-turn-throw` children.
     */
    turnBar: [ "main div.max-w-25" ],
    /**
     * The rounded panel the dart slots sit in.
     *
     * Worth recolouring alongside the slots: it shows in the gaps between them,
     * and the site turns it red on a bust, which reads as broken next to a
     * colour scheme of the user's choosing.
     */
    turnBarPanel: [ "main div.rounded-2xl:has(> div > div.max-w-25)" ],
    /**
     * The three dart slots, in throw order — the ones grouped together to the
     * left of the turn total. Scoping to that group is what separates them
     * from the total, which is a sibling of the group rather than of them.
     */
    dartSlots: [ "main div.justify-evenly > div.max-w-25" ],
    /** The turn total, the slot after the three darts. */
    turnTotal: [ "main div.rounded-2xl > div.max-w-25" ],

    /**
     * The button that cycles what the board shows: camera 1, 2, 3, then the
     * vector board and round again. Its label is the camera number, or empty
     * for the vector board — which is the only way to read the current state,
     * as it carries no aria-label, title or data attribute of its own.
     *
     * A board with fewer cameras has a shorter cycle, so never count on four.
     */
    cameraButton: [ "main button:has([data-icon='camera'])" ],

    /** The match screen's own header — Exit on the left, icons on the right. */
    header: [ "#root header" ],
    /**
     * That header's right-hand icon cluster, where we add our own buttons.
     * The header itself is `pointer-events-none`; this group is what re-enables
     * them, so a button added here is clickable without any styling of ours.
     */
    headerIconGroup: [ "div.pointer-events-auto:has(> button)", "div.flex.items-center.gap-2" ],

    /** autodarts-emitted hooks on the match screen (v1). */
    playerDisplay: [ "#ad-ext-player-display" ],
    turn: [ "#ad-ext-turn" ],
    gameVariant: [ "#ad-ext-game-variant" ],
    playerWinner: [ ".ad-ext-player-winner" ],

  },

  /** Boards page — entrypoints/boards.content. Still at /boards on v2. */
  boards: {
    /**
     * The column holding the page heading and each device section, which is
     * where the extension appends its own.
     *
     * Anchored on the single `h1` in `main` ("My Devices"), so it resolves the
     * same whether or not the account owns a board — a user with none is
     * exactly who wants External Boards.
     */
    pageColumn: [ "main div:has(> h1)" ],
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
