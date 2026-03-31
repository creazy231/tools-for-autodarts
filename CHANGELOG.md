# Changelog

All notable changes to this project will be documented in this file.

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