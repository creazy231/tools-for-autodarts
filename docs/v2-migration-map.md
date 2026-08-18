# autodarts v1 → v2 migration map

Working document for adapting the extension to the rebuilt autodarts site.

- **v1** — `https://play.autodarts.com` — Chakra UI + Emotion. Being retired.
- **v2** — `https://play-v2.autodarts.com` — Tailwind + shadcn/ui on Base UI. The target.

Everything below was verified against live captures on 2026-08-13, not inferred.
Snapshots live in `snapshots/` (11 v1 pages, 7 v2 pages).

---

## 1. What actually changed

| | v1 | v2 |
|---|---|---|
| Component layer | Chakra UI | shadcn/ui on Base UI |
| Styling | Emotion (`css-1oha1tj`) | Tailwind utilities |
| Design tokens | `--chakra-*` | 104 semantic vars (see §3) |
| Stable anchors | almost none | `data-slot` on every primitive |
| Element ids | React-generated (`field-:r0:`) | real ids (`#emailOrUsername`) |
| Icons | Chakra icons | FontAwesome Pro (`--fa-font-*`) |

`hasChakraClasses` is **false** on every captured v2 page. This is a rewrite, not a reskin.

## 2. Route changes

| Purpose | v1 | v2 |
|---|---|---|
| Home | `/` | `/` |
| Lobby list | `/lobbies` | *(folded into `/play`)* |
| New lobby | `/lobbies/new/<variant>` | `/play` (single game-mode picker) |
| Lobby detail | `/lobbies/<uuid>` | **unknown** — needs a live lobby |
| Match | `/matches/<uuid>` | **unknown** — needs a live match |
| Boards | `/boards` | `/boards` — labelled "Devices", in the user drawer |
| Camera | `/camera` | **not found** |
| Settings | `/settings` | `/settings` (redirects to `/settings/general`), in the user drawer |
| Account | — | `/account`, in the user drawer |
| Legal | `/legal/tos`, `/legal/privacy` | `/legal`, in the user drawer |
| History | `/history/matches` | *(likely under `/statistics`)* |
| Tournaments | `/tournaments` | `/tournaments` |
| Statistics | `/statistics` | `/statistics` |
| Subscription | `/subscribed`, `/plus` | `/subscriptions`, `/redeem` |

v2 adds a **Killer** game mode that v1 does not have.

Route detection is currently hardcoded across entrypoints and all of it assumes v1:

- `entrypoints/lobby.content/index.ts` — `/\/lobbies\/(?!.*new\/)/`
- `entrypoints/lobbynew.content/index.ts` — `/\/lobbies\/*new\//`
- `entrypoints/boards.content/index.ts` — `url.endsWith("/boards")`
- `entrypoints/content/index.ts` — `/tools`, `/settings`
- `utils/websocket-helpers.ts` — `/lobbies\/(id)/`, `/matches\/(id)/`, `/boards\/(id)/`
- `wxt.config.ts` — `matches: ["*://play.autodarts.com/*"]` did **not** cover
  `play-v2` (fixed; the extension now loads there)

Confirmed empirically with `node scripts/inspect.mjs`: on v2 the content scripts
**do** run — the extension's own console logging fires — but nothing mounts. The
logs are all teardown (`Clearing match`, `Restoring menu in match`,
`Cleaning up automatic fullscreen`), i.e. the route-gated mount logic never
matches, so every feature immediately tears itself down. Route detection is
therefore the first thing to fix, before any selector work.

## 3. Design tokens — the silent breakage

The extension styles its own injected UI with Chakra custom properties so it
blends into the host page. There are **135 such references across source**.
None of them resolve on v2, and CSS custom properties fail *silently* — no
console error, just unstyled panels.

v2 ships a richer token set (104 vars). Suggested mapping:

| Extension uses (v1) | v2 equivalent |
|---|---|
| `--chakra-colors-white` | `--foreground` |
| `--chakra-colors-glass` | `--surface-surface`, `--card` |
| `--chakra-colors-border` | `--border`, `--outline-mid` |
| `--chakra-radii-md` | `--radius` |
| `--chakra-space-*` | Tailwind spacing utilities |
| `--chakra-blur-sm` | Tailwind `backdrop-blur-sm` |
| `--chakra-colors-blue-*` | `--primary` |
| `--chakra-colors-yellow-*` | `--system-warning` |
| *(none)* | `--system-error`, `--system-success` |
| *(none)* | `--surface-container-{primary,accent,tertiary,quaternary}` |

Full v2 token list: `snapshots/v2/home.probe.json` → `cssVars`.

**Recommended approach**: define the extension's own token aliases once, instead
of substituting 135 call sites individually.

**Confirmed live on v2** (2026-08-13), with the settings overlay open:

```
--chakra-colors-white : (unset)      --background : #01040b
--chakra-colors-glass : (unset)      --card       : #1b1f29
--chakra-radii-md     : (unset)      --foreground : oklch(98.5% 0 0)

.adt-container background-color : rgba(0, 0, 0, 0)   <- transparent
.adt-container color            : rgb(0, 0, 0)       <- black on a dark page
```

So the overlay opens and functions, but renders effectively unstyled. This is
the next piece of work after the nav entry, and it is the single change that
makes the extension *look* ported rather than merely work.

## 4. Integration hooks — raise with the autodarts team

autodarts v1 emits `ad-ext-*` hooks that look deliberately provided for this
extension. Confirmed present in the raw v1 DOM with no extension loaded:

- `ad-ext-user-menu-extra` — an injection point in the user menu
- `ad-ext-player-name`

The match screen additionally uses `#ad-ext-player-display`, `#ad-ext-turn`,
`#ad-ext-game-variant`, `.ad-ext-player`, `.ad-ext-player-score`,
`.ad-ext-player-winner` — unconfirmed because capturing them needs a live match.

**Neither hook appears on any captured v2 page.** Asking the autodarts owners to
keep emitting `ad-ext-*` hooks in v2 is far cheaper than re-deriving every anchor,
and it is the single highest-leverage conversation available here.

## 5. Selector damage, ranked

Source-only counts (the `Tools for Autodarts/Shared (Extension)/` bundles are
stale build artifacts and were excluded).

| | count |
|---|---|
| DOM selector call sites | 140 |
| ...targeting the extension's own injected DOM (safe) | 43 |
| ...targeting the autodarts DOM (at risk) | **~97** |
| Files using `nth-of-type` / `nth-child` chains | 10 |
| Files driven by WebSocket game data (largely immune) | 28 |

**Worst offenders** — these cannot survive any redesign:

```
#root > div > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) table > tbody > tr
#root > div > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div:last-of-type
td:nth-of-type(2) > span > div p
#root > div > div > .chakra-stack
```

**Files carrying the most risk**, in order:
`winner-animation.ts` · `Zoom.vue` · `hide-menu-in-match.ts` ·
`automatic-fullscreen.ts` · `color-change.ts` · `StreamingMode.vue` ·
`sound-fx.ts` · `caller.ts`

**Files that need no work** (zero site selectors, WebSocket-driven):
`wled.ts` · `smaller-scores.ts` · `discord-stream.ts`

## 6. The v2 anchor vocabulary

What v2 gives us to anchor on — this is a large improvement over v1.

**`data-slot` values observed:** `avatar`, `avatar-image`, `button`, `card`,
`card-content`, `chart`, `drawer-trigger`, `field`, `field-label`,
`popover-trigger`, `table`, `table-body`, `table-cell`, `table-container`,
`table-head`, `table-header`, `table-row`, `tabs`, `tabs-list`, `tabs-trigger`

The table slots matter most: `[data-slot='table-row']` and
`[data-slot='table-cell']` replace the lobby player-table chains outright.

**`aria-label` values observed:** `Autodarts`, `Main navigation`,
`Open user menu`, `Open notifications`, `Notifications alt+T`, `View match stats`,
`AUTODARTS+`

**Never anchor on:** `.chakra-*` (gone), `.css-*` (Emotion hashes),
`#base-ui-_r_6_` / `#_r_h_` (Base UI generates these per render).

## 7. How to migrate a feature

1. `yarn dev` — builds the dev extension, serves hot reload on `:3000`, and
   opens Chrome with that build loaded and CDP on `:9222`. Playwright and the
   MCP servers attach to this same browser, so what you debug is what your
   edits hot-reload into.
2. Log in once; the profile persists in `.chrome-profile-dev/`.
3. `node scripts/inspect.mjs --url=<route>` to confirm the extension actually
   injected there, and see what it logged.
4. Navigate to the screen the feature touches.
5. Find the v2 anchor with the **DOM picker**: `Alt+Shift+P`, click the element
   (`↑` to widen to the container you meant), `C` to copy. The report ranks
   selector candidates by durability, lists the ancestors you can scope to, and
   names the `file:line` of extension code already targeting it. Do the same on
   v1 and hand both to Claude Code. See `scripts/README.md`.
6. **Prepend** the v2 candidate to the entry in `utils/selectors.ts`; keep the v1
   candidate last so one build serves both sites.
7. Replace the inline literal at the call site with the registry entry.
8. Verify on both sites, then update `README.md` if behaviour changed.

Re-capture snapshots any time with `node scripts/capture-dom.mjs --site=v2`.

## 8. Open blockers

- **The in-match DOM is uncaptured.** It is the biggest feature surface
  (20+ features) and needs a live match to inspect. The capture tooling cannot
  start one on its own.
- **Lobby detail DOM is uncaptured** for the same reason.
- **Boards / camera / settings routes were not found in v2** — either not built
  yet, or moved somewhere the crawl did not reach.
- **`wxt.config.ts` does not match `play-v2.autodarts.com`**, so the extension
  does not currently load on v2 at all. This is the first code change required.
