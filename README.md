<p align="center">
  <img src="assets/autodarts-tools-logo.png" alt="Tools for Autodarts Logo" width="200">
</p>

<h1 align="center">
Tools for Autodarts
</h1>

<p align="center"><img src="https://img.shields.io/github/actions/workflow/status/creazy231/tools-for-autodarts/release.yml" alt="GitHub Actions Workflow Status">&nbsp;<img src="https://img.shields.io/github/package-json/v/creazy231/tools-for-autodarts" alt="GitHub package.json version">&nbsp;<a href="https://github.com/creazy231/tools-for-autodarts/releases"><img src="https://img.shields.io/github/v/release/creazy231/tools-for-autodarts" alt="GitHub Release"></a></p>

<p align="center"><a href="https://chromewebstore.google.com/detail/tools-for-autodarts/oolfddhehmbpdnlmoljmllcdggmkgihh"><img src="https://img.shields.io/chrome-web-store/v/oolfddhehmbpdnlmoljmllcdggmkgihh?logo=google-chrome&logoColor=%23FFFFFF&label=Chrome" alt="Chrome Web Store Version"></a>&nbsp;<a href="https://addons.mozilla.org/de/firefox/addon/tools-for-autodarts"><img src="https://img.shields.io/amo/v/tools-for-autodarts?logo=firefox&logoColor=%23FFFFFF&label=Firefox" alt="Mozilla Add-on Version"></a>&nbsp;<a href="https://apps.apple.com/de/app/tools-for-autodarts/id6479754594"><img src="https://img.shields.io/itunes/v/6479754594?logo=apple&logoColor=%23FFFFFF&label=MacOS%20%26%20iOS" alt="App Store Version"></a>&nbsp;<a href="https://intradeus.github.io/http-protocol-redirector?r=altstore://source?url=https://raw.githubusercontent.com/creazy231/tools-for-autodarts/refs/heads/main/Autodarts_Tools_Source.json"><img src="https://img.shields.io/github/v/release/creazy231/tools-for-autodarts?logo=apple&logoColor=%23FFFFFF&label=AltStore%20iOS&color=007AFF" alt="AltStore iOS Version"></a></p>

<p align="center"><a href="https://chromewebstore.google.com/detail/tools-for-autodarts/oolfddhehmbpdnlmoljmllcdggmkgihh"><img src="https://img.shields.io/chrome-web-store/users/oolfddhehmbpdnlmoljmllcdggmkgihh?logo=google-chrome&logoColor=%23FFFFFF&label=Chrome%20Users" alt="Chrome Web Store Users"></a>&nbsp;<a href="https://addons.mozilla.org/de/firefox/addon/tools-for-autodarts"><img src="https://img.shields.io/amo/users/tools-for-autodarts?logo=firefox&logoColor=%23FFFFFF&label=Firefox%20Users&color=4c1" alt="Mozilla Add-on Users"></a>&nbsp;<a href="https://ko-fi.com/creazy231"><img src="https://img.shields.io/badge/Ko--fi-Support%20me%20on%20Ko--fi-FF5E5B?logo=ko-fi&logoColor=white" alt="Support me on Ko-fi"></a></p>

<hr>

> [!CAUTION]
> **Tools for Autodarts** is developed by the community and is not an integral part of the official Autodarts platform.

## 📋 Overview

Tools for Autodarts is a browser extension that enhances your gaming experience on [autodarts.com](https://autodarts.com). It adds numerous quality-of-life features, customization options, and advanced functionality to make your Autodarts experience more enjoyable and personalized.

## 💾 Installation

### 🌐 Browser Extensions
- [Chrome Web Store](https://chromewebstore.google.com/detail/tools-for-autodarts/oolfddhehmbpdnlmoljmllcdggmkgihh)
- [Firefox Add-ons](https://addons.mozilla.org/de/firefox/addon/tools-for-autodarts)
- [MacOS & iOS App Store](https://apps.apple.com/de/app/tools-for-autodarts/id6479754594)
- [iOS sideload via AltStore](https://intradeus.github.io/http-protocol-redirector?r=altstore://install?url=https://github.com/creazy231/tools-for-autodarts/releases/latest/download/autodarts-tools-ios.ipa)

### 📱 AltStore Installation Guides (iPhone/iPad)
- [Windows Installation Guide](https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows)
- [macOS Installation Guide](https://faq.altstore.io/altstore-classic/how-to-install-altstore-macos)

### 🌐 AltStore Source
- [View in Browser](https://therealfoxster.github.io/altsource-viewer/view/?source=https://raw.githubusercontent.com/creazy231/tools-for-autodarts/refs/heads/main/Autodarts_Tools_Source.json)
- [Add to AltStore](https://intradeus.github.io/http-protocol-redirector?r=altstore://source?url=https://raw.githubusercontent.com/creazy231/tools-for-autodarts/refs/heads/main/Autodarts_Tools_Source.json)

# 📑 Table of Contents

- [Overview](#-overview)
- [Installation](#-installation)
- [Features](#-features)
  - [Lobby Enhancements](#-lobby-enhancements)
  - [Match Customization](#-match-customization)
  - [Gameplay Features](#-gameplay-features)
  - [Audio Features](#-audio-features)
  - [WLED Integration](#-wled-integration)
  - [Animations](#-animations)
  - [Utility Features](#-utility-features)
- [Configuration](#️-configuration)
- [Development](#-development)
- [Contributing](#-contributing)
- [Show your support](#️-show-your-support)
- [Credits](#-credits)
- [License](#-license)

## ✨ Features

### 🚪 Lobby Enhancements
- **Auto-Start**: Adds an **Autostart On / Autostart Off** toggle beside the lobby's *Start Game* button. While it is on, the game starts 3 seconds after another player joins
  - Those 3 seconds are a grace period: someone who joins the wrong lobby and leaves again cancels the start instead of triggering it
  - Every lobby opens with it off — it presses a button that starts a real game, so the choice is never carried over from an earlier lobby
- **Discord Webhook Integration**: Sends invitation links for private lobbies to your Discord server
  - **Send manually**: Adds a **Discord** button to the lobby's *Players* header, next to Shuffle, so you choose when to announce. With this off, the webhook fires as soon as the lobby opens
  - **Auto-Start Timer**: Automatically starts the game after a configurable time delay once the webhook is sent
  - The announcement is edited in place once the game starts, so the channel does not fill up with lobbies nobody can join
- **Extended Recent Players List**: Autodarts remembers your last **6** local players and drops the rest for good. This keeps every name you have entered
  - A **Saved players** strip appears under the lobby's player list — one click adds a player, however long ago you last used them
  - The full list is also written back into the site's own *Add Player* dialog, so it offers everything rather than the last six
  - The number of names kept is configurable, and individual names can be removed from the settings page
- **Team Lobby Mode**: Sets a lobby up for several people throwing on one dartboard
  - Your own entry is removed, so the players are the team names you add rather than the account that opened the lobby
  - Anyone who joins on their own board is moved onto yours
  - Only runs in **private lobbies that you host**
- **QR Code**: Pins the lobby's join code to the top right corner, so anyone walking up to the board can scan it without the host opening anything
  - Autodarts' own QR button occupies the same corner, so it is hidden while the pinned code is up and comes back the moment you close it
  - The ✕ underneath hides the code for the rest of that lobby; from then on the site's own button is there if you want it

### 🎨 Match Customization
- **Color Customization**: Change the colors of dart throws, scores, and match background for a personalized gaming environment
  - Four pickers: score card background, text, match background, and the bottom bar that holds the undo and next buttons
  - The bottom bar starts at the color autodarts uses, so nothing changes there until you pick one
- **Streaming Mode**: Includes green screen support, board visualization, and thrown darts display
- **Virtual Board Surround**: Adds a customizable surround to the dartboard
- **Darts Zoom**: A close-up of where each dart of the current visit landed, one tile per dart
  - Three positions. **Bottom** (default) gives each dart a third of the window along the foot of the screen, and moves autodarts' undo and next buttons up to the free space in the top right so they are not covered; **Top** leaves those buttons alone and puts a smaller row under the throw display
  - **On Board** adds nothing to the screen at all: autodarts' own board — the camera view, or the vector board when no camera is running — zooms in on each dart as it lands and pulls back out again
    - Configurable hold time in milliseconds, 1000 by default; it also pulls back out the moment the visit ends or passes to another player
  - View mode toggle between the live camera feed and autodarts' own dartboard — the board is drawn as vector art, so the close-up stays sharp at any zoom and shows the site's hit highlight. It also switches the board itself to match, unless **Board View** is on
  - Adjustable zoom level, scaled to the position: the bottom strip is a third of the window wide, so the same level there magnifies far more than a small tile would, and it is eased off to suit — the top row goes the other way
  - New darts fade in as they land (rising from the foot of the screen in the bottom strip); darts already on screen are left alone
  - The board shrinks to make room, so the close-ups never cover it — at any window size, including tablets
  - An optional centre dot marks the exact point
  - Can be limited to your opponents' darts, or to visits where a checkout is on
  - Clears when the visit is handed over; a busted visit stays up, since the darts are still in the board
  - Stands down entirely during the bull-off, taking up no room at all until the match proper begins
- **Board View**: Start every game — bull-off included — showing the camera, or the drawn board, you actually want
  - Autodarts has one button for this and it only cycles (camera 1, 2, 3, drawn board, round again); this presses it for you until your choice comes up
  - Boards with fewer cameras have a shorter cycle, so asking for one that is not there leaves the view alone rather than pressing forever
  - While it is on, it is the one in charge: Darts Zoom's *View Mode* stops switching the board and only decides where its close-ups come from
- **Automatic Fullscreen**: Automatically enables fullscreen mode during matches for an immersive experience
- **Adjustable UI Elements**: Modify the size of legs, sets, and match information
- **Larger Player Names**: Increase the font size of player names for better visibility during matches

### 🎮 Gameplay Features
- **Takeout Visualization**: Visual notification while the board is waiting for the darts to be pulled
  - A **Removing Darts…** panel in the middle of the screen, in the site's own warning colour and display face
  - Click it to put it away; it stays away for that takeout and returns on the next one
  - Clicking it also presses the board's **Reset**, for a takeout the board never sees finish
- **Automatic Next Player**: Presses *Next* for you when a takeout never finishes
  - A countdown appears on the site's own *Next* button as soon as takeout starts — configurable, 10 seconds by default
  - Clicking anywhere calls it off; so does the board coming back before it runs out
  - Skipped during the bull-off, which has no next player to move to
- **Automatic Next Leg/Set**: Starts the next leg once the darts are out of the board
  - Counts down on the site's own *Next Leg* button — configurable, 5 seconds by default — and presses it
  - Waits for the board to report the takeout finished, not just for the leg to be won, so the countdown does not run while you are still pulling darts
- **Smaller Font for Inactive Players**: Reduces the font size of scores for players not currently throwing
- **External Boards Support**: Follow a board that is not your own — save any board by name and open its live view in one click
  - Adds an **External Boards** section to the *My Devices* page
  - Paste either the board's ID or a link containing it; the ID is picked out for you
  - Autodarts removed the per-board stats page in the site rebuild, so **Follow** is the only action left
- **Fancy Gameshot Animation**: Celebratory animation when a player wins
  - An animated border around the winning card, with the number of darts it took above it
- **Enhanced Scoring Display**: Improves dart throw visuals with larger numbers and scoring notation
  - Shows dart notation (S/D/T, BULL) beneath point values, with the whole cell scaled up so a thrown dart reads from the oche
  - Only touches darts you have actually thrown — autodarts' checkout suggestion for the darts still to come is left at its own size
  - Includes smooth animations when scores update
- **Animations**: Display custom animations for special events like 180s, bulls, busts, and leg wins during gameplay
- **Quick Correction**: Easily fix misrecognized dart throws with an intuitive interface
  - Grid-based correction panel showing all board segments
  - Numpad keyboard shortcuts for fast corrections
  - Color-coded buttons matching dart board segments
  - Keyboard shortcuts for accessing throws (/, *, -) and making corrections
- **Instant Replay**: Plays the winning dart back from your own webcam whenever a leg is won
  - Point any webcam at your board and pick it in the settings; a rolling recording is kept while you are in a match, and the last few seconds are played over the screen once the leg ends
  - This is your webcam, not the board's camera — the browser cannot reach that one. Nothing is uploaded and nothing is written to disk; the recording lives in memory and is dropped when the match does
  - **Duration** sets how many seconds leading up to the winning dart to play (5–30). A little more may be shown, never less
  - **Start delay** sets how long to wait after the leg is won before the replay appears (0–10 seconds), leaving room for autodarts' own celebration
  - Shows over the whole page or over the board alone, with adjustable zoom and framing for the picture
  - Click the replay to dismiss it early; correcting the winning throw takes it away by itself
  - Skipped for the bull-off
- **Gotcha Helper**: Shows how far ahead the other players are in the Gotcha game variant
  - Marks every player ahead of whoever is throwing with the single dart that lands exactly on their score and resets them — `T20`, `D11`, `BULL`
  - A gap no single dart can cover is shown as the gap itself, e.g. `+37`
  - Sits beside the score, in the spot the site keeps for checkout suggestions
- **Checkout Guide**: Displays suggested checkout darts in each player's score box
  - Autodarts shows these itself while *Show checkout guide* is on in the match settings; this keeps them on screen when it is off
  - Stays out of the way whenever the site is already drawing them, so a route is never shown twice
  - Every player gets their own route, not a copy of whoever is throwing

### 🔊 Audio Features
- **Caller**: Voice announcements for scores, checkouts, and each dart thrown during gameplay
- **Sound FX**: Ambient sound effects for different game events
- **Sound Upload**: Add your own custom sounds for personalized feedback
- **Text-to-Speech (TTS)**: Generate custom caller and sound FX audio directly from text using your device's built-in voices
- **WLED Integration**: Trigger lighting effects and HTTP requests synchronized with game events

### 🗣️ Caller Feature
The Caller feature provides voice announcements during your darts gameplay, similar to professional darts tournaments:

#### Configuration Options
- **Call Every Dart**: Announces each dart as it's thrown, rather than waiting for the end of a turn
- **Call Checkout**: Announces possible checkout combinations when a player is on a checkout score
- **Custom Sound Library**: Add, edit, and organize voice clips for different game events
- **Text-to-Speech (TTS) Generation**: Generate caller sounds directly from text using the built-in "Generate TTS" button — no external files needed. Select from any voice installed on your device, adjust speed and pitch, and preview before saving. Your last-used voice, speed, and pitch settings are remembered across sessions.
- **Bulk Upload with Trigger Assignment**: When uploading multiple files, you can assign the same trigger to all files at once, making it easy to set up larger sound sets without manually assigning triggers to each file individually

#### Supported Triggers
You can assign sounds to be played based on these triggers:

- **Points**: `0` to `180` (point totals)
- **Point Ranges**: A range between `0` and `180`, e.g. `0-20` or `100-180` (point totals)
- **Singles**: `s1` to `s20` and `s25` (single segments)
- **Doubles**: `d1` to `d20` and `bull` (double segments and bullseye)
- **Triples**: `t1` to `t20` (triple segments)
- **Special Voice Lines**:
  - `gameon`: At the start of a new game
  - `gameshot`: When a player wins the game
  - `you_require`: Plays before announcing checkout combinations (numbers are called separately)
  - `busted`: When a player busts
  - `double`, `triple`: Generic announcements for dart types
  - `outside`: When a dart lands outside the scoring area
  - `next_player`: Plays when switching to the next player (fallback if no player name sound is found)
  - `bot`: Plays instead of player name when the player is a CPU/bot player
  - `bulloff`: Once when the bull-off begins, not again as the throw passes between players
  - `playername`: Player name sounds play automatically when it's their turn. Example: If your name is `creazy.eth` on Autodarts, simply use `creazy.eth` (supports spaces or `_` like `player_name` or `player name`)
- **Board Status**:
  - `board_started`: When the board has started
  - `board_stopped`: When the board has stopped or disconnected
  - `manual_reset_done`: After a manual reset (also triggered when a new round starts)
  - `takeout_finished`: When takeout has finished
  - `calibration_started`: When calibration is started
  - `calibration_finished`: When calibration has finished
- **Cricket-Specific**:
  - `cricket_hit`: When a player hits a Cricket target (15-20 and Bull)
  - `cricket_miss`: When a player hits a non-Cricket target (Miss-14)

#### Cricket Mode Behavior
In Cricket games, the caller has specific behavior:
- `cricket_hit` is triggered when a player hits a target that's still open (15-20 and Bull)
- `cricket_miss` is triggered when a player hits any other number (Miss-14) or hits a target that's already closed by all players
- Regular throw sounds (like `t20`, `d16`) are still announced when enabled

#### Audio Interaction Requirements
Due to browser security policies, especially on Safari and mobile browsers, audio can only be played after user interaction (click, tap, or keypress). The extension will:
- Automatically detect when audio can't be played
- Show a notification prompting the user to interact with the page
- Automatically unlock audio playback once interaction occurs
- Queue up sounds to ensure nothing is missed during this process

#### Predefined Caller Sets
The extension comes with ready-to-use caller sets that you can easily import:

##### Dutch (nl-NL)
- **NL - Laura (Female)**: Dutch female voice caller

##### French (fr-FR) 
- **FR - Remi (Male)**: French male voice caller
- **FR - Lea (Female)**: French female voice caller

##### Spanish (es-ES)
- **ES - Lucia (Female)**: Spanish female voice caller
- **ES - Sergio (Male)**: Spanish male voice caller  

##### German & Austrian
- **AT - Hannah (Female)**: Austrian German female voice caller
- **DE - Vicki (Female)**: German female voice caller
- **DE - Daniel (Male)**: German male voice caller

##### British English (en-GB)
- **GB - Amy (Female)**: British female voice caller
- **GB - Arthur (Male)**: British male voice caller

##### American English (en-US)
- **US - Ivy (Female)**: American female voice caller
- **US - Joey (Male)**: American male voice caller
- **US - Joanna (Female)**: American female voice caller
- **US - Matthew (Male)**: American male voice caller
- **US - Danielle (Female)**: American female voice caller
- **US - Kimberly (Female)**: American female voice caller
- **US - Ruth (Female)**: American female voice caller
- **US - Salli (Female)**: American female voice caller
- **US - Kevin (Male)**: American male voice caller
- **US - Justin (Male)**: American male voice caller
- **US - Stephen (Male)**: American male voice caller
- **US - Kendra (Female)**: American female voice caller
- **US - Gregory (Male)**: American male voice caller

Simply select one of these presets when adding sounds through the "Import from URL" option in the Caller settings.

> [!NOTE]
> Some predefined caller sets may not work in Safari due to browser restrictions. Tools for Autodarts is not responsible for the content of these caller sets.

#### Intelligent Fallback System
The caller has a sophisticated fallback system to provide complete coverage even with limited sound files:
- **Segment Announcements**: If a specific segment sound (e.g., `s20`) isn't available, it automatically plays just the number (`20`)
- **Double/Triple Handling**: For doubles and triples, it follows the pattern of playing the word followed by the number (e.g., `d20` → `double` + `20`)
- **Miss Handling**: `miss` or `m` prefixed throws will fall back to `outside` sounds
- **Matchshot Handling**: When no `matchshot` sound is available, the system will automatically use the `gameshot` sound instead
- **Player Announcements**: Automatically announces the current player's name at the start of their turn
- **Game Start**: Plays the "game on" sound at the beginning of a match

#### Cross-Browser Audio Support
- Compatible with all major browsers including Safari on iOS/MacOS
- Automatic audio unlocking for mobile browsers that require user interaction
- Queued sound playback to ensure all announcements are heard in the correct order

### 🔊 Sound FX Feature
The Sound FX feature adds ambient sound effects to your gameplay experience:

#### Game Event Sounds
Add sound effects for various game events:
- **Point Triggers**: Sounds can be triggered for any score from `ambient_0` to `ambient_180`
- **Point Ranges**: A range between `0` and `180`, e.g. `0-20` or `100-180` (point totals). Format: `ambient_100-180` or `100-180` (with or without the `ambient_` prefix)
- **Individual Throws**: Sounds for specific throws like `ambient_s20`, `ambient_d16`, `ambient_t19`, etc.
- **Combined Throws**: Trigger sounds based on a sequence of throws using format `s20_t19_d12`
- **Special Events**: Dedicated sounds for `ambient_gameon`, `gameshot`, `busted`, and more
- **Player Turn Sounds**: 
  - `ambient_next_player`: Plays when switching to the next player (fallback if no player name sound exists)
  - `ambient_bot`: Plays when switching to a CPU/bot player
  - `bot_throw`: Plays when a bot player throws a dart
  - `opponent_throw`: Plays when a remote opponent (any real player other than you, on a different board) throws a dart — useful as throw feedback when playing online without looking at the screen. Your own throws and bot throws are excluded (bots use `bot_throw`), and so are players sharing your board (e.g. a friend visiting to play on your board with their own account) since that board already makes the throw noise
  - Player-specific sounds using format: `ambient_playername` or `ambient_player_name`
- **Lobby Sounds**:
  - `ambient_lobby_in`: Plays when a player joins the lobby
  - `ambient_lobby_out`: Plays when a player leaves the lobby
- **Tournament Sounds**:
  - `ambient_tournament_ready`: Plays when "Time to ready up" text appears in tournaments
- **Board Status Sounds** (only during a game):
  - `ambient_board_started`: Plays when the board has started
  - `ambient_board_stopped`: Plays when the board has stopped or disconnected
  - `ambient_manual_reset_done`: Plays after a manual reset (also triggered when a new round starts)
  - `ambient_takeout_finished`: Plays when takeout has finished
  - `ambient_calibration_started`: Plays when calibration is started
  - `ambient_calibration_finished`: Plays when calibration has finished
- **Player-Specific Gameshot**: Create personalized winning sounds for specific players using the following formats:
  - `gameshot_player name` (spaces preserved)
  - `gameshot_player_name` (with underscores replacing spaces)
  - With ambient prefix: `ambient_gameshot_player_name`
- **Cricket Mode**: Special triggers for Cricket games:
  - `cricket_hit`: Triggered when hitting Cricket targets (15-20 and Bull) that are still open
  - `cricket_miss`: Triggered when hitting non-Cricket targets (Miss-14) or hitting targets already closed by all players

#### Match vs Game Winning Sounds
The Sound FX feature distinguishes between winning a single game (gameshot) and winning the entire match (matchshot):
- **Match Win**: `ambient_matchshot` or `matchshot` triggers when a player wins the complete match
- **Game Win**: `ambient_gameshot` or `gameshot` triggers when a player wins a single game/leg
- **Player-Specific Match Win**: Create personalized match winning sounds:
  - `matchshot_player_name` (with underscores)
  - `matchshot_player name` (with spaces)
  - With ambient prefix: `ambient_matchshot_player_name`

#### Ambient Sound Prefix
- Use the `ambient_` prefix (e.g., `ambient_180`, `ambient_t20`) to create separate sound sets for caller and ambient sounds
- This allows you to have professional voice announcements via the Caller while also having fun sound effects via Sound FX

#### Dual Audio Channels
- Enhanced sound playback with separate audio channels for caller and ambient sounds
- Improved game mode handling for specialized sound triggers
- Better performance with simultaneous sound playback

#### Smart Fallback System
The Sound FX feature includes a sophisticated multi-level fallback system:
- If an exact match with `ambient_` prefix isn't found, it tries without the prefix
- For segment triggers like `ambient_t20`, it tries multiple fallbacks in this order:
  - Exact match: `ambient_t20`
  - Without ambient prefix: `t20`
  - Split into word+number: `ambient_triple` + `ambient_20`
  - Non-ambient word+number: `triple` + `20`
  - Just the number: `20`
- Similar fallback chains exist for double segments (`d16`) and single segments (`s1`)
- For `miss` or `m` prefixed throws, it falls back to `outside` sounds
- In Cricket games, `miss` triggers may fall back to `cricket_miss` sounds
- **Matchshot Fallbacks**: When a player wins a match, the system tries sounds in this order:
  - Player-specific matchshot: `ambient_matchshot_player_name`
  - Player-specific gameshot: `ambient_gameshot_player_name`
  - Generic matchshot: `ambient_matchshot`
  - Generic gameshot: `ambient_gameshot`
- If no match is found after all fallback attempts, no sound is played

#### Text-to-Speech (TTS) Generation
Generate sound effects directly from text without needing external audio files:
- **Generate TTS Button**: Available in the Sound FX settings toolbar alongside Upload and Delete buttons
- **Voice Selection**: Choose from any voice installed on your operating system (varies by platform)
- **Speed & Pitch Control**: Adjust speech rate (0.5x–2x) and pitch (0–2) with sliders
- **Prelisten**: Preview the generated speech before saving
- **Persistent Settings**: Your last-used voice, speed, and pitch are remembered across sessions
- **Cross-Platform**: Works on Desktop (Chrome, Firefox, Edge, Safari), iOS Safari, and Android Chrome using the Web Speech API
- **Trigger Assignment**: Assign triggers to TTS sounds just like any other sound

> [!NOTE]
> TTS sounds use your device's built-in speech synthesis and are generated live during playback. Voice availability and quality depend on your operating system. Short phrases work best for dart calling use cases.

#### Bulk Upload with Trigger Assignment
- **Multi-File Upload**: Upload multiple sound files at once for faster setup
- **Bulk Trigger Assignment**: When "Generate triggers from filenames" is disabled, you can assign the same trigger to all uploaded files at once
- **Efficient Setup**: Makes it easy to set up larger sound sets without manually assigning triggers to each file individually

#### Technical Features
- **Queue Management**: Enhanced sound queue management to prevent overlapping and ensure proper playback order (improved in v2.0.3)
- **Format Support**: Plays both URL-based sounds, base64-encoded audio, and TTS (text-to-speech) sounds
- **IndexedDB Storage**: Efficiently stores sound files in browser database to improve performance
- **Error Handling**: Automatically falls back to alternative sources if a sound fails to play
- **Safari Compatible**: Works with all major browsers including Safari's strict audio policies

### 💡 WLED Integration
The WLED feature allows you to trigger lighting effects and other HTTP requests based on game events, creating an immersive visual experience synchronized with your darts gameplay.

#### What is WLED?
WLED is a popular open-source firmware for controlling addressable LED strips (WS2812B, SK6812, etc.) with ESP8266/ESP32 microcontrollers. It provides a web interface and HTTP API for controlling lighting effects, making it perfect for integrating with Tools for Autodarts.

#### Configuration Options
- **Effect Management**: Add, edit, enable/disable, and reorder lighting effects
- **Board Filtering**: Restrict effects to specific board IDs, with an "other" effect for non-matching boards
- **CSV Import**: Bulk import effects using CSV format: `[name];[url];[trigger1];[trigger2]...`
- **Drag & Drop**: Reorder effects by dragging them in the settings interface
- **URL Validation**: All URLs must use HTTPS for security reasons

#### Supported Triggers
Effects can be triggered by various game events using these triggers:

##### Board Status (only during a game)
- **board_starting**: when the board is going to start
- **board_started**: when the board has started
- **board_stopping**: when the board is going to stop
- **board_stopped**: when the board has stopped
- **manual_reset_done**: after a manual reset (is also triggered when a new round starts)
- **throw**: when a throw is detected
- **last_throw**: when the last throw is detected
- **takeout_finished**: when takeout has finished
- **calibration_started**: when calibration is started
- **calibration_finished**: when calibration has finished

##### Game Events
- **`gameon`**: At the start of each player's turn (default fallback effect)
- **`takeout`**: When takeout is in progress
- **`gameshot`**: When a player wins a game/leg
- **`gameshot+[throwName]`**: When a player wins a game/leg with the specified throw (e.g. `gameshot+d10`)
- **`matchshot`**: When a player wins the entire match
- **`matchshot+[throwName]`**: When a player wins the entire match with the specified throw (e.g. `matchshot+bull`)
- **`busted`**: When a player busts (scores more than needed)
- **`idle`**: When leaving the match (cleanup effect)

##### Point Totals
- **`0` to `180`**: Triggered by the total points scored in a turn
- **Range Format**: `range_[min]_[max]` (e.g., `range_100_180` for scores between 100-180)

##### Individual Dart Throws
- **Singles**: `s1` to `s20`, `s25` (single segments, s25 for single bull)
- **Doubles**: `d1` to `d20`, `bull` (double segments, bull for bullseye)
- **Triples**: `t1` to `t20` (triple segments)
- **`outside`**: When a dart lands outside the scoring area

##### Combination Throws
- **Format**: `[dart1]_[dart2]_[dart3]` (e.g., `t20_t20_t20` for three triple 20s)
- Triggered only when all three darts are thrown in the exact sequence

##### Lobby Events
- **`lobby_in`**: When a player joins the lobby
- **`lobby_out`**: When a player leaves the lobby

##### Tournament Events
- **`tournament_ready`**: Triggered when tournament start event is received via websocket

##### Player-Specific Effects
- **Player Names**: Use the exact player name as it appears in Autodarts. This is triggered instead of the generic `gameon` effect.
- **Spaces**: Player names with spaces are supported (e.g., `john doe`)
- **Underscores**: Alternative format with whitespaces replaced by underscores (e.g., `john_doe`)
- **`bot_throw`**: Triggered when a CPU/bot player throws
- **`gameshot_[player name]`**: player specific gameshot trigger
- **`matchshot_[player name]`**: player specific matchshot trigger

##### Board-Specific Effects
- **Board IDs**: Configure specific board IDs to limit effects to certain boards
- **`other`**: Special trigger for throws on boards not in the configured board ID list
- **Format**: Board IDs are UUIDs (e.g., `6a501a61-53a5-468a-a56a-17134ace3099`)

#### Smart Effect Selection
- **Multiple Effects**: If multiple effects share the same trigger, one is randomly selected
- **Priority System**: More specific effects take precedence over general ones
- **Fallback Logic**: Falls back to `gameon` effect if no specific trigger matches

#### Technical Implementation
- **HTTP Requests**: Effects trigger HTTP GET requests to the specified URLs
- **JSON API**: Effects trigger HTTP POST requests to the specified URLs with the specified JSON body
- **HTTPS Only**: All URLs must use HTTPS protocol for security (HTTP may work in the local network)
- **Debouncing**: Game events are debounced to prevent rapid-fire triggers
- **Error Handling**: Failed requests are silently ignored to prevent interrupting gameplay

#### Example WLED URLs
```
http://wled-device.local/win/PL=1    # Play preset 1
http://wled-device.local/win/A=128   # Set brightness to 128
http://wled-device.local/win/FX=54   # Set effect to 54
http://wled-device.local/win/R=255&G=0&B=0  # Set color to red
```

#### Example WLED JSON API call

WLED API Endpoint: http://wled-device.local/json
```json
{"on":true,"bri":255,"transition":1,"bs":0,"mainseg":0,"seg":[{"id":0,"start":0,"stop":135,"grp":1,"spc":0,"of":0,"on":true,"frz":false,"bri":255,"cct":127,"set":0,"lc":1,"n":"1_0","col":[[0,255,0],[255,0,0],[0,0,255]],"fx":179,"sx":128,"ix":128,"pal":11,"c1":128,"c2":128,"c3":16,"sel":true,"rev":false,"mi":false,"o1":false,"o2":false,"o3":false,"si":0,"m12":0,"bm":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0}]}
```

The current state of the WLED leds can be fetched at http://wled-device.local/json/state. Refer to
https://kno.wled.ge/interfaces/json-api/ for further informations about the json API.


#### CSV Import Format
Import multiple effects at once using this format:
```csv
Effect Name;http://wled-device.local/win/PL=1;gameon
180 Effect;http://wled-device.local/win/PL=2;180
Takeout;http://wled-device.local/win/PL=3;takeout;busted
```

#### Board Filtering
- **Enable Filtering**: Add board IDs (one per line) to restrict effects to specific boards
- **Other Effect**: Create an effect with trigger `other` for throws on non-matching boards
- **Use Cases**: Different effects for different dart boards in multi-board setups

#### Game Mode Support
- **X01 Games**: Full support for all triggers and point combinations
- **ATC, RTW, Shanghai, Bob's 27**: `target[1-20,25,bull]` for the current target 
- **Cricket**: Basic support with plans for expanded cricket-specific triggers
- **Bull-off**: `bulloff` trigger on bull-off rounds

#### Best Practices
1. **Test Effects**: Use the play button in settings to test effects before games
2. **HTTPS URLs**: Always use HTTPS URLs for security compliance
3. **Descriptive Names**: Use clear names for easy effect management
4. **Logical Grouping**: Group related effects together using drag & drop
5. **Backup Settings**: Export your configuration regularly

#### Troubleshooting
- **Effect Not Triggering**: Check that the trigger spelling matches exactly
- **HTTPS Errors**: Ensure your WLED device supports HTTPS
- **Board Filtering**: Verify board IDs are correctly formatted UUIDs
- **URL Format**: Confirm WLED URLs follow the correct API format

### 🎬 Animations

The Animations feature allows you to display custom GIF animations for special events during gameplay:

#### Configuration
- **Delay**: Set how long to wait before showing the animation (in seconds)
- **Duration**: Set how long the animation should display (in seconds)
- **Object Fit**: Choose between 'cover' (fill screen) or 'contain' (maintain aspect ratio)
- **View Mode**: Choose between 'Board Only' (the animation covers the dartboard) or 'Full Page' (it covers the whole page, over a blurred background)
- **Bulk Upload with Trigger Assignment**: When uploading multiple GIF files, you can assign the same trigger to all files at once when "Generate triggers from filenames" is disabled, making it easy to set up larger animation sets

Clicking an animation dismisses it early, so a long GIF never has to be waited out mid-leg.

#### Supported Triggers
Animations can be triggered by various game events using these tags:

- **Points**: `0` to `180` (total points scored in a turn)
- **Ranges**: `100-180` (any turn total within the range; `range_100_180` also works)
- **Singles**: `s0` to `s20` and `25` (single segments, `25` for bull)
- **Doubles**: `d1` to `d20` (double segments, `bull` for bullseye)
- **Triples**: `t1` to `t20` (triple segments)
- **Special Events**:
  - `bull`: When a player hits the bullseye
  - `outside`: When a dart lands outside the scoring area
  - `busted`: When a player busts (scores more than needed)
  - `gameshot`: When a player wins the game or leg

#### Combination Tags
You can also use combination tags to trigger animations based on specific dart throw combinations. Format: `[first dart]_[second dart]_[third dart]`

Example: `s20_s5_d20` would trigger when a player throws single 20, then single 5, then double 20.

You can add multiple triggers for the same animation by entering each trigger on a new line in the animation settings.

> [!NOTE]  
> If you assign the same trigger to multiple animations, the system will randomly select one of the matching animations to play each time the trigger occurs. This allows for variety in your gameplay experience.

### 🔄 Utility Features
- **Settings Import/Export**: Transfer your configuration between devices or create backups
- **Clipboard Support**: Copy and paste settings for easy sharing

## ⚙️ Configuration

The extension provides a comprehensive settings panel where you can configure all features according to your preferences:

- Enable/disable individual features
- Customize colors and appearance
- Set timing for automatic actions
- Configure Discord webhook integration
- Adjust sound settings and upload custom sounds
- Customize streaming mode settings

### 📤 Settings Import/Export

The extension allows you to easily transfer your settings between devices or create backups:

- **Export Settings**: Download your current configuration as a file
- **Import Settings**: Load settings from a previously exported file
- **Copy to Clipboard**: Copy your settings to the clipboard for easy sharing
- **Paste from Clipboard**: Apply settings that were copied from another installation
- **Reset Settings**: Restore all settings to their default values through the Danger Zone section

This makes it simple to:
- Back up your perfect configuration
- Share your setup with friends
- Transfer settings between browsers or devices
- Restore settings after reinstalling the extension
- Start fresh with default settings when needed

## 👨‍💻 Development

This project is built using:
- Vue.js 3
- TypeScript
- Tailwind CSS
- WXT (Web Extension Toolbox)

### 🚀 Getting Started

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build

# Build for Firefox
yarn build:firefox

# Create distribution zip
yarn zip
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request or create an issue if you have ideas for improvements or have found a bug.

Feel free to fork and make a Pull Request to this plugin project. All the input is warmly welcome!

## ⭐️ Show your support
Give a star if this project helped you.

<a href="https://ko-fi.com/creazy231">
  <img width="270px" src="https://storage.ko-fi.com/cdn/brandasset/kofi_button_stroke.png" alt="Support me on Ko-fi">
</a>

## 👏 Credits

🎯 [Autodarts](https://autodarts.com) - The original platform this extension enhances<br>
🎨 Benjamin Zehentner (Discord: ben_1987) - Creator of the Tools for Autodarts logo

## 📄 License

This project is licensed under the [Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0)](LICENSE) - see the [LICENSE](LICENSE) file for details.

Under this license:
- **Attribution** — You must give appropriate credit, provide a link to this project, and indicate if changes were made.
- **NonCommercial** — You may not use this project for commercial purposes or monetary compensation.
