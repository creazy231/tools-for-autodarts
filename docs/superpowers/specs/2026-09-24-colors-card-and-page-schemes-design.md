# Colors: colour pairs for the player card and the page

**Date:** 2026-09-24
**Status:** approved in advance: the user asked for the work to be done without questions, so the choices below are the design's own and are listed for review afterwards

## The request

FankiDarts (the userscript at `scripts/FankiDarts for Autodarts V2.js`, v12.2.29)
lets you recolour the *Playerbox*: the card of the player whose turn it is. It
offers autodarts' own look, six colour pairs and a custom pair from two
pickers, with a strip that previews the gradient. The request is the same for
our **Colors** feature, with a preview that looks like a real player card. If
it can be done, the same goes for the page background, keeping the textures the
card and the page carry.

## What the site draws (read from its CSS and `use-game-*.js`, checked live)

- **The active player** is marked by one utility, `bg-raspberry-slush-diagonal`:
  `linear-gradient(to bottom right, fushia-80 #75148b, red-60 #da3954)`, a
  `background-image` over a transparent colour. The score card uses it in all
  three layouts: `ScoreBox` (wide), `SmallScoreBox` (sidebar and top bar), the
  wrapper round the carousel of a 3+ player top bar, `PlayerCell` (cricket and
  the like), `ActiveChip` and `StatusPill`. Nothing else in the match chunk uses
  it, so recolouring that class inside `#root main` recolours exactly "whose
  turn it is".
- **The other states:** idle cards are `bg-black-80` (`#16181c`), or `bg-black-60`
  in the small layouts. A bust is `bg-grey-slush-diagonal` plus a Lottie
  `BustOverlay`, and a won leg is `bg-game-shot-diagonal` plus `GameShotPattern`.
  tailwind-merge drops `bg-black-80` whenever a gradient class is present, so
  `.bg-black-80`/`.bg-black-60` on a card face means "idle" and nothing else.
- **Card textures:** only the winner's card has one, and it is an inline `<svg>`
  child (`GameShotPattern`, `-z-10` in an `isolate` card), not a background layer.
  A background override cannot touch it. The active card has no texture.
- **The page:** `body` (in `@layer base`) paints the whole screen:
  `background-color: black-90`, and two layers, both `contain`, `0 100%`,
  `no-repeat`, `fixed`:
  1. a data-URI SVG of the autodarts mark, `fill='#003EB3'` at `fill-opacity 0.15`,
     which is the texture;
  2. `var(--background-image-midnight-diagonal)` =
     `linear-gradient(to bottom right, black-90 #01040b, blue-90 #001849)`.

  The mark is the gradient's end colour at the same hue and saturation, about
  2.45× as light (blue-90 L 14% → blue-70 L 35%).
- **The site's own named palettes** (`player-colors-*.js`): raspberrySlush,
  blueberryBlast, limeTime, orangeSlice, sunshineJuice, midnight, skyEmerald,
  oceanBlue, ghost, each a `gradientFrom`/`gradientTo` pair.

**Tested live** (a bot match in the dev browser, a stylesheet injected by hand,
all three layouts):
- a gradient on `#root main .bg-raspberry-slush-diagonal` recolours the active card
  in every layout and survives the re-render on each dart;
- replacing only the gradient layer of `body` keeps the texture;
- re-tinting the texture to a lighter shade of the new colour, the site's own
  2.45× rule, looks native, where the original blue on green did not.

So both halves of the request are possible.

## Decisions

1. **The card colour goes on the active card only**, as in FankiDarts. The bust and
   winner states stay autodarts' own: they are signals, and the winner's pattern
   is kept whatever the colour.
2. **Two colour schemes, each with presets and a custom pair:** *Player card* and
   *Background*. A scheme is `{ preset, from, to }`. `preset` is `"default"`
   (autodarts' own, nothing drawn), a preset id or `"custom"`. `from`/`to` always
   hold the colours that scheme shows, so the match screen never has to look a
   preset up, and a stored choice survives a later change to the preset list.
   Picking a preset copies its colours in, and editing a picker from there makes
   the scheme custom, starting from those colours, as FankiDarts does.
3. **Separate preset lists.** A card has to carry white text and stand out from
   the dark idle cards, and a page has to stay dark behind everything. So the
   card presets are the site's palettes and FankiDarts-style muted pairs, kept to
   autodarts' own contrast bar: at least 4:1 against the card's text at both ends
   (raspberry's bright end is 4.2:1), and at least 2.5:1 between the bright end and
   the idle card, so it is never mistaken for one. The bright end is also a
   colour, never a grey (saturation 0.3 or more): with 3+ players the small
   layouts' resting cells are black-60, a mid grey that nothing carrying white type
   can out-contrast, so hue is what separates the active one there.
   The page presets are "black-90 to a deep colour", like the site's midnight.
4. **The texture stays and follows the colour.** The page rule reads the site's
   own `body` rule from the CSSOM (never the computed style, which can be ours),
   takes the SVG layer and re-tints its fills to a lighter shade of `to`. If the
   rule cannot be read, it sets only `--background-image-midnight-diagonal` on
   `body`, which keeps the site's texture as it is.
5. **The page background can go site-wide.** It follows the match screen by
   default, as Colors always has, and an *Everywhere* switch puts it on every
   autodarts page, the settings page included, where it updates live.
6. **The flat colours remain,** each empty meaning "autodarts' own", with a reset:
   *Other cards and throw bar* (the old `background`), *Text* and *Bottom bar*.
   Switching Colors on changes nothing until something is picked.
7. **The preview is a miniature match screen:** the page with its texture, the throw
   bar, the board (in the Board Skins skin when that is on), an active and an idle
   card copied from the site's own markup, and the bottom bar. Every setting in
   the panel shows up in it as it is changed.

## Config (`IConfig.colors`, storage v13)

```ts
colors: {
  enabled: boolean;
  card: ColorScheme;     // active player
  page: ColorScheme;     // background
  everywhere: boolean;   // page background on every autodarts page
  cards: string;         // idle cards + throw bar, "" = autodarts'
  text: string;          // "" = autodarts'
  actionBar: string;     // "" = autodarts'
}
interface ColorScheme { preset: string; from: string; to: string }
```

**Migration** from `{ enabled, background, text, matchBackground, actionBar }`,
keeping what the match screen shows:
- Colors **on**: everything it drew was the user's choice, defaults included.
  `background` becomes `cards` and a flat custom card scheme (it painted every
  card, the active one too), `matchBackground` becomes a flat custom page scheme
  (which now keeps the texture, the one visible change and the one asked for),
  and `text` and `actionBar` carry over.
- Colors **off**: nothing was on screen, so only values that differ from the old
  defaults (`#3182CE`, `#FFFFFF`, `#3c3c3c`, `#042963`) count as choices and carry
  over. Values still at those defaults start from the new "autodarts' own".

The same `normalizeColors()` runs in the migration, when the settings page
adopts a config, on import and paste (both merge an export over the defaults
without migrating it), and in the content scripts. So an old-shaped `colors`
from any of those paths is read correctly and never crashes the UI. It also
accepts only `#rrggbb`, since the values end up in a stylesheet.

## Files

- `utils/colors.ts` (new, pure, testable with tsx): presets, `normalizeColors`,
  `textureTint`, `tintSvgFills`, `colorStyles(colors, texture)` building the CSS.
- `utils/page-background.ts` (new): `siteTexture()` read from the CSSOM, and the
  site-wide applier for the `content` entrypoint.
- `utils/storage.ts`: interface, defaults, v13 migration.
- `utils/selectors.ts`: `activeHighlight`, `idleCard`.
- `entrypoints/match.content/color-change.ts`: builds from `colorStyles`.
- `entrypoints/content/index.ts`: starts the site-wide applier.
- `composables/useConfig.ts` and `components/PageConfig.vue` (import and paste): normalise.
- `components/Settings/Colors.vue`, plus `Colors/SchemePicker.vue` and
  `Colors/ColorsPreview.vue` (new).
- `README.md`, `CHANGELOG.md`.

## Testing

- tsx checks for `utils/colors.ts`: the migration table, validation, the tint
  (it must reproduce blue-90 → blue-70), CSS for each switch and fallback.
- Dev browser: a bot match in every layout (1600, 1100 and 600 px), default,
  presets, custom and the old-config migration, the busted and winning card, the
  texture kept and tinted, *Everywhere* on the settings page and a lobby, and the
  preview checked against the real screen.
- `yarn compile` against the 16-error baseline, and `yarn build`, which catches
  the tree-shaking breakage `yarn dev` hides.

## Not doing

- Recolouring the bust and winner states, or a per-player colour.
- A light theme: text colours for a light page are the user's to pick.
- FankiDarts' header border and lower-bar styling, which are separate features of theirs.
