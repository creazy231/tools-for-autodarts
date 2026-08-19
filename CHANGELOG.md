# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- The Caller has a **Prefer combined throws** option. A visit that has its own sound — `s20_s5_s1`, say — was called twice: the score first, then the combination, one on top of the other, and the only way out was to delete the score sound and lose it for every other throw of that score. With this on, the score is skipped for exactly those visits you have a combination sound for, and called as usual for the rest. Off by default, so nothing changes until you ask for it. Thanks to [@minefubi](https://github.com/minefubi) for [#220](https://github.com/creazy231/tools-for-autodarts/pull/220)
- The Caller has a `bulloff` trigger. WLED has had one for a while and the Caller did not, so a sound could light your board for the bull-off but not call it. It plays once as the bull-off begins and stays quiet for the rest of it — the throw landing, the turn passing to the other player and a tie sending them both back to the oche are all the same bull-off. Thanks to [@driesbellen](https://github.com/driesbellen) for [#223](https://github.com/creazy231/tools-for-autodarts/pull/223)
- Added **Board View**: start every game — bull-off included — on the camera, or the drawn board, you want to be looking at. Autodarts has one button for this and it only cycles, so this presses it until your choice comes up, remembering the views it has already been through: a board with one camera cannot show camera 3, and asking for it stops after one lap rather than pressing forever
  - Darts Zoom's *View Mode* now does the same for its own live/image setting, since its close-ups are taken from whatever the board is showing. With Board View switched on, that feature is the one in charge and Zoom stops touching the button, so the two never press it in turn
- Darts Zoom gained a third position, **On Board**, which adds nothing to the screen: autodarts' own board zooms in on each dart as it lands and pulls back out again, on a configurable timer — 1000ms by default — or the moment the visit ends or passes to another player. It works on whatever the site is showing, the camera view included, since it moves the board's own layers rather than drawing a copy
  - It moves them with the `scale` and `translate` properties rather than `transform`, which the site already uses on one of those layers: these compose with what is there instead of losing to it or, with `!important`, wiping it out. The values go through custom properties on the root element — rewriting a `<style>` element drops the rule for an instant, which cancels the transition and makes the board snap back before it moves
- Added a "Tools for Autodarts" entry to the user drawer on the rebuilt site, below "Legal", opening the settings page at `/tools`
- Added `yarn dev:fake-camera`, which hands the dev browser a synthetic webcam so Instant Replay can be exercised without one — macOS refuses Chrome the camera outright unless it has been granted in System Settings, and no amount of granting inside the browser gets around that. Dev only; `yarn build` never sees the flag
- Added a DOM element picker for development, used to drive the port to the rebuilt autodarts site
  - `Alt+Shift+P` arms it; hover an element, `↑`/`↓` walk up and down the tree without needing to click, `E` or a click captures, `C` copies every capture to the clipboard as Markdown
  - The report ranks selector candidates by durability rather than uniqueness, splits classes into semantic/utility/generated, lists each ancestor's stable anchors, and names the `file:line` of extension code already targeting the element
  - Ships only in `yarn build:devtools`, a production build for local installation. `yarn build` — what CI publishes — strips the picker and does not request the `clipboardWrite` permission
- Added `play-v2.autodarts.com` to the host permissions, so the extension loads on the rebuilt site

### Removed
- Removed Shuffle Players — the rebuilt site has its own Shuffle button in the lobby's *Players* header
- Removed Hide Menu In Match — it hid a navigation block the rebuilt match screen does not have. Its card image went with it, which is 2 MB off the download

### Fixed
- Auto Next Player on Takeout pressed the wrong button. It looked for the filled blue button, on the understanding that Next was the only one — it is not: the camera and undo buttons carry the same fill and both come before it, so the countdown ran on one of those and pressed it. Playing without a board hid this, because the camera button is disabled there and pressing it does nothing; with a board it is live, so a stuck takeout opened the camera instead of moving to the next player. The label is what it goes by now, with the fill kept as the fallback for a language the label list does not cover — and that fallback no longer matches a button that is only a glyph
- Going from one lobby straight into another left four things behind every time, and never collected them: two document-wide `MutationObserver`s from Discord Webhooks, and a storage watcher plus another document-wide observer from Team Lobby. Nothing tore them down, because the teardown only runs when you leave the lobby area altogether — so a long session accumulated observers that fired on every DOM change for the rest of the tab's life. Each of them is now released before its replacement is created. Automatic Fullscreen could strand a `fullscreenchange` handler the same way, and Streaming Mode kept a pair of storage watchers and its injected button alive past unmount. Thanks to [@MaB-MaN](https://github.com/MaB-MaN), who found and diagnosed all of this in [#230](https://github.com/creazy231/tools-for-autodarts/pull/230)
- Enhanced Scoring Display applied its type rules to the first thrown dart's cell rather than to the value inside it. `a, b::before` attaches the pseudo-element to `b` alone and lets `a` take the rule itself, so with two or more darts the first slot was styled as a whole cell — a latent mistake from the original port, and one that only became visible once a transform was added
- Enhanced Scoring Display shrank autodarts' own checkout suggestion. The suggestion for the darts still to come is drawn in the same three slots as the darts already thrown, and the feature restyled all three — so a suggestion came out at caption size. It now only touches the slots that hold a dart
- The Winner Animation's border stood roughly 160px clear of the card at the top and the bottom, and its caption floated near the top of the window. The player column is stretched to the height of the whole row and centres the card inside it, so the ring was drawn around the row rather than around what you can see; it goes on the card itself now. The caption no longer says "Game Shot!" either — the rebuilt card carries a GAME SHOT banner of its own directly below it — and gives just the darts it took
- Text ran straight over the icon in every settings field that has one — the webhook URL, sound and effect names, animation URLs, the TTS text. Same cause as the modal widths below: `.adt-input` sets its padding after `@tailwind utilities`, so the `pl-9` those fields relied on lost the cascade. A leading icon now goes in `AppInput`'s `icon` slot, which owns the spacing, and sits against the input rather than being laid over the whole field — where a field had a label it was drawn over that too
- Modal size props never did anything. `.adt-modal` fixes the width to 674px and is declared after `@tailwind utilities`, so it beat every `max-w-*` a modal asked for — including the wide shell the settings dialogs have always requested. Sizes are now `adt-modal-*` classes that cascade properly
- Settings dialogs taller than 85% of the window were cut off with no way to scroll to the rest, footer buttons included
- Sound FX's lobby join and leave sounds never fired on the rebuilt site: the check was for the old `/lobbies/` route, and the new one is `/lobby/`

### Changed
- Changing a setting no longer rebuilds the settings page. Every feature's settings component kept a private copy of the entire config and wrote the whole thing back on any change — and a feature's card and its dialog are two instances of that component, holding two copies that nothing kept in step. The page dealt with that by destroying and re-creating all eighteen cards after every change, and by saving and restoring the scroll position to hide the jump it caused. There is one shared config now: a card and its dialog edit the same object, so there is nothing to re-read and nothing to rebuild. A change made in a second tab shows up live as well, and an edit in a dialog can no longer overwrite one made outside it while the dialog was open
- Darts Zoom stands down during the bull-off. One dart each at the bull needs no close-up, and the strip was taking room out of a screen that is about to be torn down and rebuilt for the match proper — it now reserves nothing at all until that happens
- Instant Replay's *Delay* is now *Start delay*, and means how long to wait after the leg is won before the replay appears rather than how far behind live the picture runs. There is no lag to configure any more: the replay is a clip, and how much of the run-up it holds is *Duration*, which is what that setting always read as. A number saved against the old meaning says nothing about the new one, so it starts from the new default of three seconds — the wait v1 hardcoded
- Darts Zoom's *On Board* hold time is in milliseconds now, defaulting to 1000 — a second is long enough to look at a dart and rather less than five is to wait for the board back. A hold left at the old five-second default becomes the new one; a hold someone actually set keeps the duration they set
- Enhanced Scoring Display scales a thrown dart's cell up by half again, so the points read from the oche. A transform does not lay out, so the slot keeps its size and the cells beside it stay put; the checkout suggestion in the remaining slots is left at the site's own size as before
- Darts Zoom now takes its space out of the match screen instead of covering it, and was checked at tablet sizes as well as desktop. The bottom strip spans the window, so `main` — which is `overflow-hidden` with `h-full` children — is padded at the foot and everything shrinks with it; the top row only ever covers the board, so that one pulls in the box the board is sized from. Neither measures anything it then moves, and the strip reserves its height whether or not a dart has landed, so the board does not resize under you mid-visit
- Noted while checking those sizes: the narrow layout drops `div.w-100` and `div.rounded-t-2xl` entirely, so the match features anchored on them do nothing on a tablet. The panel wrapper (`overflow-clip @container`) is the same element in both layouts and is the better anchor
- Darts Zoom's zoom level is now scaled to the position it is drawn in. The board copy is as wide as its tile, and the bottom tile is a third of the window while the top one is a few centimetres across, so the same level magnified about four times as much down there — the strip was showing barely three segments. Bottom is eased off and Top pushed a little further, and neither goes below life size
- Darts Zoom only animates a dart as it lands. The tiles were rebuilt from scratch on every update, so every dart of the visit restarted its animation whenever anything moved; each tile now stays put until its own dart changes. In the bottom strip they rise in from the foot of the screen rather than just fading
- Darts Zoom's positions are now just **Bottom** and **Top**, and Bottom is the default. Bottom gives each dart a third of the window along the foot of the screen — the close-up is a wide band through the board rather than a small square — and moves autodarts' own undo and next buttons up to the free space in the top right so the strip is not covering them. They are moved with CSS, so React keeps the element where it thinks it is and every handler on it still works, and the bar is placed below the throw display rather than at a fixed height, since that display grows with the number of players
- Settings now carry a shape version, so an option that changes meaning can be migrated rather than silently misread. The first migration puts any Darts Zoom position saved before this change onto the new default and fills in the Colors action-bar colour for configs that predate it
- Colors now paints the bar along the bottom of the match screen — the one holding undo and next — and has its own picker for it, separate from the score cards. It starts at the colour autodarts uses, so switching Colors on does not change it until a colour is chosen
- Ported fifteen of the seventeen Matches features to the rebuilt site, and dealt with the other two one by one
  - **Colors**, **Smaller Scores**, **Larger Player Names**, **Larger Legs/Sets**, **Larger Player Match Data** are stylesheets now instead of styles written onto elements. The rebuilt score cards are React and re-render on every dart, so anything set on the element itself was gone by the next throw; Colors also drops the twice-a-second poll that only existed to paper over that
  - The rebuilt cards needed more than a remap: the active player is marked by a gradient background image rather than a class, and the score, name and legs counter each sit in a fixed-height box sized for the site's own type, so every rule grows or shrinks its box with the text
  - **Automatic Fullscreen** builds its own button for the match header instead of cloning Chakra's settings button into a `ul` that no longer exists. Entering automatically is attempted but not relied on — browsers grant fullscreen only from a user gesture
  - **Winner Animation** is CSS keyed on a single attribute, so the ring and the "Game Shot! / N Darts" line are generated content React cannot clear. v1 restructured the card, which the rebuilt site undoes
  - **Hide Menu In Match** is gone rather than ported: the rebuilt match screen ships no navigation to hide
  - **Checkout Guide** now fills a gap rather than duplicating the site. The rebuilt site draws the route beside every player's score itself, per player and live — but only while its own *Show checkout guide* switch is on, and turning that off removes the column entirely. The routes keep arriving either way, so the feature draws them when the site does not and leaves any card the site is already drawing on alone. v1's version was the weaker of the two: it only ever had `state.checkoutGuide`, the route of whoever was throwing, so every other card kept a stale one until that player's turn came round again
  - **Instant Replay** turned out not to need a board at all: the camera it uses is a webcam you point at your board yourself, which is the only camera a browser can reach. So it is ported rather than shelved, and it plays a real clip now. v1 read every frame back off a canvas with `getImageData` — a GPU-to-CPU copy per frame, and around half a gigabyte of uncompressed pixels at its own default settings — and what came out was not a replay but the live feed running a few seconds behind, so once the buffer had drained you were watching a lagging camera rather than the throw. It records with `MediaRecorder` instead, compressed by the same encoder the browser uses for video calls: a few megabytes rather than hundreds
    - The recording is cut into segments a replay long, of which the last two are kept, because a `MediaRecorder` file cannot be trimmed from the front — the header is at the start and the duration is never written, so seeking into one is unreliable in Chrome and worse elsewhere. Playing whole segments needs no seeking, and the seam between them falls at the start of the replay, never at the throw, which is always in the final segment
    - It also fires once per leg rather than once per message. The match state is pushed on every change, so the win is reported over and over while the board is being cleared; v1 scheduled a replay each time and never held on to the timer it used, so they stacked up
  - **Streaming Mode** is unchanged and still disabled — it is driven by the board camera, so it cannot be built or checked without one
  - **Enhanced Scoring Display** now shows what each dart was worth over the notation the site prints — 60 above T20, 50 above BULL — and enlarges the turn total. Nothing in the page is touched: the values go into a stylesheet as generated content keyed on each slot's position, rewritten as the turn changes, because v1 rewrote those slots' markup and React rebuilds them on every dart
  - **Quick Correction** works on the rebuilt turn bar. Its corrections were always API calls, so the port was the anchoring: the grid opens from a delegated click, since the slots it used to bind listeners to are replaced on every throw, and it reads the notation with `textContent` — the rebuilt slot splits "T20" into two spans in a flex row, and `innerText` puts a line break between them
  - **Gotcha Helper** marks every player who is ahead of whoever is throwing with the single dart that would land on their score and reset them — "T20", "D11", "BULL", or the gap itself as "+37" when no one dart can. It is drawn as generated content in the `left-3` column the site keeps for checkout chips, styled from the site's own tokens; Gotcha has no checkout, so the column is free and the hint lands where the eye already looks. v1 mounted a Vue app inside each score element, which the rebuilt cards discard on every dart
  - **Takeout Notification** is built from the site's own centred dialog — its `black-90` at 80% scrim, its `--radius + 4px` panel, its zoom-in — filled with `--system-warning` and set in Bebas Neue, the pair and face the design system reserves for a state you wait out. v1 mounted a Vue app in a shadow root anchored at `#root > div > div:nth-of-type(2)`, a chain that resolves on the rebuilt site to an empty trailing div, and painted the panel with the extension's own colour rather than anything the site knows about. Clicking it away now lasts for the takeout it dismissed: a takeout sends several board frames, and in v1 the next one put the notice straight back
  - **Auto Next Player on Takeout** and **Automatic Next Leg** both count down on one of the site's own buttons and then press it, so they share one helper. The count is an attribute the stylesheet draws inside the button, in its own type and colour: v1 appended a `<span>`, which the rebuilt turn bar discards on every dart — and then clicked the element it had found seconds earlier, by which time it is a detached node and the click goes nowhere, so the button is now resolved again on every tick. *Next Leg* is found by the `forward-step` glyph FontAwesome stamps on it rather than by its label, which the language switcher rewrites; that also covers *Next Set*. Automatic Next Leg additionally never got off the ground on the rebuilt site — it waited on `#ad-ext-turn`, a hook that is not emitted
  - v1's takeout-stuck feature replaced `Document.prototype.addEventListener` globally so it could find its own handler again at teardown. That patch outlived the feature and applied to every listener on the page; it is gone
  - **Darts Zoom** takes a copy of the site's dartboard per dart and slides it so the dart is dead centre. The rebuilt board is four stacked inline SVGs rather than an image, which is better than what v1 had: a copy zooms without going soft and brings the site's own hit highlight with it, and cloning the lot costs well under a millisecond. Throw coordinates are reported against the double ring, whose outer edge the site draws at 37.778% of the board's width from the middle — checked against T20, D6 and the bull, which land on that to a tenth of a pixel
  - Two things v1 got wrong here are fixed on the way past: handing a visit over does not empty `turns[0]`, so v1's straight read of it kept the last player's darts on screen through the whole of the next player's approach — the turn names its own player, so it is asked. And the centre position moves to the bottom of the screen alongside the two corner options: v1 put that row under the throw display, which on the rebuilt screen is directly on top of the board
- Brought Caller and Sound FX back on the rebuilt site. Both read game data and never touched the old markup, so the port was the gate plus the lobby-route fix above
  - Their settings dialogs are now the widest of the set — 1152px, up from 674px — because both pair a grid of sounds with a column of options; every other settings dialog goes to 896px, the width it always asked for
- Ported Animations to the rebuilt site — the first in-match feature to make the move
  - The animation is placed over the rebuilt match screen's dartboard in *Board Only* mode; v1 found that area through `#ad-ext-turn`, a hook the rebuilt site does not emit
  - The overlay is now anchored in `body` rather than inside the match layout, which the site re-renders around the board on every throw
  - Fixed animations playing twice over: the game-data watcher was never unregistered, so every remount — a new leg, or the hand-off out of a bull-off — left another one running
  - Every trigger kind was re-checked against a live X01 leg: per-dart segments, turn totals, ranges, three-dart combinations, `outside`, `busted` and `gameshot`
  - Documented **View Mode** and range triggers, neither of which the README mentioned
- Match features that have not been ported yet no longer run on the rebuilt site. All of them target the old Chakra markup, and their settings cards are disabled, so a user carrying `enabled: true` from before could not switch them off
- Ported External Boards to the rebuilt site
  - The section now attaches to the rebuilt *My Devices* page, anchored on its heading rather than on a "My Boards" heading that no longer exists
  - The **Stats** button is gone: `/boards/<id>/stats` answers 404 on the rebuilt site, as does `/boards/<id>` — Follow is the only board view left
  - A board can now be added by pasting a link as well as a bare ID, which is what actually gets shared, and duplicates are rejected
  - Fixed the section mounting under the host element name of an unrelated feature (`autodarts-tools-recent-local-players`), and gave it a teardown so it is removed when you leave the page
- Ported QR Code to the rebuilt site, and changed what it does
  - The code is now pinned to the top right corner and stays there while you scroll, instead of being drawn into the lobby's share-link row — which the rebuilt lobby does not have
  - Autodarts' own QR button shares that corner and overlapped the pinned code, so it is hidden while the code is up and restored as soon as it is closed
  - A ✕ beneath the code hides it for the rest of that lobby. Nothing in the extension brings it back, by design — closing it hands the corner back to the site's own button
  - Opening a different lobby shows it again
- Ported Team Lobby to the rebuilt site
  - Now only runs in private lobbies **you host**; previously it would act in anyone's private lobby
  - Your own entry is removed by player index taken from the lobby data, rather than by matching a name against a table the rebuilt lobby does not render
  - "Use my board" is now the board button on each player row, which the site disables while that player is already playing on your board — so an enabled one is exactly a player who needs moving
  - Dropped the separate new-lobby hook that watched the Private/Public buttons to guess whether the lobby was private; the lobby data says so directly
  - The feature's teardown is now actually called when leaving a lobby, which it never was
- Ported Recent Local Players to the rebuilt site, and it now does considerably more
  - The rebuilt site keeps its guest players in `localStorage`, capped at six, and rewrites the whole list on every add — enter a seventh name and the oldest is gone with no other copy of it anywhere
  - Saved names now appear as a **Saved players** strip under the lobby's player list; one click adds a player, using the same request the site's own dialog makes
  - The full list is written back into the site's own store, so its *Add Player* dialog offers everything instead of the last six
  - Replaces the old approach of hiding the site's recent-players row and rendering a copy of it beside a text field the rebuilt lobby no longer has
- Ported Auto Start to the rebuilt site
  - Arming it is now a proper **Autostart On / Autostart Off** toggle beside the lobby's *Start Game* button, in the same style as the settings page, replacing the cloned button that flipped between green and red
  - A player leaving inside the 3-second grace period now cancels the start instead of letting it fire on an empty lobby
  - The player count is read from the lobby's own counter chip, falling back to counting rows, rather than from a table the rebuilt lobby does not render
- Ported Discord Webhooks to the rebuilt site — the first feature back on v2
  - The manual send button now sits in the lobby's *Players* header, immediately left of the site's own Shuffle button
  - The lobby link comes from the address bar rather than a text field on the page, which the rebuilt lobby no longer has
  - Fixed the lobby route (`/lobby/<id>`, was `/lobbies/<id>`) and the readiness check, which waited for a heading the rebuilt lobby does not render — no lobby feature ran on the new site before this
- Restyled the settings page to the Autodarts design system, so it reads as part of the rebuilt site rather than a panel bolted onto it
  - Cards, headings, tabs, modals and inputs follow the system's surfaces, radii and type scale, using the fonts the live site actually ships (Bebas Neue / Manrope)
  - Feature on/off and the settings segmented controls use the system's SegmentedControl; colour still marks one thing only — the feature is ON
  - Inline warnings use the system's Alert; the BETA markers use its Badge
- Every feature is temporarily disabled while the port to the rebuilt site proceeds — they are re-enabled one at a time as each is ported

### Fixed
- Fixed the settings page not scrolling, which cut off every tab taller than the window — most obviously Matches, at nearly three screens
  - The rebuilt site's `<main>` is a fixed-height clip box that never scrolls; its own routes each bring a scrolling container inside it, and the settings overlay now does the same
  - Only while the overlay is open, so it takes part in no layout on any other page
- Fixed lobby data being discarded on the rebuilt site — the handler only recognised the old `/lobbies/<id>` route, so every lobby message was dropped and Discord announcements went out with an empty settings list
- Fixed the Streaming Mode footer still reading "Game provided by Autodarts.io" after the domain migration
  - Caught in #234 by @cameronbol

## [2.4.0] - 2026-08-13

### Changed
- Migrated the extension from `autodarts.io` to the new `autodarts.com` domain
  - Host permissions, content script matches and web accessible resources now target `play.autodarts.com`
  - All API calls now go to `api.autodarts.com` (match corrections, match/board state, lobbies) and board images to `boards.ws.autodarts.com`
  - The auth token capture watches the `api.autodarts.com/auth/v1/*` endpoints
  - Removed the dead legacy Keycloak token endpoint (`login.autodarts.io`), which shut down on 2026-06-28 and has no `autodarts.com` equivalent — the outgoing `Authorization: Bearer` capture covers auth regardless

### Fixed
- Fixed `opponent_throw` Sound FX trigger firing for players who share your board
  - A guest playing on your board with their own Autodarts account (e.g. a friend visiting) is no longer treated as a remote opponent, so their throws don't double up with the throw noise from your physical board
  - The trigger now only fires for opponents on a different board, comparing the thrower's board to your own
  - Reported in #170 by @a-jey

## [2.3.0] - 2026-06-22

### Added
- Added Checkout Guide feature that displays suggested checkout darts in each player's score box
  - Contributed by @MeisterBob
- Added `opponent_throw` Sound FX trigger that plays when a remote opponent throws a dart
  - Fires for any real player other than you, so you get throw feedback when playing online without watching the screen
  - Your own throws are excluded (avoids doubling up with your board's throw sound) and bot throws keep using `bot_throw`
  - Requested in #170

### Fixed
- Fixed authentication token capture for the Autodarts OAuth 2.0 migration (Keycloak shutdown on 2026-06-28)
  - The page no longer hits the Keycloak token endpoint; `auth-cookie.ts` now watches the new auth server endpoints (`https://api.autodarts.io/auth/v1/exchange` and `/auth/v1/refresh`, plus `/auth/v1/token` and `/auth/v1/device/token`) and keeps the legacy Keycloak endpoint for the transition window
  - Added endpoint-agnostic token capture from outgoing `Authorization: Bearer` headers on `fetch` requests (previously only XHR), so the captured token stays valid regardless of which auth server issued it and keeps up with the new 15-minute access-token lifetime
  - No manifest, storage, or API-consumer changes were required — the existing `auth-cookie-available` event flow and `*://api.autodarts.io/*` host permission already cover the new endpoints
- Fixed Gotcha Helper positioning after an Autodarts DOM update
  - Re-anchored the helper to the player score element and centered it so it displays correctly again
  - Contributed by @MeisterBob

## [2.2.8] - 2026-03-23

### Added
- Added Gotcha Helper feature that shows how many points the other players are ahead in Gotcha game variant
  - Displays dart throws needed to catch up (e.g. `+15`, `D10`, `T20`, `BULL`)
  - Contributed by @MeisterBob
- Added Text-to-Speech (TTS) generation for Caller and Sound FX
  - Generate caller and sound effect audio directly from text using your device's built-in voices
  - Voice selection, adjustable speed (0.5x–2x) and pitch (0–2), and preview before saving
  - Last-used voice, speed, and pitch settings are remembered across sessions
- Added board event triggers to Caller and Sound FX features
  - `board_started`, `board_stopped`, `manual_reset_done`, `takeout_finished`, `calibration_started`, `calibration_finished` triggers now available for both Caller and Sound FX
- Added additional WLED board event triggers
  - New triggers: `board_starting`, `board_stopping`, `throw`, `last_throw`, `takeout_finished`
  - Refactored board event handling for cleaner trigger logic
  - Contributed by @MeisterBob
- Added version information display in the Tools settings header

### Fixed
- Fixed animation trigger conditions for last throw — animations no longer play points/combination triggers when busted
- Fixed Automatic Next Leg countdown not being cleaned up properly
  - Added cleanup logic for countdown intervals and text elements on new board events
  - Prevents stale countdown timers from persisting across legs
- Fixed WLED CSV import parsing
  - Contributed by @MeisterBob

## [2.2.7] - 2026-03-06

### Fixed
- Fixed authentication token capture: completely rewrote `auth-cookie.ts` to intercept the Keycloak OIDC token endpoint response via `fetch` override instead of reading a cookie value
  - Added a secondary fallback that intercepts outgoing `Authorization` request headers via `XMLHttpRequest.prototype.setRequestHeader`
  - Token is deduplicated so the custom event is only dispatched when the token actually changes
- Fixed missing `Bearer ` prefix in all Authorization headers used by Quick Correction API calls
- Fixed `fetchWithAuth` helper to send a proper `Authorization: Bearer <token>` header instead of incorrectly setting a `Cookie` header; also removed unnecessary `credentials: "include"`
- Fixed Zoom Live mode button selector: removed `:not([data-active])` constraint so the button click always fires regardless of its current state
- Fixed Automatic Fullscreen button SVG construction: now uses `createElementNS` to build the icon from scratch instead of cloning an existing button's icon, preventing failures when the reference element is unavailable
- Fixed Automatic Fullscreen CSS selector to match the updated Autodarts DOM structure (`.chakra-wrap` lookup)
- Fixed Automatic Fullscreen button placement for Bull-off game variant: button is now prepended correctly instead of using the generic `insertBefore` path

### Added
- Added multilingual support for tournament ready sound trigger — now also detects the German ("Zeit zum bereitmachen") and Dutch ("Tijd om je klaar te maken") variants of the ready-up message
- Added `*://login.autodarts.io/*` to host permissions and the `cookies` permission in the extension manifest to support the new auth token capture mechanism

## [2.2.5] - 2026-01-22

### Fixed
- Fixed WebSocket events not being triggered after WXT framework update
  - Resolved timing issue introduced in WXT 0.20.13 where event listeners were registered after script initialization
  - Event listeners are now set up before script injection to prevent race conditions
  - Added `runAt: "document_start"` for earlier content script execution

## [2.2.3] - 2026-01-21

### Added
- Added WLED Preset mode that fetches presets directly from your WLED controller
  - Presets are displayed in a dropdown for easy selection
  - No need to manually construct URLs for preset activation
- Added WLED JSON API mode for advanced lighting control
  - Allows POST requests with custom JSON body to WLED's `/json` endpoint
  - Enables complex effect configurations not possible with simple URL triggers
- Added WLED support for additional game modes: ATC, RTW, Shanghai, and Bob's 27
  - New `target[1-20,25,bull]` triggers for the current target field
  - Automatically detects the current target based on game variant and round
- Added new WLED triggers for enhanced game event control:
  - `bulloff` trigger for bull-off rounds
  - `gameshot_[player_name]` and `matchshot_[player_name]` for player-specific winning effects
  - `board_stopped`, `calibration_started`, `calibration_finished` for board status events
- Added "Trigger effects only once" option for WLED
  - Prevents duplicate effect triggers when the same field is hit multiple times in a row
  - Configurable per user preference

### Fixed
- Fixed WLED `s25` trigger incorrectly firing as `25`
  - Single 25 hits now correctly trigger `s25` instead of generic `25`

## [2.2.2] - 2026-01-20

### Fixed
- Fixed gameshot/matchshot sounds getting triggered multiple times by the AI referee
  - Added cooldown mechanism to prevent duplicate sound triggers during the same turn
  - Enhanced sound logic in both non-Cricket and Cricket game variants to respect the cooldown
- Fixed streaming mode checkout suggestions not updating correctly
  - Suggestions now properly adjust based on darts already thrown in the current turn
  - Previously showed all 3 checkout darts regardless of how many were already thrown

## [2.2.0] - 2025-12-09

### Fixed
- Temporary fix for board images extraction (used by Zoom feature)
  - Disabled websocket board images handler that stopped working after recent update
  - Implemented DOM-based blob URL extraction as fallback method
  - Board images are now extracted from SVG elements in the DOM by converting blob URLs to base64 data URLs
  - Ensures board images continue to work while websocket handler is being fixed
- Fixed Next Player On Takeout Stuck feature getting triggered twice
  - Ensured status field is always set in websocket board data processing to prevent undefined status values
  - Prevents duplicate triggers when board status updates are received

## [2.1.27] - 2025-12-09

### Enhanced
- Enhanced QR Code Tournament feature layout and styling
  - Changed QR code container to clone the parent element structure instead of creating a new div
  - QR code is now placed directly inside the parent container instead of after the table element
  - Added custom margin styling (negative top margin and bottom margin) for better spacing
  - Updated border radius to use fixed 20px value instead of CSS variable

## [2.1.26] - 2025-12-09

### Added
- Added scale setting for Quick Correction feature
  - Introduced configurable scale slider (0.5x to 2.0x) in Quick Correction settings
  - Scale setting allows users to adjust the size of the correction window to their preference
  - Scale value is saved in config and persists across sessions
  - Added migration to initialize scale property for existing users (defaults to 1.0)

### Enhanced
- Enhanced Quick Correction window positioning to prevent viewport overflow
  - Improved horizontal positioning logic to account for scale factor and maintain viewport boundaries
  - Added vertical positioning checks to prevent window from going below or above viewport
  - Window now automatically repositions above throw element if it doesn't fit below
  - Added CSS constraints (maxWidth, maxHeight) as fallback to prevent overflow
  - Window centers horizontally when viewport is too small to fit at original position

### Fixed
- Fixed Quick Correction settings modal not opening when clicking on feature card
  - Added missing @toggle event handler in PageConfig component
  - Updated feature configuration to mark Quick Correction as having settings
  - Added Quick Correction to settings IDs array for proper modal integration

## [2.1.25] - 2025-12-09

### Added
- Added range trigger support for Sound FX feature
  - Sound FX now supports point range triggers (e.g., `100-180` or `ambient_100-180`) similar to Caller and WLED features
  - Range triggers match numeric point values within the specified range (e.g., `ambient_140` matches `100-180`)
  - Supports both `ambient_` prefixed and non-prefixed range trigger formats
  - Range triggers are checked in multiple fallback paths to ensure comprehensive matching

### Enhanced
- Enhanced Sound FX trigger matching logic with improved range trigger support
  - Added range trigger validation in initial filter, fallback paths, and final numeric checks
  - Improved handling of `ambient_` prefix in range triggers for better compatibility
  - Added debug logging to help diagnose range trigger matching during development
  - Range triggers now work consistently across all Sound FX trigger scenarios

### Changed
- Updated README.md documentation to include range trigger information for Sound FX feature
  - Added documentation for point range triggers format (`ambient_100-180` or `100-180`)
  - Clarified that range triggers work with or without the `ambient_` prefix

## [2.1.24] - 2025-11-20

### Fixed
- Fixed WLED range trigger bug and regex
  - Fixed incorrect loop condition in isTriggerPresent that caused crashes/failures with multiple range effects
  - Updated range regex to support 'range_min_max' format as per documentation (supports both hyphens and underscores)

### Enhanced
- Enhanced URL validation and warning in WLED settings
  - Added a warning message for HTTP URLs to inform users about potential mixed content issues
  - Updated URL validation logic to accept both HTTP and HTTPS URLs for CSV parsing and effect saving, ensuring better user experience and security compliance

## [2.1.23] - 2025-11-19

### Added
- Added bulk upload and trigger assignment feature for sound and animation files
  - Introduced the ability to assign the same trigger to multiple uploaded files in the Caller, Sound FX, and Animations settings
  - Enhanced the user interface to allow bulk trigger assignment when the option to generate triggers from filenames is disabled
  - Updated the processing logic to prioritize bulk trigger assignments over filename-based triggers for improved efficiency
- Added zoom center element visibility control based on game state
  - Introduced conditional display logic for zoom center element based on game winner and checkout availability
  - Implemented dynamic visibility management to show or hide zoom center element based on computed game state

### Enhanced
- Enhanced sound trigger matching logic in caller.ts
  - Updated the sound filtering logic to include support for range triggers
  - Added validation for direct matches and range checks based on numeric trigger values
  - Improved readability and maintainability of the sound matching process

### Changed
- Refactored WLED effect fetching to be non-blocking and add error handling
  - Implemented a fire-and-forget approach for fetching WLED effects using setTimeout
  - Introduced an AbortController with a 5-second timeout to manage fetch requests
  - Silently ignore non-critical errors to prevent interference with game state while logging abort errors

## [2.1.22] - 2025-11-18

### Enhanced
- Enhanced sound effects for specific throws
  - Added logic to handle special case for throw name "25" when the throw bed is "Single", allowing for a distinct sound trigger "s25"
  - Updated sound playback logic in both caller.ts and sound-fx.ts to incorporate the new sound handling for enhanced gameplay experience

## [2.1.21] - 2025-10-30

### Added
- Added WLED trigger support for match/gameshot with throw name specificity
  - New `matchshot+[throwName]` trigger that activates when a player wins the entire match with a specific throw (e.g., `matchshot+bull`, `matchshot+d20`)
  - New `gameshot+[throwName]` trigger that activates when a player wins a game/leg with a specific throw (e.g., `gameshot+d10`, `gameshot+t20`)
  - Allows more granular lighting control for winning throws with specific dart segments

### Fixed
- Fixed WLED effect fetching compatibility issue in Firefox
  - Added `no-cors` mode to effect URL fetching to resolve Firefox CORS restrictions
  - WLED effects now work correctly in Firefox browsers

## [2.1.20] - 2025-07-10

### Added
- Added tournament ready WLED trigger for tournament gameplay
  - New `tournament_ready` WLED trigger that activates when tournament start event is received via websocket
  - Automatically detects tournament start events using websocket monitoring
  - Extended WLED feature to work on tournament pages
  - Added default tournament_ready effect to WLED configuration

## [2.1.19] - 2025-07-10

### Added
- Added tournament ready sound effect for tournament gameplay
  - New `ambient_tournament_ready` sound trigger that plays when "Time to ready up" text appears in tournaments
  - Automatically detects tournament ready state using DOM text monitoring
  - Sound plays once per tournament ready event with automatic cleanup

## [2.1.18] - 2025-07-4

### Added
- Added "Checkout Only" option to Darts Zoom feature
  - New toggle setting "Show zoom only when checkout is available"
  - When enabled, zoom images will only appear when a checkout is possible
  - Works in combination with existing "Zoom On" filter (Everyone/Opponents)
- Added WLED Integration feature for synchronized lighting effects during gameplay
  - Trigger HTTP requests based on game events (points, dart throws, combinations, player-specific, lobby events)
  - Effect management with CSV import, drag & drop reordering, and board filtering
  - Smart effect selection with priority system and HTTPS-only URL validation

### Enhanced
- Enhanced Caller checkout guide functionality to support specific combined sounds
  - Now checks for short form "yr_XXX" sounds (e.g., "yr_120") as the first priority
  - Then checks for specific "you_require_XXX" sounds (e.g., "you_require_120") as fallback
  - Finally falls back to separate "you_require" + score sounds if neither specific sound is available

### Removed
- Removed Ring feature as it has been implemented by the Autodarts Team

## [2.1.17] - 2025-06-26

### Fixed
- Fixed Ring feature preventing users from clicking game finish button

## [2.1.16] - 2025-06-06

### Added
- Added checkout suggestions feature to Streaming Mode that displays recommended dart throws for finishing a game
  - New toggle option "Display Checkout Suggestions" in Streaming Mode settings
  - Shows suggested dart throws in italicized text when a checkout is possible
  - Integrates with existing checkout guide data from the game state
  - Helps streamers and viewers see optimal finishing combinations during matches

### Enhanced
- Enhanced color customization feature to include player names
  - Player names now also get colored using the configured text color
- Excluded "Bull-off" variant from game data processing in Next Player On Takeout Stuck feature

### Changed
- Enhanced Streaming Mode throw display to show checkout suggestions alongside actual throws
- Updated configuration version to 16 with automatic migration for new checkout setting

### Fixed
- Fixed Quick Correction feature interference with ring and numbers overlay in live view
  - Ring and numbers display now properly allows clicking through to correct missed dart throws
  - Enhanced z-index management and pointer event handling for overlay elements
  - Users can now successfully click on dart positions in the image even when visual overlays are active (ring feature)

## [2.1.15] - 2025-05-28

### Changed
- Enhanced Quick Correction feature with improved API flow and reliability:
  - Restructured correction workflow to follow proper API sequence: activation → correction → double deactivation → throws update
  - Added proper throw index tracking (0, 1, or 2) for accurate dart identification
  - Improved segment data structure with correct bed values ("Single", "Double", "Triple", "Bull")
  - Reduced API call delays from 500ms to 50ms for faster correction processing
  - Enhanced error handling and logging throughout the correction process
  - Removed redundant deactivation function and streamlined code architecture

### Fixed
- Fixed Quick Correction API calls to use the correct endpoints and payload structures
- Fixed throw activation to properly identify which dart (first, second, or third) is being corrected
- Fixed segment information to include proper coordinates, segment details, and multipliers

## [2.1.14] - 2025-01-27

### Added
- Added Instant Replay feature that records webcam footage and automatically shows replays of winning throws
  - Configurable duration and delay settings for customized replay timing
  - Two view modes: Full Page overlay covering the entire screen or Board Only overlay positioned over the dartboard
  - Camera zoom (1x-5x) and positioning controls for optimal viewing angle
  - Automatic FPS detection and smart camera device management that excludes cameras in use by other applications
  - Live camera preview in settings with real-time FPS display
  - Intelligent delayed playback system using canvas-based frame buffering
  - Shows replay automatically 3 seconds after a game/leg win with smooth fade-in/fade-out transitions
  - Click-to-dismiss functionality or automatic timeout based on configured duration
  - Comprehensive camera permission handling with user-friendly error messages
  - BETA feature with ongoing improvements and optimizations

## [2.1.11] - 2025-05-8

### Fixed
- Added fallback mechanism for browsers that might have issues with InputEvent when adding local players to improve cross-browser compatibility

## [2.1.10] - 2025-05-07

### Added
- Added color customization feature to allow players to change game appearance
  - Set match background color for a personalized gaming environment
- Added support for point ranges as animation triggers, e.g. 0-60
- Added validation for "Triggers" according to the rules in the README
- Added QR Code feature that automatically displays the lobby QR code for easily sharing with other players

### Fixed
- Fixed issue where sound effects were playing twice during gameplay
- Fixed broken sorting of gifs

### Thanks
- Thanks to @boemjay for contributing the animation improvements
- Thanks to @WilliamLundqvist for the background color customization feature

## [2.1.9] - 2025-05-05

### Added
- Added lobby sound effects to play audio cues when players join or leave lobbies
  - Added `ambient_lobby_in` sound played when a player joins the lobby
  - Added `ambient_lobby_out` sound played when a player leaves the lobby

## [2.1.8] - 2025-04-28

### Added
- Added Enhanced Scoring Display feature that enhances dart throw displays with larger numbers and scoring notation
  - Shows dart notation (S/D/T, BULL) beneath point values
  - Includes smooth animations when scores update during matches
  - Originally contributed by @LeSiiN

### Changed
- Improved Streaming Mode component to use reactive image-based board display instead of DOM manipulation
- Enhanced board display in Streaming Mode to use the same image watcher mechanism as Zoom feature
- Added fallback board image for better reliability

### Fixed
- Fixed potential rendering issues in Streaming Mode by removing direct DOM queries for SVG elements
- Improved stability of the board display in Streaming Mode

## [2.1.7] - 2025-04-16

### Changed
- Enhanced Discord webhooks with live update support when enabled

### Fixed
- Fixed keyboard shortcut conflicts in QuickCorrection feature to only prevent default behavior for numpad keys
- Fixed Automatic Next Leg feature to properly advance game progression
- Adjusted Caller and Sound FX features to prevent playing sounds from old matches
- Fixed issue with sounds and other features becoming inactive after completing one match

## [2.1.3] - 2025-04-09

### Added
- Added "Zoom On" filter for the Darts Zoom feature that allows controlling which throws to display:
  - "Everyone" option shows zoom view for all players
  - "Opponents" option only shows zoom view when opponents are throwing
- Added reset positions button to the Streaming Mode settings to allow users to reset board and scoreboard positions and scales

### Changed
- Improved sound order in Caller and Sound FX to play player name/bot sounds before "game on" announcement
- Updated wxt package to 0.20
- Enhanced Audio Unlock Mechanism and Updated Silent Audio Format
- Refactored Game Data Processing and Updated Ring Styles Logic
- Updated button styling and icon for the reset positions functionality in Streaming Mode

### Removed
- Removed Friends List feature as there is now an official friends list feature available

### Fixed
- Fixed selection of segments in QuickCorrection feature
- Fixed issue where next-player-on-take-out-stuck feature wasn't working in fullscreen mode
- Added fullscreen event detection to ensure proper feature functionality in all screen modes

## [2.0.11] - 2025-04-4

### Added
- Added Quick Correction feature that allows easy correction of misrecognized dart throws
  - Intuitive grid-based interface showing dart board segments
  - Numpad keyboard shortcuts for fast corrections
  - Color-coded buttons matching dart board segments
  - Direct selection for MISS, 25, or BULL throws
  - Smart positioning relative to the thrown dart

### Fixed
- Fixed Streaming Mode scoreboard position by automatically adjusting Y position when more than 2 players are in the game

## [2.0.10] - 2025-04-1

### Added
- Added keyboard shortcuts ('Y' to accept, 'N' to decline) for responding to lobby invitations

### Fixed
- Fixed Discord webhooks permissions issue that was preventing proper webhook execution
- Fixed a bug where match features did not apply after the first match when following a board

## [2.0.9] - 2025-04-1

### Fixed
- Fixed team lobby issue where the host player was continuously removed, preventing them from rejoining after removal
- Fixed an error in Firefox when adding friends or updating recent players list which caused the list not getting saved
- Improved serialization of player objects to prevent reactive objects from being passed to browser messaging

## [2.0.8] - 2025-04-1

### Added
- Added Darts Zoom feature that displays magnified views of dart throws
  - Configurable position (bottom-right, bottom-left, or center)
  - View mode toggle between live camera feed and static board image
  - Adjustable zoom level (1x-6x)
  - Visual indicator showing exact dart landing position
- Enhanced match visualization with zoomed dart views for better gameplay analysis

## [2.0.6] - 2025-04-01

### Added
- Implemented Lobby Invitation System for easier game coordination
- Enhanced Sound FX Logic with dual audio channels for improved sound experience
- Added Socket.IO integration for real-time communication

### Changed
- Replaced button with AppToggle component in Animations settings for improved UI interaction
- Updated Socket Server URL Configuration in Background Script
- Enhanced UI components with improved notification features
- Refactored socket management for better performance
- Updated sound playback logic for enhanced game mode handling

### Fixed
- Various UI improvements and bug fixes across components

## [2.0.5] - 2025-03-27

### Added
- Added ZIP file support for sound imports, making it easier to import multiple sound files at once
- Added bot throw sound effect to enhance gameplay audio feedback
- Enhanced sound playback logic for match and player-specific sounds

### Changed
- Updated UI components for improved consistency and user experience:
  - Refactored settings components to use AppButton and AppToggle
  - Enhanced modal components styling
  - Improved layout and button semantics in PageConfig
  - Fixed spacing in average stats display
- Updated external links and enhanced sound import instructions
- Changed error logging in winner-animation from console.error to console.warn for non-critical issues
- Refined sound playback logic for ambient sounds
- Excluded "Bull-off" variant from game data processing

### Fixed
- Fixed NextPlayerOnTakeoutStuck component logic
- Improved type safety in background chunk declaration

## [2.0.4] - 2025-03-26

### Changed
- Enhanced sound playback logic:
  - Simplified sound playback in game data processing to play points sound consistently regardless of player count
  - Refined cricket scoring sound logic to prevent playing score sounds when the score hasn't changed since the last round
  - Improved score handling for non-final throws in cricket matches
- Updated Animations component:
  - Removed debug logging from drag-and-drop initialization
  - Maintained existing drag-and-drop functionality for improved user experience

### Fixed
- Fixed issue where points sound wouldn't play consistently (Issue #82)
- Fixed score sound playing incorrectly during cricket matches (Issue #83)

## [2.0.3] - 2025-03-25

### Added
- Implemented Automatic Fullscreen feature that enables fullscreen mode during matches for a more immersive experience
- Added sound queue management system to prevent duplicate sound playback, improving the audio experience

### Changed
- Enhanced Animations component:
  - Added conditional rendering for the "Add Animation" button
  - Updated drag-and-drop functionality using the info section as the drag handle
  - Implemented notification system for animation order updates
  - Changed animation adding method to place new items at the beginning of the list
- Updated sound playback logic to prepend 's' to current score for consistent audio feedback
- Updated project version to 63 and marketing version to 2.0.3

### Removed
- Removed Disable Takeout Recognition feature and its associated logic
- Deleted unused Automatic Fullscreen image and cleaned up component references

### Fixed
- Fixed issue with redundant sound triggers during gameplay (Issue #78)
- Fixed UI issue with Automatic Fullscreen component (Issue #77)