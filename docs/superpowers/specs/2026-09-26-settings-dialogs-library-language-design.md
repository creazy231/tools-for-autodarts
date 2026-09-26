# Every other settings dialog in the library design language

**Date:** 2026-09-26
**Status:** done without approvals, at the user's request ("apply the design language to all 14 on my own, one by one, and list the choices for review afterwards"). Each dialog was reworked, opened in the yarn dev Chrome, screenshotted at 1600 px and 390 px and checked before the next one was started. The choices below are the design's own.

## The request

Apply the design stored for the settings dialogs (the memory note *settings-design-language* and
`2026-09-25-sound-and-light-libraries-redesign-design.md`) to every feature that has a settings dialog,
one feature at a time, except the four on *Sounds & Animations*, which already have it.

The fourteen: Discord Webhooks and Recent Local Players (Lobbies); Colors, Auto Next Player on Takeout,
Automatic Next Leg, Streaming Mode, Larger Legs/Sets, Larger Player Names, Larger Player Match Data,
Darts Zoom, Board View, Board Skins, Quick Correction and Instant Replay (Matches). External Boards and
the cards without a gear open no dialog. The feature cards are unchanged.

## What they were

The layout the library redesign replaced: a "Configure …" line, bold headings over bare controls,
legacy `white/70` colours, and each dialog's own arrangement. Measured in the before shots:

- Toggles with their label on the right (Streaming Mode, Darts Zoom, Colors); on a phone Darts Zoom's
  *Checkout Only* toggle was squeezed to "On | O".
- Red buttons for harmless actions: Streaming Mode's *Reset Background* and *Reset Positions*.
- A list of the user's items with one-click removal and a *Clear All Players* that did not ask
  (Recent Local Players).
- A yellow-text note (Quick Correction), a hand-made red error box (Instant Replay), a native input for
  Streaming Mode's footer text.
- Number fields that clamped every keystroke: typing 15 into Instant Replay's duration turned the 1 into
  5 before the 5 arrived. An emptied field became 0, the minimum, or `NaN` (Discord's countdown).
- The old slider focused itself when mounted, so Darts Zoom opened scrolled down to it.
- The four-way camera choice (Darts Zoom, Board View) ran off the dialog's edge on a phone.
- Two dialog titles that did not match their cards: "Next Player On Takeout Stuck", "Larger Legs Sets".

## Decisions

1. **Every panel has the libraries' shape.** One sentence (two at most) on what the feature does, then
   Bebas section headings (`adt-section-title`) over `OptionRow`s: the setting's name and a line on what
   it does on the left, the control on the right, stacked on a phone. One section is called *Options*;
   bigger dialogs name theirs (Streaming Mode: Scoreboard, Board, Background, Layout; Darts Zoom:
   Close-ups, Which darts, Board; Instant Replay: Camera, Replay, Framing).
2. **Numbers go through a new `AppNumberInput`**: the dense `AppInput` with its unit, as Animations lays
   out its seconds. It keeps what is typed while the field has focus and only hands on a number inside
   the limits and on the step (`utils/number-step.ts`, tsx-tested); leaving the field or Enter puts an
   edited entry on the step and inside the limits, or back when it is empty. A field that was only
   focused changes nothing, so a value stored outside today's limits survives a click. Its accessible
   name carries the unit ("Countdown in seconds"). Animations keeps its own inline fields, since its
   dialog was out of scope; moving it over is a small change.
3. **Choices are `AppRadioGroup` (sm).** The four-way camera choices take a new `.adt-segment.is-grid`:
   two to a row below 640 px, where four do not fit.
4. **Sliders stay the `AppSlider` the TTS editor uses**, since the site has no slider of its own (none in
   its chunks) and that one was accepted in the redesign. The value is shown beside it ("40%", "2.0×",
   "10% left"). A new `autofocus` prop, on by default so the TTS editor is unchanged, is off in these
   dialogs.
5. **Actions:** a reset is a quiet grey button; removing one thing is `ConfirmDeleteButton`; deleting
   everything is a dialog with the count in its title. The only blue button in the fourteen is Instant
   Replay's *Allow camera access*, the one thing to do in that state.
6. **Recent Local Players' names are a library** (`LibrarySection` + `LibraryItem`), searchable, with an
   empty state and *Delete all…* under **⋯**. Two new options, both defaulting to the old behaviour:
   `LibraryItem` `plain` (the name and its delete, one line at every width, `.adt-row.is-plain`) and
   `LibrarySection` `sortable` (off here: the lobby rebuilds this order on every visit, newest first).
   **Departure from rule 8:** it takes `fill` but not `widest`. The widest shell is for rows with six
   columns; a name and a bin do not need it.
7. **Notes are `AppAlert`s:** Quick Correction's Safari warning, Instant Replay's camera errors (with
   *Try again*).
8. **Dialog titles match the cards.**
9. **Instant Replay takes the widest shell**, with its preview beside the options and kept in view while
   they scroll, as Colors does.

## Dialog by dialog

- **Discord Webhooks:** the webhook URL first, with a hint under it when it is empty or not a Discord
  webhook; *Send the invitation* (Automatic | Manual); *Start after a countdown*, with *Countdown*
  (1–60 whole minutes) only while it is on. *Post live scores* is shown **disabled and off**, whatever
  is stored, with a note: the match half is not in `match.content`'s `PORTED_TO_V2`, so it never runs.
  It could be hidden instead, or ported.
- **Recent Local Players:** *Players to keep* (at least 1, no ceiling, as the lobby has none); the saved
  players as a library.
- **Colors:** Bebas headings; *On every autodarts page* as a settings row; *More colours* as rows with a
  reset button and the swatch, each always saying what it colours, plus "autodarts' own until you pick
  one" or "Follows the background until you pick one". The pickers and the preview are unchanged.
- **Auto Next Player on Takeout / Automatic Next Leg:** one *Countdown* row each, 1–120 s. Neither
  takes 0: `button-countdown.ts` never starts a countdown of 0, which would switch the feature off
  without saying so.
- **Streaming Mode:** Scoreboard (design, throws, checkout suggestions, averages, footer text with the
  default as placeholder), Board (show, *View*: Camera | Drawn board), Background (Chroma key | Image,
  then the colour with its hex, or the image as a thumbnail with *Replace* and a two-click delete),
  Layout (*Reset positions*). `backgroundImage` is bound directly; the local copy and its sync went.
- **Larger Legs/Sets, Player Names, Match Data:** one *Size* row in rem (0.5–10), saying autodarts'
  own size. The string copy of the value, parsed with `parseFloat(...) || 1`, went.
- **Darts Zoom:** Close-ups (position, bar position, hold for, zoom level, centre dot), Which darts
  (everyone | opponents, only on a checkout), Board (view). The hold time is shown in seconds and still
  stored in milliseconds.
- **Board View:** one row, its notes as the description.
- **Board Skins:** a Bebas *Skin* heading, the chosen skin named in its description, the view note under
  a rule. The tiles, with the gradient label on the chosen one, are unchanged: that mirrors the segmented
  control, where the selected option carries the gradient.
- **Quick Correction:** the Safari warning, then *Window size* as a slider with its percentage.
- **Instant Replay:** waiting-for-permission, error, no-camera ("No camera to show" in the preview) and
  live states; the camera list with a refresh button whose spinner now draws (it used `eos-icons`, which
  is not installed).

## Behaviour changed on purpose

- **Deleting a saved player sticks.** The lobby feature writes its whole list into the site's own
  `autodarts-guest-players` key and reads that first on the next sync, so a name deleted from the config
  alone came back. `utils/guest-players.ts` (`forgetGuestPlayers`, tested under tsx) removes it from
  both and announces the write with a `storage` event, as the lobby's own write does, because the
  overlay leaves a lobby mounted under it, holding the list in memory. `recent-local-players.ts` takes
  `GUEST_KEY` from there.
- Number fields clamp on leaving rather than per keystroke (decision 2).
- `AppSelect` passes attributes other than `class` and `size` to its `<select>`, so the camera list has
  an accessible name. No other caller passes any.
- The cards of Discord Webhooks and Larger Player Match Data no longer write `adt:active-settings` into
  localStorage when they mount (a stray `useStorage` default).

## Not doing

- The feature cards, their pictures and their copy.
- Animations' number fields and the TTS editor's slider focus (out of scope; both one-line changes).
- Porting Discord's live scores.

## Testing

- Each dialog in the dev Chrome, in a tab of its own, at 1600 × 1000 (and 1600 × 2600 for the whole
  dialog) and 390 px phone emulation, with an audit for overflow and blue buttons. Interactions: search,
  no results, two-click delete, the delete-all dialog and the empty state (with throwaway players), number
  typing, blur and Enter, the chroma and image branches, arming and disarming the image delete, the
  *On board* branch, and Instant Replay's four camera states through a canvas camera stubbed into the
  extension's isolated world, so the real webcam was never opened. The config was restored from a
  backup afterwards.
- `yarn compile`: the 14 known errors, none in these files. `yarn build` passes. ESLint: nothing new in
  touched files.

## After review

A review of the whole change (2026-09-26) found no critical issues and three important ones, all fixed
and checked again in the dev Chrome:

- Automatic Next Leg allowed 0 and said it would start straight away; a countdown of 0 is never started.
  Its minimum is 1 and the line is gone.
- Leaving a number field clamped its value even when nothing had been typed, and the saved players' cap
  had a ceiling of 100 that the lobby does not: one click in the field could trim a longer list at the
  next sync. The field now changes only what was edited, and the cap has no ceiling.
- Deleting a saved player did not reach a lobby open under the settings, which kept the name in memory
  and would have written it back. The delete now announces itself with a `storage` event.

Smaller ones fixed at the same time: the library's `sortable` prop was shadowed in its template by the
Sortable instance (renamed `sorter`); numbers snap to their step, so Discord's countdown stays whole;
Instant Replay's *Try again* looks at the cameras again when access is already given instead of asking
for it (which turned "in use" into "denied"), its alert is titled for the case, and the "Camera access
needed" block no longer flashes in when an earlier grant lets the browser answer by itself; Discord's
URL check takes versioned webhook addresses; every segmented choice in these dialogs has an accessible
name; Recent Local Players' copy no longer claims every player is kept, or that the least used goes.
