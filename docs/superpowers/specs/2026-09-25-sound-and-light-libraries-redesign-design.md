# Animations, Caller, Sound FX and WLED: one library layout, with search

**Date:** 2026-09-25
**Status:** approved in advance, then reviewed and committed (2026-09-26). The user asked for this to be done with no questions, so the choices below are the design's own and were listed for review afterwards. What the final review changed is at the end, under *After review*

## The request

Redesign the settings dialogs of the four features on the *Sounds & Animations*
tab. They should look less messy, and every function has to stay somewhere.
Add a search that finds items by name and by trigger. Take the look and feel from
the rebuilt autodarts site, and check every change in the yarn dev Chrome.

## What the dialogs are today (measured in the dev browser on the user's own config)

| | items | dialog | scroll height |
|---|---|---|---|
| Caller | 211 sounds | 1152 px | 7,808 px |
| Animations | 20 GIFs | 896 px | 940 px |
| Sound FX | 17 sounds | 1152 px | 808 px |
| WLED | 13 effects | 1152 px | 876 px |

All four use the same arrangement: a row of action buttons, a paragraph, a
"drag and drop" hint, then a grid of fixed-size tiles built from absolutely
positioned parts. What makes it read as messy:

1. **No hierarchy of actions.** Each dialog opens on 3–5 buttons in four colours
   (grey Sort, red Delete All, amber Generate TTS, green Import/Upload). Colour
   decorates instead of meaning anything, and the destructive button sits among
   the additive ones at the same weight. The design system keeps blue as the
   only accent.
2. **Every tile shouts.** Each tile carries a full-size On/Off control filled
   with the hot gradient. The product reserves that gradient for "this is on",
   and with 211 of them it becomes wallpaper. There is nowhere for the eye to rest.
3. **Scattered, truncated information.** The name is a pill squeezed between the
   toggle and the edit button and cut off at ~110 px. The name and the trigger
   usually say the same thing twice (`todd jock` / `TODD JOCK`), and the source
   line mostly just says "Uploaded". Play, the most common action, is a 10 px
   outline triangle in green.
4. **One-click deletes.** The bin deletes the item, and its stored audio or GIF,
   at once, with no confirmation and no undo.
5. **Nothing to find things with.** 211 sounds are nearly 8,000 px of tiles.
   The only aid is Sort, which permanently reorders the whole list.
6. **Inconsistent controls.**
   - Animations sets a design-system text field beside a legacy bordered select.
   - Upload dialogs use native checkboxes.
   - WLED's board-ID box has a placeholder that looks like two real IDs.
   - Caller spaces its three option toggles 80 px apart.
   - WLED labels an option "trigger Effects only once".
7. **Copy that doesn't match the UI.** "Click the plus button" appears where no
   plus button exists, and the drag hint is always shown.
8. **Triggers are typed blind.** The field is a one-per-line textarea with a link
   to GitHub. Nothing says which words exist. Animations rejects unknown ones
   only at save time; the other three never say.

## What the site does (read from its live DOM)

The dialogs sit inside autodarts' own page, so these are the parts to match
rather than invent. Measured on `/tournaments`, the friends drawer,
`/statistics` and `/settings/caller`:

| site pattern | values | use here |
|---|---|---|
| Search field (friends drawer) | light `#f7f8fa`, text `#16181c`, radius 18 px, 16 px padding, 14 px/700 | the library search |
| Pill tabs (Stats: X01 · Cricket · …) | active `#fff` / `#16181c`; resting `white/10` / `#b8bcc5`; 14 px/700, 8×18 px, full radius, 8 px gap | trigger-type filter |
| Drawer groups ("OFFLINE · 2") | Bebas heading with a count | section headings: `SOUNDS · 211` |
| Settings rows (`/settings/caller`) | 14 px/700 title, muted description, control on the right | the options above each library |
| Preview button (`/settings/caller`) | square button with a play glyph beside each voice | play/test in every row |
| Switch (`data-slot="switch"`, sm) | 43×20; on: blue-60 `#0b55df`; off: `#16181c` + 1 px `rgba(55,76,152,.6)` ring; white 20×14 pill thumb | enable/disable one item |
| Popover (Filters) | `#292c33`, radius 14 px, 1 px `white/10` outline, soft shadow, 16 px padding | Add and More menus |
| Tournament chips ("Single In") | small filled pills | trigger chips |

## Direction: every feature is a library

All four dialogs share one layout:

```
One sentence on what the feature does.

OPTIONS                                           (only where it has any)
  Call every dart                                    [ On | Off ]
  Announce each dart as it lands, not only the visit
  ────────────────────────────────────────────────────────────
  …

SOUNDS · 211                                        [⋯]  [+ Add ▾]
[ 🔍  Search by name or trigger                              ✕ ]
[All 211] [Scores 181] [Throws 3] [Events 4] [Players 23] [Off 1]
────────────────────────────────────────────────────────────────
⠿  ▶  todd jock            Uploaded file    todd jock        ●━  ✎  🗑
⠿  ▶  zane+speedbump       Uploaded file    zane             ●━  ✎  🗑
…
```

The section heading, search and filter stick to the top of the dialog while the
list scrolls under them.

## Decisions

1. **Rows, not tiles, for sounds and lighting effects.** A row is one line
   wide, and each part has a column: drag handle, play button, name over its
   source, trigger chips, switch, edit, delete. Names are no longer cut off at
   110 px, and 211 sounds are 211 × 56 px instead of 53 rows of 160 px tiles.
   **Animations keep a grid**, because a GIF is recognised by looking at it, but
   the tile is rebuilt the same way:
   - the picture on top, with small glass buttons laid over it (drag handle,
     edit, delete) and an *Off* chip while the animation is switched off;
   - underneath, the trigger chips and a switch.
2. **One primary action per screen.** *Add* is the only blue button.
   - It opens a menu of the ways to add. Caller: import a caller set, upload
     files, generate with text-to-speech, add from a link. Sound FX: the same
     minus the caller sets. Animations: upload GIFs, add from a link. WLED: new
     effect, import CSV.
   - *Sort by trigger* and *Delete all…* move into a quiet **More (⋯)** menu.
   - Green stays a status colour. Dialog confirm buttons turn from green
     *Save* to blue.
3. **Colour means "on" or "playing", and nothing else.**
   - Per-item on/off becomes the site's own small switch, which is blue when on.
     This is deliberately not the gradient segmented control. That control stays
     the product's switch for a *feature* or a *setting* (the cards, the options
     rows, Colors). A column of 211 gradient pills was the loudest thing on
     screen, and inside the site the small switch is what a list row uses.
   - An item that is off dims to 45%, so on/off is still readable at a glance.
   - The play button is neutral and turns blue only while its sound is playing,
     showing a stop glyph.
   - Swapping the row switch back to `AppToggle size="xs"` is a one-line change
     in `LibraryItem.vue`, if this departure isn't wanted.
4. **Search finds by name and by trigger.** It matches the name, every trigger
   and the source (link, TTS text, WLED address or preset), ignoring case. A
   space and an underscore count as the same, since player-name triggers accept
   either. Every word must match somewhere.
   - Results are ranked: an exact trigger match first (`26` finds the sound on
     `26` before `126`), then a trigger that starts with the query, then any
     other match. Ties keep the list's order.
   - A number from 0 to 180 also finds **range triggers that cover it**, so
     `150` finds `100-180`, `ambient_100-180` and `range_100_180` too: "what
     plays on 150?"
   - Chips that matched are highlighted, as is the matching part of the name.
     A count says "12 of 211".
5. **Filter pills by trigger type.** Each trigger falls into one type:
   - *Scores*: 0–180 and ranges.
   - *Throws*: segments, bull, misses and dart combinations.
   - *Events*: gameon, gameshot, busted, takeout, lobby and tournament events,
     cricket, `target…`, player-specific gameshot/matchshot.
   - *Board*: board_started, calibration, takeout_finished and the like.
   - *Players*: anything else. That label is accurate, not a guess: the Caller,
     Sound FX and WLED all treat an unknown trigger as a player name. So a typo
     shows up here too.

   How the pills behave:
   - An item is in every type its triggers fall into, the `ambient_` prefix
     ignored.
   - Only types that have items get a pill. *Off* appears when anything is off.
   - The pills are single-choice, and they combine with the search.
   - The row is shown only when it could narrow the list: two or more types
     present, or anything off.
   - A chosen pill goes back to *All* when its last item goes, and when the
     whole row hides, so the list is never narrowed with nothing on screen to
     widen it again.
6. **Filters instead of grouped sections.** Order does not change what plays,
   because the engines pick at random among matching items (checked in
   `caller.ts`, `sound-fx.ts`, `wled.ts`, `Animations.vue`). So order is the
   user's own arrangement. Grouping the list would override it, and filtering
   leaves it alone.
   - Drag and drop stays, with its own handle.
   - It is available whenever the full list is showing. While a search or
     filter narrows it, the handles are hidden and a note says to clear the
     search to reorder.
7. **Delete asks once, inline.** The first click on the bin turns it into a red
   *Delete* button for four seconds, and a second click deletes. There is no
   dialog to confirm and no accidental loss. *Delete all* keeps its dialog, now
   with a danger button and the count in the title.
8. **Options become settings rows**, with the title and description on the left
   and the control on the right, as on the site's `/settings/caller`. Options
   are:
   - **Caller:** *Call every dart*, *Call checkout*, *Prefer combined throws*,
     each described in the README's words. Segmented `AppToggle` (sm).
   - **Animations:**
     - *Start delay* and *Show for* in seconds, as compact number fields.
     - *Fit* (Cover | Contain) and *Cover* (Board only | Full page). These are
       segmented, since both are two-way choices; the old selects were not.
   - **WLED:**
     - *Boards*, as a chip input of board IDs that flags any entry that is not
       a UUID. It is empty by default and says "Effects play on every board".
     - *Don't restart a running effect* (was "trigger Effects only once"). What
       it does: `setEffect` skips an effect that is already the active one.
   - **Sound FX** has no options, so it has no options section.
9. **Triggers are chips everywhere.** In the list, and in every editor, a new
   `AppTokenInput` replaces the one-per-line textarea.
   - Enter or Tab adds what was typed, and pasted lines become one chip each.
     Leaving the field adds what was left typed, so Save never loses the last
     one. Backspace in an empty field removes the last chip.
   - Chips are lowercased, as the textarea did, and duplicates are dropped.
   - Spaces do not split a chip, because player names have spaces.
   - While typing, matching **named triggers are suggested with a one-line
     description** from the README, drawn in the flow under the field. They are
     never a floating list, because the trigger field is the last thing in every
     dialog and a floating list would be cut off by the dialog's scroller.
   - A help line lists the patterns (`0–180`, `100-180`, `s/d/t1–20`, `bull`,
     `t20_t20_t20`) beside the link to the full reference.
   - Animations marks an invalid trigger red as it is added, using
     `validateAnimationTriggers`, instead of rejecting it at save time.
10. **Upload dialogs preview their triggers.** Each chosen file shows the
    trigger its name will give (`180.mp3 → 180`, or "no trigger"). The native
    checkbox becomes a segmented choice: *From file names* | *One for all*. The
    second reveals the shared-trigger field. Semantics are unchanged: file
    names, else the shared trigger, else none.
11. **Every dialog uses the same parts.** Labelled fields in the design-system
    style (`AppSelect` and `AppTextarea` restyled to match `AppInput`), the ghost
    close button `SettingsModal` already uses, and Cancel with a blue confirm.
    Two small additions where testing was otherwise impossible:
    - a *Play* button beside a sound's link in the sound editor, and a *Test*
      button in the WLED editor;
    - the TTS editor keeps its preview, now *Listen*, at the left of the footer.
      Its *Save* needs only the text: a trigger still being typed is added when
      Save is pressed, and a missing one is said in red under the trigger field.
12. **Empty states.**
    - An empty library shows what it is for and the ways to add, as buttons.
      For the Caller that starts with *Import a caller set*.
    - A search with no results says so and offers *Clear search*.
13. **All four dialogs take the widest shell** (72 rem). Animations was the one
    at 56 rem.
14. **Icons** in the redesigned parts come from `material-symbols` (rounded),
    the set `AppAlert` already maps the design system's FontAwesome glyphs to.
    It is closer to the site than the pixel-art set.

## Behaviour kept, feature by feature

Nothing is removed. Every item below is reachable in the new layout:

- **Animations:**
  - delay, duration, fit, view mode
  - add from link, and edit (an uploaded GIF shows its file name, and its link
    is locked)
  - trigger validation
  - upload GIFs: several at once, drag and drop, triggers from file names or one
    for all, stored in OPFS
  - sort by trigger
  - delete one or all, with OPFS cleanup
  - enable/disable, drag to reorder, lazy loading of GIFs
- **Caller:**
  - the three options
  - add from link (https only), and edit (an uploaded sound keeps its stored
    audio and its IndexedDB id)
  - upload files
  - import a caller set: preset list, allowed hosts, ZIP download and extraction
    with progress, CSV mapping, or the 0–180 scan with its special files
  - generate, edit and listen to TTS, with last-used voice, speed and pitch
    remembered
  - play, sort by trigger, delete one or all (IndexedDB cleanup)
  - enable/disable, drag to reorder
- **Sound FX:** the same without caller sets and options, with its own store and
  its own edit behaviour (a new id, old one deleted).
- **WLED:**
  - boards, only-once
  - add and edit effects of three types, with the preset list fetched from the
    device, and URL, preset and JSON validation
  - import CSV, test (play)
  - sort by trigger, delete one or all
  - enable/disable, drag to reorder

The feature cards on the tab are unchanged.

## Units

Pure, and tested under `tsx`:

- `utils/library-search.ts`: `triggerCategory`, `searchLibrary` (rank +
  filter), `filterCounts`, `matchesTrigger` (chip highlight), `highlight`
  (name segments), `rangeCovers`.
- `utils/trigger-catalog.ts`: named triggers with one-line descriptions per
  feature, the pattern help line, and the README links.

Shared components:

- `components/AppSwitch.vue`: the site's switch (sm/md).
- `components/AppSearchInput.vue`: the light search field, with clear and
  Escape.
- `components/AppFilterPills.vue`: pill tabs with counts.
- `components/AppMenu.vue`: a button plus popover menu. It closes on an outside
  pointerdown (`composedPath`, so it works in the shadow root), on Escape and
  when an item is picked.
- `components/AppTokenInput.vue`: a chip input with in-flow suggestions and a
  validator.
- `components/Settings/Library/LibrarySection.vue`: the heading, count, actions
  slot, search, pills, empty and no-result states, and a list slot. It owns the
  query and filter, and hands the ranked rows to its slot.
- `components/Settings/Library/LibraryItem.vue`: the row layout with its slots,
  and the inline delete confirmation.
- `components/Settings/Library/OptionRow.vue`: an options row.
- `components/Settings/Library/UploadDialog.vue`: dropzone, file list with
  trigger preview, and the trigger choice. Shared by Caller, Sound FX and
  Animations.
- `components/Settings/Library/SoundDialog.vue` and `TtsDialog.vue`: shared by
  Caller and Sound FX. Presentational only: the parents keep their storage
  logic, which is where the two differ.

Changed:

- The four feature components (panel template and script), `AppSelect`,
  `AppTextarea`, `AppInput` (a `dense` option, and attributes such as `min` and
  `step` now reach the field), `PageConfig.vue` (Animations to
  `wideSettings`), `assets/tailwind.css` (chip, pill, search, switch, row,
  section, icon-button, menu and dropzone styles).
- `AppDropDown.vue` is deleted once WLED's preset list uses `AppSelect`. WLED
  was its only user.

## Testing

- **Pure logic:** `tsx` checks for search, ranking, range coverage, categories
  and highlight segments. Included: player names with spaces and underscores,
  `ambient_` prefixes, WLED's string-or-array triggers, and an empty query.
- **Dev browser:** the user's own config, backed up first
  (`scratchpad/storage-backup-initial.json`) and restored afterwards.
  - Each dialog at 1800, 1280, 1024 and 390 px wide.
  - Search, pills and the count, sticky header, drag to reorder, and reorder
    disabled while filtered.
  - Inline delete, Add and More menus, every editor and upload dialog, token
    input keys and paste, and the empty and no-result states.
  - Play and stop.
  - Anything added during the test is deleted again. The config is compared
    with the backup at the end.
- **Build checks:** `yarn compile` against the 16-error baseline, and
  `yarn build`, which catches what `yarn dev` hides. ESLint on the new and
  touched files.

## Not doing

- New trigger engine behaviour. Search reports what triggers say; it does not
  simulate the fallback chains.
- Bulk selection. *Delete all* and *Sort by trigger* stay as they were.
- A list view for Animations, or GIF thumbnails from a server.
- New feature-card pictures. The Caller and Sound FX cards show the old tile
  grid, so they should be retaken once this has been reviewed.

## After review

A fresh review of the whole change (2026-09-26) asked for four fixes, all made,
each checked failing before and passing after in the yarn dev Chrome:

- The two-click delete could not be confirmed in Safari and Firefox on macOS.
  They take focus off a pressed button on mousedown, and that blur cancelled the
  red *Delete* before its click. It now keeps focus while pressed; leaving it
  with the keyboard still cancels.
- A chosen pill could outlive the pill row (see *How the pills behave*).
- The TTS editor's *Save* was greyed out while a trigger was still being typed
  (see item 11).
- `AppInput`'s new option was first called `size`, which eight existing fields in
  six other dialogs already passed as `size="sm"` without effect, so they shrank.
  It is `dense` now, used by Animations only.

The Animations tile above describes what was built. The first plan laid only
edit and delete over the picture; moving the handle and the *Off* chip under it
is a small change if wanted. The review's minor findings were left for the user
and are listed in the final report.
