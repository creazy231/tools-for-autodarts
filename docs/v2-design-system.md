# autodarts v2 design system

Measured from the live site on 2026-08-13, not guessed. Regenerate the raw data
with:

```bash
node scripts/analyze-v2-design.mjs     # -> snapshots/v2/design-tokens.json
```

Use this whenever building extension UI that has to sit inside v2. The
extension defines its own `--adt-*` aliases on top of these (see
`assets/tailwind.css`) — prefer those in components, so a rename on autodarts'
side is a one-line fix here rather than a sweep.

---

## 1. Colour

v2 is dark-only. There is no light theme to support.

### Surfaces

| token | value | used for |
|---|---|---|
| `--background` | `#01040b` | page background (also `bg-black-90`) |
| `--card` / `--card-alt` | `#1b1f29` | cards, panels, tiles (also `bg-black-85`) |
| `--surface-surface` | `#16181c` | slightly darker inset panels (`bg-black-80`) |
| `--drawer` | `#0a0a23` | **drawers and modals** — not `--card` |
| `--popover` | `oklch(20.5% 0 0)` | popovers |
| `--state-disabled` | `#292c33` | disabled fills (`bg-black-70`) |

The neutral ramp, resolved: `black-90 #01040b` → `black-85 #1b1f29` →
`black-80 #16181c` → `black-70 #292c33` → `black-60 #4d525d` →
`black-50 #707580` → `black-20 #cacfd9`.

Note `black-80` is *darker* than `black-85`; the scale is not monotonic.

### Text

| token | value | used for |
|---|---|---|
| `--foreground` | `oklch(98.5% 0 0)` ≈ `#fafafa` | primary text |
| `--muted-foreground` | `oklch(70.8% 0 0)` ≈ `#b4b4b4` | secondary text, captions |
| `text-mono-white` | `#ffffff` | pure white, used sparingly |

### Accent and state

| token | value | used for |
|---|---|---|
| `--secondary` | `#0b55df` | the brand blue — primary action colour |
| `--outline-high` | `#0b55df` | focused outline |
| `--outline-mid` | `#374c9899` | resting outline |
| `--state-secondary-hovered` | `#003eb3` | hovered blue |
| `--state-outline-hovered` | `#0b55df` | hovered outline |
| `--primary` | `#f7f8fa` | inverted (light) button fill |
| `--primary-foreground` | `#16181c` | text on light fill |

### System

| token | value |
|---|---|
| `--system-success` | `#49da9e` |
| `--system-warning` | `#f7d458` |
| `--system-error` | `#da3954` |
| `--destructive` | `oklch(70.4% .191 22.216)` |

### Borders

Borders are **very** low contrast — mostly translucent white:

| utility | value |
|---|---|
| `--border` / `border-foreground/10` | `rgba(255,255,255,0.10)` |
| `border-mono-white/6` | `rgba(255,255,255,0.06)` |

## 2. Typography

Two families, and the distinction matters:

| utility | family | used for |
|---|---|---|
| `font-display` | **Bebas Neue**, fallback Manrope | section headings (`h2`), condensed caps |
| `font-sans` / `font-heading` / `font-mono` | **Manrope Variable** | everything else |

`font-heading` is *not* the display font — it resolves to Manrope. Only
`font-display` gives Bebas Neue.

Observed scale:

| element | size | weight | line-height |
|---|---|---|---|
| `h1` page title (`text-3xl`) | 30px | 400 | 37.5px |
| `h2` section (`font-display text-2xl`) | 24px | 700 | 28.8px |
| body | 18px | 500 | 21.6px |
| card body (`text-sm`) | 14px | 500 | — |
| button | 12px | 700 | 16px |

Buttons are small and heavy (12px/700); body text is large (18px/500).

## 3. Radii

`--radius` is `.625rem` (10px). The scale resolves to:

| utility | value |
|---|---|
| `rounded-sm` | 6px |
| `rounded-md` | 8px |
| `rounded-lg` | 10px |
| `rounded-xl` | 14px |
| `rounded-2xl` | 18px |
| `rounded-3xl` | 22px |

Cards use `rounded-2xl` (18px); modals use `rounded-xl` (14px).

## 4. Surface patterns

Four distinct patterns, measured. Match one rather than inventing a fifth.

### A. Content card — the default

Used for statistics panels and tournament cards.

```
background : var(--card)            #1b1f29
radius     : 18px                   rounded-2xl
padding    : 24px                   p-6      (tournament cards: py-5, px-0)
gap        : 16–24px                gap-4 / gap-6
border     : none
shadow     : inset 0 -0.5px 0 0 rgba(255,255,255,0.08)
text       : 14px / 500, var(--card-foreground)
```

The **inset bottom highlight instead of a border** is the signature of v2's
cards. There is no drop shadow.

### B. Selectable tile — `/play` game modes

```
background : var(--card)            bg-black-85
radius     : 12px                   rounded-[12px]
padding    : 20px 16px              px-4 py-5
gap        : 12px                   gap-3
border     : 1px rgba(255,255,255,0.06)
hover      : linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0.05))
transition : yes
align      : text-left
```

Note tiles *do* carry a border where cards do not, and hover is a **5% white
overlay** rather than a colour change.

### C. Modal / drawer

From the "Online" dialog in the top nav:

```
background : var(--drawer)          #0a0a23
radius     : 14px                   rounded-xl
edge       : ring-1 ring-foreground/10   (a ring, not a border)
gap        : 16px                   gap-4
size       : max-w-2xl, max-h-[85vh], overflow-hidden
position   : fixed, centred via top/left 50% + -translate-1/2
animation  : data-open:animate-in / data-closed:animate-out, fade + zoom
```

### D. Highlighted / promo card

```
background : #16181c                bg-black-80
radius     : 14px                   rounded-xl
border     : 1px solid <accent>     e.g. #8b5e00 for the gold upgrade card
padding    : 24px
shadow     : 0 2px 2px rgba(13,13,13,0.5)
```

## 5. Component slots

v2 is shadcn/ui, so every primitive carries `data-slot`. Observed:

`avatar`, `avatar-image`, `button`, `card`, `card-content`, `chart`,
`drawer-trigger`, `drawer-popup`, `drawer-section`, `drawer-viewport`, `field`,
`field-group`, `field-label`, `input`, `item`, `item-group`, `item-media`,
`item-title`, `item-description`, `popover-trigger`, `table`, `table-body`,
`table-cell`, `table-container`, `table-head`, `table-header`, `table-row`,
`tabs`, `tabs-list`, `tabs-trigger`, `toggle-group`, `toggle-group-item`

These are the **stable anchors** for selectors — see
`utils/selectors.ts`. Never anchor on the Tailwind classes next to them.

## 6. Applying this to extension UI

The extension's own tokens live in `assets/tailwind.css` as `--adt-*`, each
mapped to a v2 token with a fallback so the UI still renders if autodarts
renames something:

```css
--adt-surface: var(--card, #1b1f29);
```

Rules of thumb when building extension UI for v2:

- Panels → pattern **A**. Interactive/selectable things → pattern **B**.
- Never use a drop shadow on a card; use the inset highlight.
- Section headings get `font-display`; everything else Manrope.
- Borders are barely visible — 6–10% white, never a solid grey.
- Buttons are 12px/700, not 14px/500.
- Blue `#0b55df` is the only accent. Use `--system-*` for status, nothing else.
