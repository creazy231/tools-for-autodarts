import { AutodartsToolsGameData, type IGameData } from "@/utils/game-data-storage";
import { AutodartsToolsConfig, type IConfig, type ISound, type ISoundTTS } from "@/utils/storage";
import { getSoundFxFromIndexedDB, isIndexedDBAvailable, triggerPatterns } from "@/utils/helpers";

let gameDataWatcherUnwatch: any;
let lobbyDataWatcherUnwatch: any;
let boardDataWatcherUnwatch: any;
let tournamentReadyObserver: MutationObserver | null = null;
let config: IConfig;

// Audio player for Safari compatibility
let audioPlayer: HTMLAudioElement | null = null;
let audioPlayer2: HTMLAudioElement | null = null;
// Queue for sounds to be played
const soundQueue: { url?: string; base64?: string; name?: string; soundId?: string; tts?: ISoundTTS }[] = [];
const soundQueue2: { url?: string; base64?: string; name?: string; soundId?: string; tts?: ISoundTTS }[] = [];
// Flag to track if we're currently playing a sound
let isPlaying = false;
let isPlaying2 = false;
// Flag to track if audio has been unlocked
let audioUnlocked = false;
let audioUnlocked2 = false;
// Debounce timer for processing game data
let debounceTimer: number | null = null;
// Debounce delay in milliseconds
const DEBOUNCE_DELAY = 200;
// Cooldown tracking for gameshot/matchshot sounds (to prevent multiple triggers from AI referee)
let lastGameshotTimestamp: number = 0;
const GAMESHOT_COOLDOWN_MS = 10000; // 10 seconds cooldown
// Flag to track if we've shown the interaction notification
let interactionNotificationShown = false;
// Reference to notification element
let notificationElement: HTMLElement | null = null;
// Reference to the style element for notification
let notificationStyleElement: HTMLStyleElement | null = null;

// Audio element pool for Safari compatibility
const AUDIO_POOL_SIZE = 3;
const audioPool: HTMLAudioElement[] = [];
const audioPool2: HTMLAudioElement[] = [];
let currentAudioIndex = 0;
let currentAudioIndex2 = 0;
// Tracking URLs that need to be revoked
const blobUrlsToRevoke: string[] = [];

function checkBoardStatus(boardData: IBoard): void {
  const boardEvent = boardData.event;
  const boardStatus = boardData.status;

  if (boardEvent === "Started" && boardStatus === "Throw")
    playSound("ambient_board_started", 2);
  else if (boardEvent === "Stopped" && boardStatus === "Stopped")
    playSound("ambient_board_stopped", 2);
  else if (boardEvent === "Disconnected" && (boardStatus === "Offline" || boardStatus === ""))
    playSound("ambient_board_stopped", 2);
  else if (boardEvent === "Manual reset" && boardStatus === "Throw")
    playSound("ambient_manual_reset_done", 2);
  else if (boardEvent === "Takeout finished" && boardStatus === "Throw")
    playSound("ambient_takeout_finished", 2);
  else if (boardEvent === "Calibration started")
    playSound("ambient_calibration_started", 2);
  else if (boardEvent === "Calibration finished")
    playSound("ambient_calibration_finished", 2);
}

export async function soundFx() {
  console.log("Autodarts Tools: Sound FX");

  try {
    config = await AutodartsToolsConfig.getValue();
    const gameData = await AutodartsToolsGameData.getValue();
    console.log("Autodarts Tools: Config loaded", config?.soundFx?.sounds?.length || 0, "sounds available");

    // Initialize audio player for Safari compatibility
    initAudioPlayer();

    if (!gameDataWatcherUnwatch) {
      gameDataWatcherUnwatch = AutodartsToolsGameData.watch((gameData: IGameData, oldGameData: IGameData) => {
        if (!config?.soundFx?.enabled) return;
        console.log("Autodarts Tools: soundFx game data updated");

        // Debounce the processGameData call
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        debounceTimer = window.setTimeout(() => {
          processGameData(gameData, oldGameData, true);
          debounceTimer = null;
        }, DEBOUNCE_DELAY);
      });

      const url = window.location.href;
      const matchId = url.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)?.[0];

      if (gameData.match?.id === matchId) {
        processGameData(gameData, gameData);
      }
    }

    if (!lobbyDataWatcherUnwatch) {
      lobbyDataWatcherUnwatch = AutodartsToolsLobbyData.watch(async (_lobbyData: ILobbies | undefined, _oldLobbyData: ILobbies | undefined) => {
        if (!_lobbyData || !_oldLobbyData || !config?.soundFx?.enabled) return;

        if ((_lobbyData.players?.length ?? 0) > (_oldLobbyData.players?.length ?? 0) && (_lobbyData.players?.length ?? 0) > 1) {
          const currentURL = window.location.href;
          if (!currentURL.includes("lobbies")) return;
          playSound("ambient_lobby_in", 2);
        }

        if ((_lobbyData.players?.length ?? 0) < (_oldLobbyData.players?.length ?? 0) && (_lobbyData.players?.length ?? 0) > 0) {
          const currentURL = window.location.href;
          if (!currentURL.includes("lobbies")) return;
          playSound("ambient_lobby_out", 2);
        }
      });
    }

    if (!boardDataWatcherUnwatch) {
      boardDataWatcherUnwatch = AutodartsToolsBoardData.watch((boardData: IBoard) => {
        if (!config?.soundFx?.enabled) return;
        checkBoardStatus(boardData);
      });
    }

    if (!tournamentReadyObserver) {
      tournamentReadyObserver = new MutationObserver((mutations) => {
        if (!config?.soundFx?.enabled) return;

        // Check if "Time to ready up" text appears in the DOM
        const bodyText = document.body.textContent || document.body.innerText;
        if (bodyText.includes("Time to ready up") || bodyText.includes("Zeit zum bereitmachen") || bodyText.includes("Tijd om je klaar te maken")) {
          console.log("Autodarts Tools: Found 'Time to ready up' text, playing tournament ready sound");
          playSound("ambient_tournament_ready");

          // Disconnect the observer after playing the sound once
          if (tournamentReadyObserver) {
            tournamentReadyObserver.disconnect();
            tournamentReadyObserver = null;
          }
        }
      });

      // Start observing the body for text changes
      tournamentReadyObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  } catch (error) {
    console.error("Autodarts Tools: soundFx initialization error", error);
  }
}

export function soundFxOnRemove() {
  console.log("Autodarts Tools: soundFx on remove");
  if (gameDataWatcherUnwatch) {
    gameDataWatcherUnwatch();
    gameDataWatcherUnwatch = null;
  }

  if (lobbyDataWatcherUnwatch) {
    lobbyDataWatcherUnwatch();
    lobbyDataWatcherUnwatch = null;
  }

  if (boardDataWatcherUnwatch) {
    boardDataWatcherUnwatch();
    boardDataWatcherUnwatch = null;
  }

  if (tournamentReadyObserver) {
    tournamentReadyObserver.disconnect();
    tournamentReadyObserver = null;
  }

  // Clear any pending debounce timer
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  // Reset gameshot cooldown timestamp
  lastGameshotTimestamp = 0;

  // Cancel any ongoing TTS
  if (window.speechSynthesis) {
    speechSynthesis.cancel();
  }

  // Clean up audio players
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.removeEventListener("ended", () => playNextSound(1));
    audioPlayer = null;
  }

  if (audioPlayer2) {
    audioPlayer2.pause();
    audioPlayer2.removeEventListener("ended", () => playNextSound(2));
    audioPlayer2 = null;
  }

  // Clean up audio pools
  audioPool.forEach((audio) => {
    audio.pause();
    audio.src = "";
    audio.remove();
  });
  audioPool.length = 0;

  audioPool2.forEach((audio) => {
    audio.pause();
    audio.src = "";
    audio.remove();
  });
  audioPool2.length = 0;

  // Revoke any blob URLs
  blobUrlsToRevoke.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Autodarts Tools: Error revoking URL", e);
    }
  });
  blobUrlsToRevoke.length = 0;

  // Remove notification elements if they exist
  removeInteractionNotification();
}

/**
 * Initialize the audio player with Safari compatibility in mind
 */
function initAudioPlayer(): void {
  if (!audioPlayer) {
    audioPlayer = new Audio();

    // Add ended event listener to play the next sound in queue
    audioPlayer.addEventListener("ended", () => playNextSound(1));

    // Handle errors
    audioPlayer.addEventListener("error", (e) => {
      console.error("Autodarts Tools: Audio playback error", e);
      // Move to next sound on error
      playNextSound(1);
    });

    // Initialize audio pool
    for (let i = 0; i < AUDIO_POOL_SIZE; i++) {
      const audio = new Audio();
      audio.addEventListener("ended", () => {
        console.log("Autodarts Tools: Pool audio ended");
        playNextSound(1);
      });
      audio.addEventListener("error", (error) => {
        console.error("Autodarts Tools: Pool audio error", error);
        document.addEventListener("click", unlockAudio, { once: true });
        document.addEventListener("touchstart", unlockAudio, { once: true });
        document.addEventListener("keydown", unlockAudio, { once: true });
        playNextSound(1);
      });
      audioPool.push(audio);
    }

    // Initialize second audio player
    audioPlayer2 = new Audio();

    // Add ended event listener to play the next sound in second queue
    audioPlayer2.addEventListener("ended", () => playNextSound(2));

    // Handle errors for second player
    audioPlayer2.addEventListener("error", (e) => {
      console.error("Autodarts Tools: Audio playback error (channel 2)", e);
      // Move to next sound on error
      playNextSound(2);
    });

    // Initialize second audio pool
    for (let i = 0; i < AUDIO_POOL_SIZE; i++) {
      const audio = new Audio();
      audio.addEventListener("ended", () => {
        console.log("Autodarts Tools: Pool audio ended (channel 2)");
        playNextSound(2);
      });
      audio.addEventListener("error", (error) => {
        console.error("Autodarts Tools: Pool audio error (channel 2)", error);
        document.addEventListener("click", unlockAudio, { once: true });
        document.addEventListener("touchstart", unlockAudio, { once: true });
        document.addEventListener("keydown", unlockAudio, { once: true });
        playNextSound(2);
      });
      audioPool2.push(audio);
    }

    // Unlock audio on first user interaction (required for Safari/iOS)
    document.addEventListener("click", unlockAudio, { once: true });
    document.addEventListener("touchstart", unlockAudio, { once: true });
    document.addEventListener("keydown", unlockAudio, { once: true });
  }
}

/**
 * Unlock audio playback on user interaction (required for Safari/iOS)
 */
function unlockAudio(): void {
  if ((audioUnlocked && audioUnlocked2) || (!audioPlayer && !audioPlayer2)) return;

  console.log("Autodarts Tools: Attempting to unlock audio");

  const silentAudio = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

  // Unlock first audio player
  if (audioPlayer && !audioUnlocked) {
    audioPlayer.src = silentAudio;
    audioPlayer.volume = 0.01;

    // Also unlock all audio pool elements
    audioPool.forEach((audio, i) => {
      audio.src = silentAudio;
      audio.volume = 1;
      // Don't play them all, just load them
      if (i === 0) {
        audio.play().catch(e => console.error("Autodarts Tools: Error unlocking pool audio", e));
      }
    });

    audioPlayer.play()
      .then(() => {
        console.log("Autodarts Tools: Audio unlocked successfully");
        audioUnlocked = true;
        hideInteractionNotification();

        // If we have sounds in the queue, start playing them
        if (soundQueue.length > 0 && !isPlaying) {
          playNextSound(1);
        }
      })
      .catch((error) => {
        console.error("Autodarts Tools: Failed to unlock audio", error);
      });
  }

  // Unlock second audio player
  if (audioPlayer2 && !audioUnlocked2) {
    audioPlayer2.src = silentAudio;
    audioPlayer2.volume = 0.01;

    // Also unlock all audio pool elements for channel 2
    audioPool2.forEach((audio, i) => {
      audio.src = silentAudio;
      audio.volume = 1;
      // Don't play them all, just load them
      if (i === 0) {
        audio.play().catch(e => console.error("Autodarts Tools: Error unlocking pool audio (channel 2)", e));
      }
    });

    audioPlayer2.play()
      .then(() => {
        console.log("Autodarts Tools: Audio channel 2 unlocked successfully");
        audioUnlocked2 = true;
        hideInteractionNotification();

        // If we have sounds in the second queue, start playing them
        if (soundQueue2.length > 0 && !isPlaying2) {
          playNextSound(2);
        }
      })
      .catch((error) => {
        console.error("Autodarts Tools: Failed to unlock audio channel 2", error);
      });
  }
}

/**
 * Shows a notification to inform the user they need to interact with the page
 */
function showInteractionNotification(): void {
  // Return if notification is already shown or if another notification with the same class already exists
  if (interactionNotificationShown || document.querySelector(".adt-notification")) return;

  interactionNotificationShown = true;

  // Add style for notification if not already added
  if (!document.querySelector("style[data-adt-notification-style]")) {
    notificationStyleElement = document.createElement("style");
    notificationStyleElement.setAttribute("data-adt-notification-style", "");
    notificationStyleElement.textContent = `
      .adt-notification {
        position: fixed;
        bottom: 16px;
        right: 32px;
        z-index: 50;
        max-width: 28rem;
        border-radius: 6px;
        padding: 16px;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
        backdrop-filter: blur(4px);
        background-color: rgba(0, 0, 0, 0.4);
        color: white;
      }
      .adt-notification::after {
        content: '';
        position: absolute;
        inset: 0;
        background-color: rgba(220, 38, 38, 0.3);
        border-radius: 6px;
        pointer-events: none;
      }
      .adt-notification-content {
        display: flex;
      }
      .adt-notification-icon {
        margin-right: 8px;
        flex-shrink: 0;
        font-size: 1.25rem;
      }
      .adt-notification-message {
        margin-right: 16px;
        flex-grow: 1;
      }
      .adt-notification-close {
        flex-shrink: 0;
        font-size: 1.25rem;
        opacity: 0.7;
        background: none;
        border: none;
        color: white;
        cursor: pointer;
      }
      .adt-notification-close:hover {
        opacity: 1;
      }
      
      /* Animation classes */
      @keyframes adt-notification-enter {
        from {
          transform: translateY(32px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      .adt-notification {
        animation: adt-notification-enter 300ms ease-out forwards;
      }
    `;
    document.head.appendChild(notificationStyleElement);
  } else {
    // If the style element exists but we don't have a reference to it, get a reference
    notificationStyleElement = document.querySelector("style[data-adt-notification-style]");
  }

  // Create notification element if it doesn't exist
  if (!notificationElement) {
    notificationElement = document.createElement("div");
    notificationElement.className = "adt-notification";
    notificationElement.setAttribute("data-adt-notification-source", "sound-fx");
    notificationElement.innerHTML = `
      <div class="adt-notification-content">
        <div class="adt-notification-message">
          Please interact with the page (click, tap, or press a key) to enable audio for sound effects.
        </div>
        <button class="adt-notification-close">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><!-- Icon from Pixelarticons by Gerrit Halfmann - https://github.com/halfmage/pixelarticons/blob/master/LICENSE --><path fill="currentColor" d="M5 5h2v2H5zm4 4H7V7h2zm2 2H9V9h2zm2 0h-2v2H9v2H7v2H5v2h2v-2h2v-2h2v-2h2v2h2v2h2v2h2v-2h-2v-2h-2v-2h-2zm2-2v2h-2V9zm2-2v2h-2V7zm0 0V5h2v2z"/></svg>
        </button>
      </div>
    `;

    // Add click listener to close button
    const closeButton = notificationElement.querySelector(".adt-notification-close");
    if (closeButton) {
      closeButton.addEventListener("click", hideInteractionNotification);
    }

    // Add the notification to the DOM
    document.body.appendChild(notificationElement);
  } else {
    notificationElement.style.display = "block";
  }
}

/**
 * Hides the interaction notification
 */
function hideInteractionNotification(): void {
  if (notificationElement) {
    notificationElement.remove();
    notificationElement = null;
  }
  interactionNotificationShown = false;
}

/**
 * Completely removes notification elements from the DOM
 */
function removeInteractionNotification(): void {
  // Only remove the notification if it belongs to this feature
  if (notificationElement && notificationElement.getAttribute("data-adt-notification-source") === "sound-fx") {
    notificationElement.remove();
    notificationElement = null;

    // Only remove the style element if no other notifications are present
    if (notificationStyleElement && !document.querySelector(".adt-notification")) {
      notificationStyleElement.remove();
      notificationStyleElement = null;
    }
  }

  interactionNotificationShown = false;
}

/**
 * Process game data to trigger sounds based on game events
 */
async function processGameData(gameData: IGameData, oldGameData: IGameData, fromWebSocket: boolean = false): Promise<void> {
  if (!gameData.match || !gameData.match.turns?.length) return;

  const editMode: boolean = gameData.match.activated !== undefined && gameData.match.activated >= 0;
  if (editMode) {
    // If in edit mode, stop all sounds that are currently playing
    stopAllSounds();
    return;
  }

  if (gameData.match.variant === "Bull-off") return;

  const currentPlayer = gameData.match.players?.[gameData.match.player];
  const isBot = currentPlayer?.cpuPPR !== null;

  // Play gameon sound if it's the first round and variant is not Bull-off
  if (gameData.match.round === 1 && gameData.match.turns[0].throws.length === 0 && gameData.match.player === 0) {
    const playerName = currentPlayer?.name;

    if (isBot) {
      console.log("Autodarts Tools: Bot player detected");
      playSound("ambient_bot");
    } else if (playerName) {
      console.log("Autodarts Tools: Player starting game", playerName);
      // Try to play the player name (both regular and underscore version)
      const playerNameLower = playerName.toLowerCase();
      const playerNameWithUnderscores = playerNameLower.replace(/\s+/g, "_");
      const hasPlayerNameSound = config.soundFx.sounds?.some(sound =>
        sound.enabled && sound.triggers && (
          sound.triggers.includes(`ambient_${playerNameLower}`)
          || sound.triggers.includes(`ambient_${playerNameWithUnderscores}`)
          || sound.triggers.includes(playerNameLower)
          || sound.triggers.includes(playerNameWithUnderscores)
        ),
      );

      if (hasPlayerNameSound) {
        console.log(`Autodarts Tools: Found player name sound for "${playerNameLower}" or "${playerNameWithUnderscores}"`);
        // Try both versions of the name with ambient_ prefix
        playSound(`ambient_${playerNameLower}`);
        if (playerNameWithUnderscores !== playerNameLower) {
          playSound(`ambient_${playerNameWithUnderscores}`);
        }
      }
    }

    // Play gameon after player name/bot
    if (!isSoundInQueue("gameon") && !fromWebSocket) playSound("ambient_gameon");
  } else if (oldGameData?.match?.player !== undefined
    && gameData.match.player !== undefined
    && oldGameData.match.player !== gameData.match.player
    && gameData.match.round >= 1) {
    // Get player name and play sound with player name as trigger
    const playerName = currentPlayer?.name;

    if (isBot) {
      console.log("Autodarts Tools: Bot player detected");
      playSound("ambient_bot");
    } else if (playerName) {
      console.log("Autodarts Tools: Player changed to", playerName);
      // Try to play the player name (both regular and underscore version), if no sound found, fall back to ambient_next_player
      const playerNameLower = playerName.toLowerCase();
      const playerNameWithUnderscores = playerNameLower.replace(/\s+/g, "_");
      const hasPlayerNameSound = config.soundFx.sounds?.some(sound =>
        sound.enabled && sound.triggers && (
          sound.triggers.includes(`ambient_${playerNameLower}`)
          || sound.triggers.includes(`ambient_${playerNameWithUnderscores}`)
          || sound.triggers.includes(playerNameLower)
          || sound.triggers.includes(playerNameWithUnderscores)
        ),
      );

      if (hasPlayerNameSound) {
        console.log(`Autodarts Tools: Found player name sound for "${playerNameLower}" or "${playerNameWithUnderscores}"`);
        // Try both versions of the name with ambient_ prefix
        playSound(`ambient_${playerNameLower}`);
        if (playerNameWithUnderscores !== playerNameLower) {
          playSound(`ambient_${playerNameWithUnderscores}`);
        }
      } else {
        playSound("ambient_next_player");
      }
    } else {
      playSound("ambient_next_player");
    }
  }

  // For Cricket, trigger appropriate sound based on what was hit
  if (gameData.match.variant === "Cricket"
      && gameData.match.turns[0].throws.length > 0
      && (!oldGameData?.match?.turns?.[0]?.throws
      || gameData.match.turns[0].throws.length > oldGameData.match.turns[0].throws.length)) {
    const latestThrow = gameData.match.turns[0].throws[gameData.match.turns[0].throws.length - 1];
    if (latestThrow) {
      // Get the segment number (extract number from segment name)
      const segmentName = latestThrow.segment.name.toLowerCase();
      let segmentNumber = 0;

      if (segmentName === "bull" || segmentName === "25") {
        segmentNumber = 25;
      } else if (segmentName.includes("miss") || segmentName.includes("outside")) {
        segmentNumber = 0;
      } else {
        // Extract number from segment name (s1, d2, t3, etc.)
        const match = segmentName.match(/[sdt](\d+)/i);
        if (match && match[1]) {
          segmentNumber = Number.parseInt(match[1], 10);
        }
      }

      const gameMode = gameData.match.settings?.gameMode;
      const segmentNumberToScore = gameMode === "Tactics" ? 10 : 15;

      // Cricket targets are segmentNumberToScore-20 and Bull (25)
      if (segmentNumber >= segmentNumberToScore) {
        // Get the segment number from the latest throw
        let stateIndex = latestThrow.segment.number;

        // Special case: if it's a double bull (50), use 25 as the index
        if (stateIndex === 50) {
          stateIndex = 25;
        }

        // Check if this segment is already closed for all players (value 3)
        const segmentValues = oldGameData?.match?.state?.segments?.[stateIndex] || [];
        const allPlayersClosed = segmentValues.length > 0 && segmentValues.every(value => value >= 3);

        if (allPlayersClosed) {
          // Segment is already closed by all players, play miss sound
          playSound("cricket_miss");
        } else {
          // Segment is not closed by all players, play hit sound
          playSound("cricket_hit");
        }
      } else {
        // Target Miss - Anything Miss-14
        playSound("cricket_miss");
      }
    }
  } else if (gameData.match.variant === 'Gotcha') {
    const currentScores = gameData.match.gameScores;
    const previousScores = oldGameData?.match?.gameScores;
    if (previousScores && previousScores.length === currentScores.length
      && currentScores[gameData.match.player] > 0
      && currentScores.some((score, i) => score === 0 && previousScores[i] > 0)) {
      playSound("ambient_gotcha");
    }
  }

  const currentThrow = gameData.match.turns[0].throws[gameData.match.turns[0].throws.length - 1];
  if (!currentThrow) return;

  // const currentPlayerIndex = gameData.match.player;
  const isLastThrow: boolean = gameData.match.turns[0].throws.length >= 3;
  const throwName: string = currentThrow.segment.name; // S1
  const throwBed: string = currentThrow.segment.bed;
  const winner: boolean = gameData.match.gameWinner >= 0; // use this for ambient_gameshot_match later || (gameData.match.variant === "X01" && gameData.match.gameScores[currentPlayerIndex] === 0);
  const winnerMatch: boolean = gameData.match.winner >= 0;
  const busted: boolean = gameData.match.turns[0].busted;
  const points: number = gameData.match.turns[0].points;
  const combinedThrows: string = gameData.match.turns[0].throws.map(t => t.segment.name.toLowerCase()).join("_");

  if (isBot && gameData.match.turns[0].throws.length > 0 && oldGameData?.match?.turns?.[0]?.throws?.length !== gameData.match.turns[0].throws.length) {
    playSound("bot_throw", 2);
  }

  // For non-Cricket variants, use normal sound logic
  if (gameData.match.variant !== "Cricket") {
    if (winner) {
      // Check cooldown to prevent multiple gameshot/matchshot sounds (e.g., from AI referee)
      const now = Date.now();
      if (now - lastGameshotTimestamp < GAMESHOT_COOLDOWN_MS) {
        console.log("Autodarts Tools: Skipping ambient gameshot/matchshot sound due to cooldown");
        return;
      }
      lastGameshotTimestamp = now;

      // Check if there's a winner player index and name available
      const winnerPlayerName = gameData.match.players?.[gameData.match.gameWinner]?.name;

      if (winnerPlayerName) {
        // First try to play player-specific gameshot sound with underscores
        const playerSpecificTrigger = `ambient_${winnerMatch ? "matchshot" : "gameshot"}_${winnerPlayerName.toLowerCase().replace(/\s+/g, "_")}`;
        console.log(`Autodarts Tools: Trying player-specific ${winnerMatch ? "matchshot" : "gameshot"} sound "${playerSpecificTrigger}"`);

        // Check if the player-specific sound with underscores exists
        const playerSpecificSoundExists = config?.soundFx?.sounds?.some(sound =>
          sound.enabled && sound.triggers && (
            sound.triggers.includes(playerSpecificTrigger)
            || sound.triggers.includes(playerSpecificTrigger.replace("ambient_", ""))
          ),
        );

        if (playerSpecificSoundExists) {
          playSound(playerSpecificTrigger);
        } else {
          // Try with spaces instead of underscores
          const playerSpecificTriggerWithSpaces = `ambient_${winnerMatch ? "matchshot" : "gameshot"}_${winnerPlayerName.toLowerCase()}`;
          console.log(`Autodarts Tools: Trying alternate player-specific ${winnerMatch ? "matchshot" : "gameshot"} sound "${playerSpecificTriggerWithSpaces}"`);

          const playerSpecificSoundWithSpacesExists = config?.soundFx?.sounds?.some(sound =>
            sound.enabled && sound.triggers && (
              sound.triggers.includes(playerSpecificTriggerWithSpaces)
              || sound.triggers.includes(playerSpecificTriggerWithSpaces.replace("ambient_", ""))
            ),
          );

          if (playerSpecificSoundWithSpacesExists) {
            playSound(playerSpecificTriggerWithSpaces);
          } else {
            // If this is a matchshot but we couldn't find player-specific matchshot sound, try gameshot variant
            if (winnerMatch) {
              const gameWinnerSpecificTrigger = `ambient_gameshot_${winnerPlayerName.toLowerCase().replace(/\s+/g, "_")}`;
              console.log(`Autodarts Tools: No matchshot sound found for "${winnerPlayerName}", trying gameshot variant "${gameWinnerSpecificTrigger}"`);

              const gamePlayerSpecificSoundExists = config?.soundFx?.sounds?.some(sound =>
                sound.enabled && sound.triggers && (
                  sound.triggers.includes(gameWinnerSpecificTrigger)
                  || sound.triggers.includes(gameWinnerSpecificTrigger.replace("ambient_", ""))
                ),
              );

              if (gamePlayerSpecificSoundExists) {
                playSound(gameWinnerSpecificTrigger);
              } else {
                // Finally try with spaces instead of underscores for gameshot
                const gamePlayerSpecificTriggerWithSpaces = `ambient_gameshot_${winnerPlayerName.toLowerCase()}`;
                const gamePlayerSpecificSoundWithSpacesExists = config?.soundFx?.sounds?.some(sound =>
                  sound.enabled && sound.triggers && (
                    sound.triggers.includes(gamePlayerSpecificTriggerWithSpaces)
                    || sound.triggers.includes(gamePlayerSpecificTriggerWithSpaces.replace("ambient_", ""))
                  ),
                );

                if (gamePlayerSpecificSoundWithSpacesExists) {
                  playSound(gamePlayerSpecificTriggerWithSpaces);
                } else {
                  // Fallback to regular matchshot/gameshot sound if no player-specific sound found
                  console.log(`Autodarts Tools: No player-specific sound found for "${winnerPlayerName}", falling back to standard ${winnerMatch ? "matchshot" : "gameshot"}`);
                  playSound(winnerMatch ? "ambient_matchshot" : "ambient_gameshot");
                }
              }
            } else {
              // Fallback to regular gameshot sound if no player-specific sound found
              console.log(`Autodarts Tools: No player-specific gameshot sound found for "${winnerPlayerName}", falling back to standard gameshot`);
              playSound("ambient_gameshot");
            }
          }
        }
      } else {
        // Fallback if no player name available
        if (winnerMatch) {
          playSound("ambient_matchshot");
        } else {
          playSound("ambient_gameshot");
        }
      }
    } else if (busted) {
      playSound("ambient_busted");
    } else if (isLastThrow) {
      // Special case: if throwName is "25" and throwBed is "Single", check for "ambient_s25" first
      if (throwName.toLowerCase() === "25" && throwBed === "Single") {
        const hasS25Sound = config.soundFx.sounds?.some(sound =>
          sound.enabled && sound.triggers && (
            sound.triggers.includes("ambient_s25")
            || sound.triggers.includes("s25")
          ),
        );
        if (hasS25Sound) {
          playSound("ambient_s25");
        } else {
          playSound(`ambient_${throwName.toLowerCase()}`);
        }
      } else {
        playSound(`ambient_${throwName.toLowerCase()}`);
      }
      playSound(`ambient_${points}`);
      playSound(`ambient_${combinedThrows}`);
    } else {
      // Special case: if throwName is "25" and throwBed is "Single", check for "ambient_s25" first
      if (throwName.toLowerCase() === "25" && throwBed === "Single") {
        const hasS25Sound = config.soundFx.sounds?.some(sound =>
          sound.enabled && sound.triggers && (
            sound.triggers.includes("ambient_s25")
            || sound.triggers.includes("s25")
          ),
        );
        if (hasS25Sound) {
          playSound("ambient_s25");
        } else {
          playSound(`ambient_${throwName.toLowerCase()}`);
        }
      } else {
        playSound(`ambient_${throwName.toLowerCase()}`);
      }
    }
  } else {
    // For Cricket, handle winner and busted sounds (not the individual throws which are handled above)
    if (winner) {
      // Check cooldown to prevent multiple gameshot/matchshot sounds (e.g., from AI referee)
      const now = Date.now();
      if (now - lastGameshotTimestamp < GAMESHOT_COOLDOWN_MS) {
        console.log("Autodarts Tools: Skipping ambient gameshot/matchshot sound due to cooldown (Cricket)");
        return;
      }
      lastGameshotTimestamp = now;

      // Same winner logic as non-Cricket
      const winnerPlayerName = gameData.match.players?.[gameData.match.gameWinner]?.name;

      if (winnerPlayerName) {
        const playerSpecificTrigger = `ambient_gameshot_${winnerPlayerName.toLowerCase().replace(/\s+/g, "_")}`;
        if (config?.soundFx?.sounds?.some(sound =>
          sound.enabled && sound.triggers && (
            sound.triggers.includes(playerSpecificTrigger)
            || sound.triggers.includes(playerSpecificTrigger.replace("ambient_", ""))
          ),
        )) {
          playSound(playerSpecificTrigger);
        } else {
          const playerSpecificTriggerWithSpaces = `ambient_gameshot_${winnerPlayerName.toLowerCase()}`;
          if (config?.soundFx?.sounds?.some(sound =>
            sound.enabled && sound.triggers && (
              sound.triggers.includes(playerSpecificTriggerWithSpaces)
              || sound.triggers.includes(playerSpecificTriggerWithSpaces.replace("ambient_", ""))
            ),
          )) {
            playSound(playerSpecificTriggerWithSpaces);
          } else {
            playSound("ambient_gameshot");
          }
        }
      } else {
        playSound("ambient_gameshot");
      }
    } else if (busted) {
      playSound("ambient_busted");
    } else {
      // Special case: if throwName is "25" and throwBed is "Single", check for "ambient_s25" first
      if (throwName.toLowerCase() === "25" && throwBed === "Single") {
        const hasS25Sound = config.soundFx.sounds?.some(sound =>
          sound.enabled && sound.triggers && (
            sound.triggers.includes("ambient_s25")
            || sound.triggers.includes("s25")
          ),
        );
        if (hasS25Sound) {
          playSound("ambient_s25");
        } else {
          playSound(`ambient_${throwName.toLowerCase()}`);
        }
      } else {
        playSound(`ambient_${throwName.toLowerCase()}`);
      }
    }
  }
}

/**
 * Play a sound based on the trigger
 * Adds the sound to a queue to be played sequentially
 */
function playSound(trigger: string, soundChannel: number = 1): void {
  if (!config?.soundFx?.sounds || !config.soundFx.sounds.length) {
    console.log("Autodarts Tools: No sounds configured");
    return;
  }

  // Find all sounds that match the trigger
  let matchingSounds = config.soundFx.sounds.filter((sound) => {
    if (!sound.enabled || !sound.triggers) return false;

    // Check for direct match
    if (sound.triggers.includes(trigger)) return true;

    // Validate range triggers of sound
    // Extract number from trigger (handle ambient_ prefix)
    let triggerNum = Number(trigger);
    if (Number.isNaN(triggerNum) && trigger.startsWith("ambient_")) {
      triggerNum = Number(trigger.replace("ambient_", ""));
    }

    if (!Number.isNaN(triggerNum)) {
      const rangeTriggers = sound.triggers.map((t: string) => {
        // Check both with and without ambient_ prefix
        const triggerToCheck = t.startsWith("ambient_") ? t.replace("ambient_", "") : t;
        const match = triggerToCheck.match(triggerPatterns.ranges);
        if (!match) return null;
        return { min: Number(match[1]), max: Number(match[2]), original: t };
      }).filter(x => x !== null);

      const hasMatchingRange = rangeTriggers.some((rangeTrigger) => {
        const { min, max, original } = rangeTrigger;
        const matches = triggerNum >= min && triggerNum <= max;
        if (matches) {
          console.log(`Autodarts Tools: Range trigger "${original}" matches ${triggerNum} (range: ${min}-${max})`);
        }
        return matches;
      });

      if (hasMatchingRange) return true;
    }

    return false;
  });

  // If no direct match, try to find a fallback without the ambient_ prefix
  if (!matchingSounds.length && trigger.startsWith("ambient_")) {
    const withoutAmbientPrefix = trigger.replace("ambient_", "");
    console.log(`Autodarts Tools: Trying fallback sound for "${trigger}" -> "${withoutAmbientPrefix}"`);

    // Special case for t and d prefixes - first check for the direct number combination (e.g., t19, d20)
    if ((withoutAmbientPrefix.startsWith("t") || withoutAmbientPrefix.startsWith("d"))
        && withoutAmbientPrefix.length > 1 && /^\d+$/.test(withoutAmbientPrefix.substring(1))) {
      const firstChar = withoutAmbientPrefix.charAt(0).toLowerCase();
      const typeWord = firstChar === "t" ? "triple" : "double";
      const number = withoutAmbientPrefix.substring(1);

      // First try to find the direct combination (e.g., t19) without ambient prefix
      const directNumberSounds = config.soundFx.sounds.filter(sound =>
        sound.enabled && sound.triggers && sound.triggers.includes(withoutAmbientPrefix),
      );

      if (directNumberSounds.length) {
        console.log(`Autodarts Tools: Found direct sound for ${withoutAmbientPrefix}`);
        matchingSounds = directNumberSounds;
      } else {
        console.log(`Autodarts Tools: Special fallback - checking for ambient_${typeWord} and generic combinations`);

        // Check for ambient_triple/ambient_double
        const wordSounds = config.soundFx.sounds.filter(sound =>
          sound.enabled && sound.triggers && sound.triggers.includes(`ambient_${typeWord}`),
        );

        if (wordSounds.length) {
          console.log(`Autodarts Tools: Found ambient_${typeWord} for fallback`);

          // Find matching number sounds
          const numberSounds = config.soundFx.sounds.filter(sound =>
            sound.enabled && sound.triggers && (
              sound.triggers.includes(`ambient_${number}`)
              || sound.triggers.includes(number)
            ),
          );

          if (numberSounds.length) {
            console.log(`Autodarts Tools: Using ambient_${typeWord} + number fallback chain`);
            // Play the combined sounds
            playTripleWithNumber(wordSounds, numberSounds);
            return;
          } else {
            // Play just the word sound if no matching number sound
            console.log(`Autodarts Tools: Using only ambient_${typeWord} fallback (no number sound found)`);

            // Play the word fallback sound (triple/double)
            const randomIndex = Math.floor(Math.random() * wordSounds.length);
            const soundToPlay = wordSounds[randomIndex];

            if (soundToPlay.url || soundToPlay.base64 || soundToPlay.soundId || soundToPlay.tts) {
              // Add to queue
              if (soundChannel === 2) {
                soundQueue2.push({
                  url: soundToPlay.url,
                  base64: soundToPlay.base64,
                  soundId: soundToPlay.soundId,
                  name: soundToPlay.name,
                  tts: soundToPlay.tts,
                });

                // Start playing if not already playing
                if (!isPlaying2) {
                  playNextSound(2);
                }
              } else {
                soundQueue.push({
                  url: soundToPlay.url,
                  base64: soundToPlay.base64,
                  soundId: soundToPlay.soundId,
                  name: soundToPlay.name,
                  tts: soundToPlay.tts,
                });

                // Start playing if not already playing
                if (!isPlaying) {
                  playNextSound(1);
                }
              }
              return; // Exit early since we've handled the sound
            }
          }
        }

        // Also check for non-ambient version (double/triple) if ambient version not found
        const nonAmbientWordSounds = config.soundFx.sounds.filter(sound =>
          sound.enabled && sound.triggers && sound.triggers.includes(typeWord),
        );

        if (nonAmbientWordSounds.length) {
          console.log(`Autodarts Tools: Found non-ambient ${typeWord} for fallback`);

          // Find matching number sounds
          const numberSounds = config.soundFx.sounds.filter(sound =>
            sound.enabled && sound.triggers && sound.triggers.includes(number),
          );

          if (numberSounds.length) {
            console.log(`Autodarts Tools: Using ${typeWord} + number fallback chain`);
            // Play the combined sounds
            playTripleWithNumber(nonAmbientWordSounds, numberSounds);
            return;
          } else {
            // Play just the word sound if no matching number sound
            console.log(`Autodarts Tools: Using only ${typeWord} fallback (no number sound found)`);

            // Play the word fallback sound (triple/double)
            const randomIndex = Math.floor(Math.random() * nonAmbientWordSounds.length);
            const soundToPlay = nonAmbientWordSounds[randomIndex];

            if (soundToPlay.url || soundToPlay.base64 || soundToPlay.soundId || soundToPlay.tts) {
              // Add to queue
              if (soundChannel === 2) {
                soundQueue2.push({
                  url: soundToPlay.url,
                  base64: soundToPlay.base64,
                  soundId: soundToPlay.soundId,
                  name: soundToPlay.name,
                  tts: soundToPlay.tts,
                });

                // Start playing if not already playing
                if (!isPlaying2) {
                  playNextSound(2);
                }
              } else {
                soundQueue.push({
                  url: soundToPlay.url,
                  base64: soundToPlay.base64,
                  soundId: soundToPlay.soundId,
                  name: soundToPlay.name,
                  tts: soundToPlay.tts,
                });

                // Start playing if not already playing
                if (!isPlaying) {
                  playNextSound(1);
                }
              }
              return; // Exit early since we've handled the sound
            }
          }
        }
      }
    }

    // Standard fallback to non-ambient version if we haven't found matches yet
    if (!matchingSounds.length) {
      matchingSounds = config.soundFx.sounds.filter((sound) => {
        if (!sound.enabled || !sound.triggers) return false;

        // Check for direct match
        if (sound.triggers.includes(withoutAmbientPrefix)) return true;

        // Validate range triggers of sound for numeric triggers
        const triggerNum = Number(withoutAmbientPrefix);
        if (!Number.isNaN(triggerNum)) {
          const rangeTriggers = sound.triggers.map((t: string) => {
            const match = t.match(triggerPatterns.ranges);
            if (!match) return null;
            return { min: Number(match[1]), max: Number(match[2]), original: t };
          }).filter(x => x !== null);

          const hasMatchingRange = rangeTriggers.some((rangeTrigger) => {
            const { min, max, original } = rangeTrigger;
            const matches = triggerNum >= min && triggerNum <= max;
            if (matches) {
              console.log(`Autodarts Tools: Range trigger "${original}" matches ${triggerNum} (range: ${min}-${max})`);
            }
            return matches;
          });

          if (hasMatchingRange) return true;
        }

        return false;
      });

      if (matchingSounds.length) {
        console.log(`Autodarts Tools: Using fallback sound for "${trigger}" -> "${withoutAmbientPrefix}"`);
      }
    }
  }

  // Continue with existing fallback logic for t, d, s prefixes, etc.
  // If still no match, try to find a fallback only for s, d, or t prefixes
  if (!matchingSounds.length && trigger.length > 1) {
    // Handle both ambient_ prefixed and non-ambient prefixed triggers
    const triggerWithoutAmbient = trigger.startsWith("ambient_")
      ? trigger.replace("ambient_", "")
      : trigger;

    const firstChar = triggerWithoutAmbient.charAt(0).toLowerCase();

    // Check for miss prefix (m) and fallback to "outside" or "cricket_miss" for Cricket
    // But only if the trigger doesn't contain an underscore (to avoid combined throws)
    if (firstChar === "m" && !triggerWithoutAmbient.includes("_")) {
      const numberAfterM = Number.parseInt(triggerWithoutAmbient.substring(1));
      if (!Number.isNaN(numberAfterM) && numberAfterM >= 1 && numberAfterM <= 20) {
        // Try ambient_miss first (though we're already here because it wasn't found)
        matchingSounds = config.soundFx.sounds.filter(sound =>
          sound.enabled && sound.triggers && sound.triggers.includes("ambient_miss"),
        );

        // If no ambient_miss, try ambient_outside
        if (!matchingSounds.length) {
          matchingSounds = config.soundFx.sounds.filter(sound =>
            sound.enabled && sound.triggers && sound.triggers.includes("ambient_outside"),
          );

          if (matchingSounds.length) {
            console.log("Autodarts Tools: Using fallback sound \"ambient_outside\" for miss");
          }
        }

        // If no ambient_outside, try miss
        if (!matchingSounds.length) {
          matchingSounds = config.soundFx.sounds.filter(sound =>
            sound.enabled && sound.triggers && sound.triggers.includes("miss"),
          );

          if (matchingSounds.length) {
            console.log("Autodarts Tools: Using fallback sound \"miss\"");
          }
        }

        // If no miss, try outside as final fallback
        if (!matchingSounds.length) {
          matchingSounds = config.soundFx.sounds.filter(sound =>
            sound.enabled && sound.triggers && sound.triggers.includes("outside"),
          );

          if (matchingSounds.length) {
            console.log("Autodarts Tools: Using final fallback sound \"outside\" for miss");
          }
        }
      }
    } else if (firstChar === "t") {
      // For triple (t) prefix, try multiple fallbacks
      const number = triggerWithoutAmbient.substring(1);

      // Only proceed if the rest is a number
      if (/^\d+$/.test(number)) {
        console.log(`Autodarts Tools: Using fallback chain for "${trigger}"`);

        // Complex fallback chain for triples
        // Try ambient_triple first
        let tripleSounds = config.soundFx.sounds.filter(sound =>
          sound.enabled && sound.triggers && sound.triggers.includes("ambient_triple"),
        );

        let singleSounds: ISound[] = [];
        let numberSounds: ISound[] = [];

        // Check if we have ambient_s<number> and ambient_<number> sounds for second part
        if (tripleSounds.length) {
          singleSounds = config.soundFx.sounds.filter(sound =>
            sound.enabled && sound.triggers && sound.triggers.includes(`ambient_s${number}`),
          );

          if (singleSounds.length) {
            console.log(`Autodarts Tools: Using "ambient_triple" + "ambient_s${number}" fallback`);
            playTripleWithNumber(tripleSounds, singleSounds);
            return;
          }

          numberSounds = config.soundFx.sounds.filter(sound =>
            sound.enabled && sound.triggers && sound.triggers.includes(`ambient_${number}`),
          );

          if (numberSounds.length) {
            console.log(`Autodarts Tools: Using "ambient_triple" + "ambient_${number}" fallback`);
            playTripleWithNumber(tripleSounds, numberSounds);
            return;
          }

          // Even if no number sound found, play the triple sound alone
          console.log("Autodarts Tools: Using \"ambient_triple\" alone (no number sound found)");
          const randomTripleIndex = Math.floor(Math.random() * tripleSounds.length);
          const tripleSoundToPlay = tripleSounds[randomTripleIndex];

          if (tripleSoundToPlay.url || tripleSoundToPlay.base64 || tripleSoundToPlay.soundId || tripleSoundToPlay.tts) {
            soundQueue.push({
              url: tripleSoundToPlay.url,
              base64: tripleSoundToPlay.base64,
              soundId: tripleSoundToPlay.soundId,
              name: tripleSoundToPlay.name,
              tts: tripleSoundToPlay.tts,
            });

            // Start playing if not already playing
            if (!isPlaying) {
              playNextSound(1);
            }
            return;
          }
        }

        // Try non-ambient "triple" if ambient version not found
        tripleSounds = config.soundFx.sounds.filter(sound =>
          sound.enabled && sound.triggers && sound.triggers.includes("triple"),
        );

        if (tripleSounds.length) {
          singleSounds = config.soundFx.sounds.filter(sound =>
            sound.enabled && sound.triggers && sound.triggers.includes(`s${number}`),
          );

          if (singleSounds.length) {
            console.log(`Autodarts Tools: Using "triple" + "s${number}" fallback`);
            playTripleWithNumber(tripleSounds, singleSounds);
            return;
          }

          numberSounds = config.soundFx.sounds.filter(sound =>
            sound.enabled && sound.triggers && sound.triggers.includes(number),
          );

          if (numberSounds.length) {
            console.log(`Autodarts Tools: Using "triple" + "${number}" fallback`);
            playTripleWithNumber(tripleSounds, numberSounds);
            return;
          }

          // Even if no number sound found, play the triple sound alone
          console.log("Autodarts Tools: Using \"triple\" alone (no number sound found)");
          const randomTripleIndex = Math.floor(Math.random() * tripleSounds.length);
          const tripleSoundToPlay = tripleSounds[randomTripleIndex];

          if (tripleSoundToPlay.url || tripleSoundToPlay.base64 || tripleSoundToPlay.soundId || tripleSoundToPlay.tts) {
            soundQueue.push({
              url: tripleSoundToPlay.url,
              base64: tripleSoundToPlay.base64,
              soundId: tripleSoundToPlay.soundId,
              name: tripleSoundToPlay.name,
              tts: tripleSoundToPlay.tts,
            });

            // Start playing if not already playing
            if (!isPlaying) {
              playNextSound(1);
            }
            return;
          }
        }

        // No fallback to just the number - removing this as it's not intended behavior
        console.log("Autodarts Tools: No triple sound combinations found, not falling back to number");
      }
    }
    // Rest of the original fallback logic...
  }

  // Special case: fallback from "miss" to "outside" or "cricket_miss" for Cricket
  if (!matchingSounds.length && trigger.toLowerCase() === "ambient_miss") {
    // For Cricket variant, check for cricket_miss sound first
    matchingSounds = config.soundFx.sounds.filter(sound =>
      sound.enabled && sound.triggers && (
        sound.triggers.includes("ambient_cricket_miss")
        || sound.triggers.includes("cricket_miss")
      ),
    );

    if (matchingSounds.length) {
      console.log("Autodarts Tools: Using Cricket-specific fallback sound \"cricket_miss\"");
    } else {
      // Fall back to outside if cricket_miss not found
      matchingSounds = config.soundFx.sounds.filter(sound =>
        sound.enabled && sound.triggers && (
          sound.triggers.includes("ambient_outside")
          || sound.triggers.includes("outside")
        ),
      );

      if (matchingSounds.length) {
        console.log("Autodarts Tools: Using fallback sound for \"ambient_miss\" -> \"ambient_outside\" or \"outside\"");
      }
    }
  }

  // Special case: fallback from singles (ambient_s#) to number (ambient_#)
  if (!matchingSounds.length && trigger.toLowerCase().startsWith("ambient_s") && /^\d+$/.test(trigger.substring(9))) {
    const number = trigger.substring(9);
    console.log(`Autodarts Tools: Trying fallback from "${trigger}" to "ambient_${number}"`);

    matchingSounds = config.soundFx.sounds.filter((sound) => {
      if (!sound.enabled || !sound.triggers) return false;

      // Check for direct match
      if (sound.triggers.includes(`ambient_${number}`)) return true;

      // Validate range triggers
      const triggerNum = Number(number);
      if (!Number.isNaN(triggerNum)) {
        const rangeTriggers = sound.triggers.map((t: string) => {
          // Check both with and without ambient_ prefix
          const triggerToCheck = t.startsWith("ambient_") ? t.replace("ambient_", "") : t;
          const match = triggerToCheck.match(triggerPatterns.ranges);
          if (!match) return null;
          return { min: Number(match[1]), max: Number(match[2]), original: t };
        }).filter(x => x !== null);

        const hasMatchingRange = rangeTriggers.some((rangeTrigger) => {
          const { min, max, original } = rangeTrigger;
          const matches = triggerNum >= min && triggerNum <= max;
          if (matches) {
            console.log(`Autodarts Tools: Range trigger "${original}" matches ${triggerNum} (range: ${min}-${max})`);
          }
          return matches;
        });

        if (hasMatchingRange) return true;
      }

      return false;
    });

    if (matchingSounds.length) {
      console.log(`Autodarts Tools: Using fallback sound for "${trigger}" -> "ambient_${number}"`);
    } else {
      // Try without ambient prefix
      matchingSounds = config.soundFx.sounds.filter((sound) => {
        if (!sound.enabled || !sound.triggers) return false;

        // Check for direct match
        if (sound.triggers.includes(number)) return true;

        // Validate range triggers
        const triggerNum = Number(number);
        if (!Number.isNaN(triggerNum)) {
          const rangeTriggers = sound.triggers.map((t: string) => {
            // Check both with and without ambient_ prefix
            const triggerToCheck = t.startsWith("ambient_") ? t.replace("ambient_", "") : t;
            const match = triggerToCheck.match(triggerPatterns.ranges);
            if (!match) return null;
            return { min: Number(match[1]), max: Number(match[2]), original: t };
          }).filter(x => x !== null);

          const hasMatchingRange = rangeTriggers.some((rangeTrigger) => {
            const { min, max, original } = rangeTrigger;
            const matches = triggerNum >= min && triggerNum <= max;
            if (matches) {
              console.log(`Autodarts Tools: Range trigger "${original}" matches ${triggerNum} (range: ${min}-${max})`);
            }
            return matches;
          });

          if (hasMatchingRange) return true;
        }

        return false;
      });

      if (matchingSounds.length) {
        console.log(`Autodarts Tools: Using fallback sound for "${trigger}" -> "${number}"`);
      }
    }
  }

  // Final check: if trigger is a number (with or without ambient_ prefix), check range triggers
  if (!matchingSounds.length) {
    // Extract number from trigger (handle ambient_ prefix)
    let triggerNum = Number(trigger);
    if (Number.isNaN(triggerNum) && trigger.startsWith("ambient_")) {
      triggerNum = Number(trigger.replace("ambient_", ""));
    }

    if (!Number.isNaN(triggerNum)) {
      const rangeTriggers = config.soundFx.sounds.filter((sound) => {
        if (!sound.enabled || !sound.triggers) return false;

        return sound.triggers.some((t: string) => {
          // Check both with and without ambient_ prefix
          const triggerToCheck = t.startsWith("ambient_") ? t.replace("ambient_", "") : t;
          const match = triggerToCheck.match(triggerPatterns.ranges);
          if (!match) return false;
          const min = Number(match[1]);
          const max = Number(match[2]);
          const matches = triggerNum >= min && triggerNum <= max;
          if (matches) {
            console.log(`Autodarts Tools: Range trigger "${t}" matches ${triggerNum} (range: ${min}-${max})`);
          }
          return matches;
        });
      });

      if (rangeTriggers.length) {
        console.log(`Autodarts Tools: Found range trigger match for "${trigger}" (value: ${triggerNum})`);
        matchingSounds = rangeTriggers;
      }
    }
  }

  // Special case: fallback from "ambient_matchshot" to "ambient_gameshot"
  if (!matchingSounds.length && trigger.toLowerCase() === "ambient_matchshot") {
    matchingSounds = config.soundFx.sounds.filter(sound =>
      sound.enabled && sound.triggers && (
        sound.triggers.includes("ambient_gameshot")
        || sound.triggers.includes("gameshot")
      ),
    );

    if (matchingSounds.length) {
      console.log("Autodarts Tools: Using fallback sound for \"ambient_matchshot\" -> \"ambient_gameshot\" or \"gameshot\"");
    }
  }

  // Helper function to play a triple/double sound followed by a number sound
  function playTripleWithNumber(wordSounds: ISound[], numberSounds: ISound[]) {
    // Play the word fallback sound (triple/double)
    const randomWordIndex = Math.floor(Math.random() * wordSounds.length);
    const wordSoundToPlay = wordSounds[randomWordIndex];

    // Add word to queue
    if (wordSoundToPlay.url || wordSoundToPlay.base64 || wordSoundToPlay.soundId || wordSoundToPlay.tts) {
      if (soundChannel === 2) {
        soundQueue2.push({
          url: wordSoundToPlay.url,
          base64: wordSoundToPlay.base64,
          soundId: wordSoundToPlay.soundId,
          name: wordSoundToPlay.name,
          tts: wordSoundToPlay.tts,
        });

        // Add number to queue
        const randomNumberIndex = Math.floor(Math.random() * numberSounds.length);
        const numberSoundToPlay = numberSounds[randomNumberIndex];

        if (numberSoundToPlay.url || numberSoundToPlay.base64 || numberSoundToPlay.soundId || numberSoundToPlay.tts) {
          soundQueue2.push({
            url: numberSoundToPlay.url,
            base64: numberSoundToPlay.base64,
            soundId: numberSoundToPlay.soundId,
            name: numberSoundToPlay.name,
            tts: numberSoundToPlay.tts,
          });
          console.log("Autodarts Tools: Added number sound to queue (channel 2)");
        } else {
          console.log("Autodarts Tools: Number sound has no playable source");
        }

        // Start playing if not already playing
        if (!isPlaying2) {
          playNextSound(2);
        }
      } else {
        soundQueue.push({
          url: wordSoundToPlay.url,
          base64: wordSoundToPlay.base64,
          soundId: wordSoundToPlay.soundId,
          name: wordSoundToPlay.name,
          tts: wordSoundToPlay.tts,
        });

        // Add number to queue
        const randomNumberIndex = Math.floor(Math.random() * numberSounds.length);
        const numberSoundToPlay = numberSounds[randomNumberIndex];

        if (numberSoundToPlay.url || numberSoundToPlay.base64 || numberSoundToPlay.soundId || numberSoundToPlay.tts) {
          soundQueue.push({
            url: numberSoundToPlay.url,
            base64: numberSoundToPlay.base64,
            soundId: numberSoundToPlay.soundId,
            name: numberSoundToPlay.name,
            tts: numberSoundToPlay.tts,
          });
          console.log("Autodarts Tools: Added number sound to queue");
        } else {
          console.log("Autodarts Tools: Number sound has no playable source");
        }

        // Start playing if not already playing
        if (!isPlaying) {
          playNextSound(1);
        }
      }
    }
  }

  // If we found matching sounds
  if (matchingSounds.length) {
    // If multiple sounds match the trigger, pick a random one
    const randomIndex = Math.floor(Math.random() * matchingSounds.length);
    const soundToPlay = matchingSounds[randomIndex];

    console.log(`Autodarts Tools: Found matching sound ${soundToPlay.name} (channel ${soundChannel})`);

    // Check if there's a soundId that we need to load from IndexedDB
    if (soundToPlay.soundId && isIndexedDBAvailable()) {
      console.log(`Autodarts Tools: Loading sound from IndexedDB ${soundToPlay.soundId} (channel ${soundChannel})`);

      // Get the sound from IndexedDB and play it
      getSoundFxFromIndexedDB(soundToPlay.soundId)
        .then((base64) => {
          if (base64) {
            console.log(`Autodarts Tools: Successfully loaded sound from IndexedDB (channel ${soundChannel})`);
            // Add to queue
            if (soundChannel === 2) {
              soundQueue2.push({
                url: soundToPlay.url,
                base64,
                name: soundToPlay.name,
              });

              // Start playing if not already playing
              if (!isPlaying2) {
                playNextSound(2);
              }
            } else {
              soundQueue.push({
                url: soundToPlay.url,
                base64,
                name: soundToPlay.name,
              });

              // Start playing if not already playing
              if (!isPlaying) {
                playNextSound(1);
              }
            }
          } else {
            console.error("Autodarts Tools: Failed to load sound from IndexedDB");
            // Fall back to URL if available
            if (soundToPlay.url) {
              if (soundChannel === 2) {
                soundQueue2.push({
                  url: soundToPlay.url,
                  base64: undefined,
                  name: soundToPlay.name,
                });

                // Start playing if not already playing
                if (!isPlaying2) {
                  playNextSound(2);
                }
              } else {
                soundQueue.push({
                  url: soundToPlay.url,
                  base64: undefined,
                  name: soundToPlay.name,
                });

                // Start playing if not already playing
                if (!isPlaying) {
                  playNextSound(1);
                }
              }
            }
          }
        })
        .catch((error) => {
          console.error("Autodarts Tools: Error loading sound from IndexedDB", error);
          // Fall back to URL if available
          if (soundToPlay.url) {
            if (soundChannel === 2) {
              soundQueue2.push({
                url: soundToPlay.url,
                base64: undefined,
                name: soundToPlay.name,
              });

              // Start playing if not already playing
              if (!isPlaying2) {
                playNextSound(2);
              }
            } else {
              soundQueue.push({
                url: soundToPlay.url,
                base64: undefined,
                name: soundToPlay.name,
              });

              // Start playing if not already playing
              if (!isPlaying) {
                playNextSound(1);
              }
            }
          }
        });
    } else {
      // Use URL, base64, or TTS directly from the sound object
      // Add to queue
      if (soundToPlay.url || soundToPlay.base64 || soundToPlay.tts) {
        if (soundChannel === 2) {
          soundQueue2.push({
            url: soundToPlay.url,
            base64: soundToPlay.base64,
            name: soundToPlay.name,
            tts: soundToPlay.tts,
          });

          // Start playing if not already playing
          if (!isPlaying2) {
            playNextSound(2);
          }
        } else {
          soundQueue.push({
            url: soundToPlay.url,
            base64: soundToPlay.base64,
            name: soundToPlay.name,
            tts: soundToPlay.tts,
          });

          // Start playing if not already playing
          if (!isPlaying) {
            playNextSound(1);
          }
        }
      }
    }
  } else {
    console.log(`Autodarts Tools: No sound found for trigger "${trigger}" (channel ${soundChannel})`);
  }
}

/**
 * Play the next sound in the queue
 */
/**
 * Play a TTS sound using the Web Speech API
 */
function playTTSSound(tts: ISoundTTS, channel: number): void {
  if (!window.speechSynthesis) {
    console.error("Autodarts Tools: speechSynthesis not available");
    playNextSound(channel);
    return;
  }

  const utterance = new SpeechSynthesisUtterance(tts.text);
  const voices = speechSynthesis.getVoices();

  // Try exact voice match by URI
  let voice = voices.find(v => v.voiceURI === tts.voiceURI);
  // Fallback: match by language
  if (!voice && tts.lang) {
    voice = voices.find(v => v.lang === tts.lang);
  }
  if (voice) utterance.voice = voice;

  utterance.rate = tts.rate;
  utterance.pitch = tts.pitch;

  // Safety timeout for iOS (10 seconds)
  const safetyTimeout = setTimeout(() => {
    console.warn("Autodarts Tools: TTS safety timeout reached");
    speechSynthesis.cancel();
    playNextSound(channel);
  }, 10000);

  utterance.onend = () => {
    clearTimeout(safetyTimeout);
    console.log("Autodarts Tools: TTS playback ended");
    playNextSound(channel);
  };
  utterance.onerror = (e) => {
    clearTimeout(safetyTimeout);
    console.error("Autodarts Tools: TTS playback error", e);
    playNextSound(channel);
  };

  speechSynthesis.speak(utterance);
}

function playNextSound(channel: number = 1): void {
  if (channel === 2) {
    console.log("Autodarts Tools: playNextSound called for channel 2, queue length:", soundQueue2.length);

    if (soundQueue2.length === 0) {
      console.log("Autodarts Tools: Sound queue for channel 2 is empty");
      isPlaying2 = false;
      return;
    }

    isPlaying2 = true;
    const nextSound = soundQueue2.shift();

    console.log("Autodarts Tools: Next sound to play on channel 2:", nextSound?.name);

    if (!nextSound) {
      console.error("Autodarts Tools: nextSound for channel 2 is unexpectedly empty even though queue had items");
      isPlaying2 = false;
      return;
    }

    if (!nextSound.url && !nextSound.base64 && !nextSound.soundId && !nextSound.tts) {
      console.error("Autodarts Tools: Sound for channel 2 has neither URL, base64 data, soundId, nor TTS");
      // Move to next sound
      playNextSound(2);
      return;
    }

    // Handle TTS sounds on channel 2
    if (nextSound.tts) {
      playTTSSound(nextSound.tts, 2);
      return;
    }

    console.log("Autodarts Tools: Playing sound on channel 2");

    try {
      // Get the next audio element from the pool
      const audioElement = audioPool2[currentAudioIndex2];

      // Make sure the audio element exists
      if (!audioElement) {
        console.error("Autodarts Tools: Audio element not found in pool for channel 2");
        isPlaying2 = false;
        return;
      }

      // Update index for next use
      currentAudioIndex2 = (currentAudioIndex2 + 1) % AUDIO_POOL_SIZE;

      // Stop any current playback
      audioElement.pause();

      // Play based on available source (URL, IndexedDB, or base64)
      playWithAvailableSource(nextSound, audioElement, 2);
    } catch (error) {
      console.error("Autodarts Tools: Exception while setting up audio for channel 2", error);
      // Move to next sound on error
      playNextSound(2);
    }
  } else {
    console.log("Autodarts Tools: playNextSound called for channel 1, queue length:", soundQueue.length);

    if (soundQueue.length === 0) {
      console.log("Autodarts Tools: Sound queue for channel 1 is empty");
      isPlaying = false;
      return;
    }

    isPlaying = true;
    const nextSound = soundQueue.shift();

    console.log("Autodarts Tools: Next sound to play on channel 1:", nextSound?.name);

    if (!nextSound) {
      console.error("Autodarts Tools: nextSound for channel 1 is unexpectedly empty even though queue had items");
      isPlaying = false;
      return;
    }

    if (!nextSound.url && !nextSound.base64 && !nextSound.soundId && !nextSound.tts) {
      console.error("Autodarts Tools: Sound for channel 1 has neither URL, base64 data, soundId, nor TTS");
      // Move to next sound
      playNextSound(1);
      return;
    }

    // Handle TTS sounds on channel 1
    if (nextSound.tts) {
      playTTSSound(nextSound.tts, 1);
      return;
    }

    console.log("Autodarts Tools: Playing sound on channel 1");

    try {
      // Get the next audio element from the pool
      const audioElement = audioPool[currentAudioIndex];

      // Make sure the audio element exists
      if (!audioElement) {
        console.error("Autodarts Tools: Audio element not found in pool for channel 1");
        isPlaying = false;
        return;
      }

      // Update index for next use
      currentAudioIndex = (currentAudioIndex + 1) % AUDIO_POOL_SIZE;

      // Stop any current playback
      audioElement.pause();

      // Play based on available source (URL, IndexedDB, or base64)
      playWithAvailableSource(nextSound, audioElement, 1);
    } catch (error) {
      console.error("Autodarts Tools: Exception while setting up audio for channel 1", error);
      // Move to next sound on error
      playNextSound(1);
    }
  }
}

// Helper function to play sound based on available source
function playWithAvailableSource(
  nextSound: { url?: string; base64?: string; name?: string; soundId?: string },
  audioElement: HTMLAudioElement,
  channel: number,
): void {
  // Try URL first, then soundId (from IndexedDB), then base64
  if (nextSound.url) {
    console.log(`Autodarts Tools: Using URL source (channel ${channel})`);

    // Set the source to the URL
    audioElement.src = nextSound.url;

    // Play the sound
    audioElement.play()
      .then(() => {
        console.log(`Autodarts Tools: URL sound playing successfully (channel ${channel})`);
      })
      .catch((error) => {
        console.error(`Autodarts Tools: Error playing URL sound (channel ${channel})`, error);

        // Check if the error is due to user interaction requirement
        if (
          error.toString().includes("failed because the user didn't interact with the document first") // chrome
          || error.toString().includes("The play method is not allowed by the user agent") // firefox
          || error.toString().includes("The request is not allowed by the user agent") // safari
        ) {
          showInteractionNotification();
          unlockAudio(); // Try to unlock audio again
        }

        // If URL fails and we have soundId or base64, try that as fallback
        if (nextSound.soundId && isIndexedDBAvailable()) {
          console.log(`Autodarts Tools: Falling back to soundId after URL failure (channel ${channel})`);
          // Get the sound from IndexedDB and play it
          getSoundFxFromIndexedDB(nextSound.soundId)
            .then((base64) => {
              if (base64) {
                console.log(`Autodarts Tools: Successfully loaded sound from IndexedDB (channel ${channel})`);
                playBase64Sound(base64, channel);
              } else {
                console.error(`Autodarts Tools: Failed to load sound from IndexedDB (channel ${channel})`);
                // Try base64 if available as final fallback
                if (nextSound.base64) {
                  playBase64Sound(nextSound.base64, channel);
                } else {
                  // Move to next sound
                  playNextSound(channel);
                }
              }
            })
            .catch((error) => {
              console.error(`Autodarts Tools: Error loading sound from IndexedDB (channel ${channel})`, error);
              // Try base64 if available as final fallback
              if (nextSound.base64) {
                playBase64Sound(nextSound.base64, channel);
              } else {
                // Move to next sound
                playNextSound(channel);
              }
            });
        } else if (nextSound.base64) {
          console.log(`Autodarts Tools: Falling back to base64 after URL failure (channel ${channel})`);
          playBase64Sound(nextSound.base64, channel);
        } else {
          // Move to next sound
          playNextSound(channel);
        }
      });
  } else if (nextSound.soundId && isIndexedDBAvailable()) {
    console.log(`Autodarts Tools: Using soundId source (channel ${channel})`);
    // Get the sound from IndexedDB and play it
    getSoundFxFromIndexedDB(nextSound.soundId)
      .then((base64) => {
        if (base64) {
          console.log(`Autodarts Tools: Successfully loaded sound from IndexedDB (channel ${channel})`);
          playBase64Sound(base64, channel);
        } else {
          console.error(`Autodarts Tools: Failed to load sound from IndexedDB (channel ${channel})`);
          // Fall back to base64 if available
          if (nextSound.base64) {
            playBase64Sound(nextSound.base64, channel);
          } else {
            // Move to next sound
            playNextSound(channel);
          }
        }
      })
      .catch((error) => {
        console.error(`Autodarts Tools: Error loading sound from IndexedDB (channel ${channel})`, error);
        // Fall back to base64 if available
        if (nextSound.base64) {
          playBase64Sound(nextSound.base64, channel);
        } else {
          // Move to next sound
          playNextSound(channel);
        }
      });
  } else if (nextSound.base64) { // If no URL or soundId, try base64
    playBase64Sound(nextSound.base64, channel);
  } else {
    console.error(`Autodarts Tools: Sound has neither URL, soundId, nor base64 data (channel ${channel})`);
    // Move to next sound
    playNextSound(channel);
  }
}

/**
 * Play a sound from base64 data
 */
function playBase64Sound(base64Data: string, channel: number = 1): void {
  console.log(`Autodarts Tools: Using base64 source (channel ${channel})`);

  try {
    // Create a blob URL from the base64 data
    const audioUrl = createAudioBlobUrl(base64Data);

    if (!audioUrl) {
      console.error(`Autodarts Tools: Failed to create audio blob URL (channel ${channel})`);
      playNextSound(channel);
      return;
    }

    // Add URL to tracking array for later revocation
    blobUrlsToRevoke.push(audioUrl);

    // Get the next audio element from the pool
    const audioElement = channel === 2 ? audioPool2[currentAudioIndex2] : audioPool[currentAudioIndex];

    // Make sure the audio element exists
    if (!audioElement) {
      console.error(`Autodarts Tools: Audio element not found in pool for base64 (channel ${channel})`);
      URL.revokeObjectURL(audioUrl);
      const index = blobUrlsToRevoke.indexOf(audioUrl);
      if (index > -1) {
        blobUrlsToRevoke.splice(index, 1);
      }
      playNextSound(channel);
      return;
    }

    // Update index for next use
    if (channel === 2) {
      currentAudioIndex2 = (currentAudioIndex2 + 1) % AUDIO_POOL_SIZE;
    } else {
      currentAudioIndex = (currentAudioIndex + 1) % AUDIO_POOL_SIZE;
    }

    // Stop any current playback
    audioElement.pause();

    // Set the source to the blob URL
    audioElement.src = audioUrl;

    // Play the sound
    audioElement.play()
      .then(() => {
        console.log(`Autodarts Tools: Base64 sound playing successfully (channel ${channel})`);
      })
      .catch((error) => {
        console.error(`Autodarts Tools: Base64 sound playback failed (channel ${channel})`, error);

        // Check if error is due to user interaction requirement
        if (
          error.toString().includes("failed because the user didn't interact with the document first") // chrome
          || error.toString().includes("The play method is not allowed by the user agent") // firefox
          || error.toString().includes("The request is not allowed by the user agent") // safari
        ) {
          showInteractionNotification();
          unlockAudio(); // Try to unlock audio again
        }

        URL.revokeObjectURL(audioUrl);
        const index = blobUrlsToRevoke.indexOf(audioUrl);
        if (index > -1) {
          blobUrlsToRevoke.splice(index, 1);
        }
        playNextSound(channel);
      });
  } catch (error) {
    console.error(`Autodarts Tools: Error processing base64 data (channel ${channel})`, error);
    playNextSound(channel);
  }
}

/**
 * Create a blob URL from base64 data
 * Returns null if the conversion fails
 */
function createAudioBlobUrl(base64Data: string): string | null {
  try {
    // First, extract the actual base64 data if it's a data URL
    let rawBase64 = base64Data;

    // If it's a data URL (starts with data:), extract just the base64 part
    if (base64Data.startsWith("data:")) {
      const commaIndex = base64Data.indexOf(",");
      if (commaIndex !== -1) {
        rawBase64 = base64Data.substring(commaIndex + 1);
      } else {
        console.error("Autodarts Tools: Invalid data URL format");
        return null;
      }
    }

    // Clean the base64 string - remove whitespace, newlines, etc.
    rawBase64 = rawBase64.replace(/[\s\r\n]+/g, "");

    // Handle potential padding issues
    // Base64 strings should have a length that is a multiple of 4
    while (rawBase64.length % 4 !== 0) {
      rawBase64 += "=";
    }

    // Remove any characters that aren't valid in base64
    rawBase64 = rawBase64.replace(/[^A-Za-z0-9+/=]/g, "");

    // Decode base64 to binary
    let binaryString: string;
    try {
      binaryString = window.atob(rawBase64);
    } catch (e) {
      console.error("Autodarts Tools: Base64 decoding failed", e);

      // Log a sample of the problematic string to help with debugging
      console.error("Autodarts Tools: Problem with base64 string:",
        rawBase64.length > 50 ? `${rawBase64.substring(0, 50)}...` : rawBase64);

      return null;
    }

    // Create a typed array from the binary string
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create a blob and object URL
    // Try to determine the MIME type from the data URL if available
    let mimeType = "audio/mpeg"; // Default MIME type
    if (base64Data.startsWith("data:")) {
      const mimeMatch = base64Data.match(/^data:([^;]+);/);
      if (mimeMatch && mimeMatch[1]) {
        mimeType = mimeMatch[1];
      }
    }

    const blob = new Blob([ bytes ], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Autodarts Tools: Failed to create blob URL", error);
    return null;
  }
}

// Clean up blob URLs periodically to prevent memory leaks
setInterval(() => {
  if (blobUrlsToRevoke.length > 20) {
    console.log("Autodarts Tools: Cleaning up blob URLs", blobUrlsToRevoke.length);
    // Keep the 5 most recent URLs (they might still be in use)
    const urlsToKeep = blobUrlsToRevoke.slice(-5);
    const urlsToRemove = blobUrlsToRevoke.slice(0, -5);

    urlsToRemove.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("Autodarts Tools: Error revoking URL", e);
      }
    });

    blobUrlsToRevoke.length = 0;
    blobUrlsToRevoke.push(...urlsToKeep);
  }
}, 60000); // Check every minute

/**
 * Stops all currently playing sounds and clears the sound queue
 */
function stopAllSounds(): void {
  console.log("Autodarts Tools: Stopping all sounds due to edit mode");

  // Clear the sound queues
  soundQueue.length = 0;
  soundQueue2.length = 0;

  // Stop the main audio players if they exist
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
  }

  if (audioPlayer2) {
    audioPlayer2.pause();
    audioPlayer2.currentTime = 0;
  }

  // Stop all audio elements in the pools
  audioPool.forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });

  audioPool2.forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });

  // Reset playing flags
  isPlaying = false;
  isPlaying2 = false;
}

// Helper function to check if a sound trigger is already in queue
function isSoundInQueue(trigger: string): boolean {
  // Find all sounds that match the trigger from config
  const matchingSounds = config.soundFx.sounds?.filter(sound =>
    sound.enabled && sound.triggers && sound.triggers.includes(trigger),
  ) || [];

  // Check if any of the matching sounds are in the queue
  return soundQueue.some(queuedSound =>
    matchingSounds.some(matchingSound =>
      queuedSound.url === matchingSound.url
      && queuedSound.base64 === matchingSound.base64
      && queuedSound.soundId === matchingSound.soundId,
    ),
  );
}
