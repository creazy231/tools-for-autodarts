import type { IGameTrigger } from "@/utils/game-events/types";
import type { MatchOptions } from "@/utils/game-events/match";
import type { TriggerUpdate } from "@/utils/game-events/processor";
import type { IMatch } from "@/utils/websocket-helpers";

import { GameMode } from "@/utils/game-modes";
import { AutodartsToolsConfig, type IConfig, type ISound, type ISoundTTS } from "@/utils/storage";
import { getSoundFxFromIndexedDB, isIndexedDBAvailable } from "@/utils/helpers";
import { oneOn, pickPerCategory } from "@/utils/game-events/match";
import { registerTriggers } from "@/utils/game-events/processor";
import { TriggerCategory } from "@/utils/game-events/types";
import { onLanguageChange, t } from "@/utils/i18n";
import { LAYERS } from "@/utils/layers";
import { elementVolumeWorks, soundCopies } from "@/utils/sound-copies";
import { DEFAULT_VOLUME, cappedVolume, planVolume, soundVolume } from "@/utils/sound-volume";
import { isTournamentPage, watchTournamentReady } from "@/utils/tournament-ready";

let unregisterTriggers: (() => void) | null = null;
let tournamentReadyUnwatch: (() => void) | null = null;
let config: IConfig;

/** What Sound FX plays for a game's triggers (utils/game-events/derive.ts). */
const CATEGORIES: readonly TriggerCategory[] = [
  TriggerCategory.START,
  TriggerCategory.PLAYER,
  TriggerCategory.OUTCOME,
  TriggerCategory.THROW,
  TriggerCategory.TOTAL,
  TriggerCategory.COMBO,
  TriggerCategory.VARIANT,
  TriggerCategory.THROWER,
];

/** A win or a bust plays instead of the dart that made it, and its total. */

/**
 * Sound FX's sounds are set up on `ambient_<trigger>`, and on the bare
 * trigger as well, so both are looked up, the prefixed one first.
 */
const MATCH_OPTIONS: MatchOptions = {
  forms: trigger => [ `ambient_${trigger}`, trigger ],
};

// Audio player for Safari compatibility
let audioPlayer: HTMLAudioElement | null = null;
let audioPlayer2: HTMLAudioElement | null = null;
/** A sound waiting its turn, and the volume it plays at (utils/sound-volume.ts). */
interface QueuedSound { url?: string; base64?: string; name?: string; soundId?: string; tts?: ISoundTTS; volume?: number }
// Queue for sounds to be played
const soundQueue: QueuedSound[] = [];
const soundQueue2: QueuedSound[] = [];
// Flag to track if we're currently playing a sound
let isPlaying = false;
let isPlaying2 = false;
// Flag to track if audio has been unlocked
let audioUnlocked = false;
let audioUnlocked2 = false;
// Flag to track if we've shown the interaction notification
let interactionNotificationShown = false;
// Reference to notification element
let notificationElement: HTMLElement | null = null;
// Stops the notice following the site's language once the notice is gone
let stopNoticeLanguage: (() => void) | null = null;
// Reference to the style element for notification
let notificationStyleElement: HTMLStyleElement | null = null;

// Audio element pool for Safari compatibility
const AUDIO_POOL_SIZE = 6;
const audioPool: HTMLAudioElement[] = [];
const audioPool2: HTMLAudioElement[] = [];
let currentAudioIndex = 0;
let currentAudioIndex2 = 0;
// Tracking URLs that need to be revoked
const blobUrlsToRevoke: string[] = [];
// Copies of sounds at volumes their files don't have — see utils/sound-copies.ts
const copies = soundCopies();

// Sounds play one after another so ordered pairs stay in order (the
// "ambient_t19" fallback queues "triple" then "19", and they must not overlap).
// The catch is that a long sound used to hold that lane for its whole length: a
// 17 s gameshot silenced every dart sound behind it and then dumped them in a
// burst seconds after the darts had landed. So a sound only keeps the lane
// while it is short enough to be part of a sequence — anything longer is a
// celebration or a bed, and is left to finish on its own pool element while the
// queue moves on.
const LANE_HOLD_MAX_SECONDS = 3;
// Whatever a sound reports (or fails to report) as its duration, it never holds
// the lane longer than this — covers unknown durations and stalled loads.
const LANE_HOLD_TIMEOUT_MS = 3500;
// The pool element currently holding its channel's lane, if any. Only this
// element's "ended"/"error" advances the queue, so a long fire-and-forget sound
// ending later cannot advance a lane it no longer owns.
let laneHolder: HTMLAudioElement | null = null;
let laneHolder2: HTMLAudioElement | null = null;
let laneTimeout: number | null = null;
let laneTimeout2: number | null = null;
// Bumped whenever a channel's lane is taken or given up. A sound that waited
// for its copy checks it still has its own hold, not just its element: a pool
// element that sat paused through the wait is the first one a later sound takes.
let laneHold = 0;
let laneHold2 = 0;

export async function soundFx() {
  console.log("Autodarts Tools: Sound FX");

  try {
    config = await AutodartsToolsConfig.getValue();
    console.log("Autodarts Tools: Config loaded", config?.soundFx?.sounds?.length || 0, "sounds available");

    // Initialize audio player for Safari compatibility
    initAudioPlayer();

    // Copies of the sounds set to volumes their files don't have, made before they are needed
    void copies.prepare(config.soundFx?.sounds ?? [], sourceOf);

    // What happens in the game comes as triggers, worked out once for every
    // feature (utils/game-events/processor.ts). A won leg reported again and a
    // gameon already played never get here. Board, lobby and opponents' darts
    // play on the second channel, beside the game's own sounds.
    unregisterTriggers ??= registerTriggers({
      feature: "soundFx",
      settings: () => config?.soundFx,
      categories: () => CATEGORIES,
      fallbacks: [ "word", "number", "outside", "missWildcard" ],
      filter: playsInCricket,
      onTriggers: playTriggers,
      onBoard: trigger => playTrigger(trigger, 2),
      onLobby: trigger => playTrigger(trigger, 2),
      onEdit: stopAllSounds,
    });

    // A tournament match of yours waiting for you to mark ready — see
    // utils/tournament-ready.ts. Only a tournament's page draws the card, and
    // the lobby entrypoint starts this on lobbies as well, without a teardown
    // in between, so the watch follows the page it is on.
    if (isTournamentPage()) {
      if (!tournamentReadyUnwatch) {
        tournamentReadyUnwatch = watchTournamentReady(() => {
          if (!config?.soundFx?.enabled) return;
          console.log("Autodarts Tools: Tournament match ready, playing tournament ready sound");
          playTrigger("tournament_ready");
        });
      }
    } else if (tournamentReadyUnwatch) {
      tournamentReadyUnwatch();
      tournamentReadyUnwatch = null;
    }
  } catch (error) {
    console.error("Autodarts Tools: soundFx initialization error", error);
  }
}

export function soundFxOnRemove() {
  console.log("Autodarts Tools: soundFx on remove");
  unregisterTriggers?.();
  unregisterTriggers = null;

  if (tournamentReadyUnwatch) {
    tournamentReadyUnwatch();
    tournamentReadyUnwatch = null;
  }

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

  // Drop both lanes and their watchdogs
  releaseLane(1, false);
  releaseLane(2, false);

  // Drop the copies made at other volumes
  copies.forget();

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

/** True when `play()` was refused because the document has no user gesture yet. */
function isAutoplayBlocked(error: unknown): boolean {
  const message = String(error);
  return message.includes("failed because the user didn't interact with the document first") // chrome
    || message.includes("The play method is not allowed by the user agent") // firefox
    || message.includes("The request is not allowed by the user agent") // safari
    || (error instanceof DOMException && error.name === "NotAllowedError");
}

/**
 * Arms the one-shot listeners that unlock audio on the next user gesture.
 *
 * These are `{ once: true }`, so a gesture that fires them without actually
 * unlocking (autoplay still refused, a race during load) used to consume them
 * for good and leave audio locked for the rest of the page's life. Anything
 * that discovers audio is still locked re-arms them through here.
 */
function armUnlockListeners(): void {
  document.addEventListener("click", unlockAudio, { once: true });
  document.addEventListener("pointerdown", unlockAudio, { once: true });
  document.addEventListener("touchstart", unlockAudio, { once: true });
  document.addEventListener("keydown", unlockAudio, { once: true });
}

/** Frees `channel`'s lane and, unless told otherwise, starts the next sound. */
function releaseLane(channel: number, advance: boolean = true): void {
  if (channel === 2) {
    if (laneTimeout2 !== null) {
      clearTimeout(laneTimeout2);
      laneTimeout2 = null;
    }
    laneHolder2 = null;
    laneHold2++;
    isPlaying2 = false;
    if (advance) playNextSound(2);
  } else {
    if (laneTimeout !== null) {
      clearTimeout(laneTimeout);
      laneTimeout = null;
    }
    laneHolder = null;
    laneHold++;
    isPlaying = false;
    if (advance) playNextSound(1);
  }
}

/** Marks `audioElement` as the sound holding `channel`'s lane. */
function holdLane(audioElement: HTMLAudioElement, channel: number): void {
  if (channel === 2) {
    if (laneTimeout2 !== null) clearTimeout(laneTimeout2);
    laneHolder2 = audioElement;
    laneHold2++;
    laneTimeout2 = window.setTimeout(() => releaseLane(2), LANE_HOLD_TIMEOUT_MS);
  } else {
    if (laneTimeout !== null) clearTimeout(laneTimeout);
    laneHolder = audioElement;
    laneHold++;
    laneTimeout = window.setTimeout(() => releaseLane(1), LANE_HOLD_TIMEOUT_MS);
  }
}

/** The hold `channel`'s lane is on now — see laneHold. */
function holdOf(channel: number): number {
  return channel === 2 ? laneHold2 : laneHold;
}

/** Whether `audioElement` still has the hold it took `channel`'s lane with. */
function stillHolds(audioElement: HTMLAudioElement, channel: number, hold: number): boolean {
  return (channel === 2 ? laneHolder2 : laneHolder) === audioElement && holdOf(channel) === hold;
}

/**
 * Called once a sound is actually playing. A sound too long to be part of a
 * sequence gives the lane back straight away and finishes in the background, so
 * a celebration never silences the dart sounds behind it.
 */
function releaseLaneIfLongSound(audioElement: HTMLAudioElement, channel: number): void {
  if ((channel === 2 ? laneHolder2 : laneHolder) !== audioElement) return;

  const { duration } = audioElement;
  if (Number.isFinite(duration) && duration > LANE_HOLD_MAX_SECONDS) {
    console.log(`Autodarts Tools: ${duration.toFixed(1)}s sound left to play out, freeing channel ${channel}`);
    releaseLane(channel);
  }
}

/**
 * A pool element free to take a new sound, i.e. one that is not mid-playback.
 * Falls back to round-robin so a saturated pool still plays the sound instead
 * of dropping it.
 */
function takeAudioElement(channel: number): HTMLAudioElement | undefined {
  const pool = channel === 2 ? audioPool2 : audioPool;
  const holder = channel === 2 ? laneHolder2 : laneHolder;

  const idle = pool.find(audio => audio !== holder && (audio.paused || audio.ended));
  if (idle) return idle;

  if (channel === 2) {
    const audio = audioPool2[currentAudioIndex2];
    currentAudioIndex2 = (currentAudioIndex2 + 1) % AUDIO_POOL_SIZE;
    return audio;
  }

  const audio = audioPool[currentAudioIndex];
  currentAudioIndex = (currentAudioIndex + 1) % AUDIO_POOL_SIZE;
  return audio;
}

/**
 * Initialize the audio player with Safari compatibility in mind
 */
function initAudioPlayer(): void {
  if (!audioPlayer) {
    audioPlayer = new Audio();

    // This element only ever carries the silent unlock clip, so it never holds
    // the lane — it may start the queue, but only when nothing else is playing.
    audioPlayer.addEventListener("ended", () => {
      if (!isPlaying) playNextSound(1);
    });

    // Handle errors
    audioPlayer.addEventListener("error", (e) => {
      console.error("Autodarts Tools: Audio playback error", e);
      // Move to next sound on error
      if (!isPlaying) playNextSound(1);
    });

    // Initialize audio pool
    for (let i = 0; i < AUDIO_POOL_SIZE; i++) {
      const audio = new Audio();
      audio.addEventListener("ended", () => {
        console.log("Autodarts Tools: Pool audio ended");
        // A long sound that already gave the lane back finishes here; it must
        // not advance a queue it is no longer responsible for.
        if (audio === laneHolder) releaseLane(1);
      });
      audio.addEventListener("error", (error) => {
        console.error("Autodarts Tools: Pool audio error", error);
        armUnlockListeners();
        if (audio === laneHolder) releaseLane(1);
      });
      audioPool.push(audio);
    }

    // Initialize second audio player
    audioPlayer2 = new Audio();

    // Silent unlock clip only, as above
    audioPlayer2.addEventListener("ended", () => {
      if (!isPlaying2) playNextSound(2);
    });

    // Handle errors for second player
    audioPlayer2.addEventListener("error", (e) => {
      console.error("Autodarts Tools: Audio playback error (channel 2)", e);
      // Move to next sound on error
      if (!isPlaying2) playNextSound(2);
    });

    // Initialize second audio pool
    for (let i = 0; i < AUDIO_POOL_SIZE; i++) {
      const audio = new Audio();
      audio.addEventListener("ended", () => {
        console.log("Autodarts Tools: Pool audio ended (channel 2)");
        if (audio === laneHolder2) releaseLane(2);
      });
      audio.addEventListener("error", (error) => {
        console.error("Autodarts Tools: Pool audio error (channel 2)", error);
        armUnlockListeners();
        if (audio === laneHolder2) releaseLane(2);
      });
      audioPool2.push(audio);
    }

    // Unlock audio on first user interaction (required for Safari/iOS)
    armUnlockListeners();
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
        // Still locked: put the one-shot gesture listeners back so the next
        // interaction gets another go, instead of never trying again.
        armUnlockListeners();
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
        armUnlockListeners();
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
        z-index: ${LAYERS.soundStatus};
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
    // Only static markup goes through innerHTML: the words are put in below as text
    notificationElement.innerHTML = `
      <div class="adt-notification-content">
        <div class="adt-notification-message"></div>
        <button class="adt-notification-close" aria-label="">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><!-- Icon from Pixelarticons by Gerrit Halfmann - https://github.com/halfmage/pixelarticons/blob/master/LICENSE --><path fill="currentColor" d="M5 5h2v2H5zm4 4H7V7h2zm2 2H9V9h2zm2 0h-2v2H9v2H7v2H5v2h2v-2h2v-2h2v-2h2v2h2v2h2v2h2v-2h-2v-2h-2v-2h-2zm2-2v2h-2V9zm2-2v2h-2V7zm0 0V5h2v2z"/></svg>
        </button>
      </div>
    `;

    const message = notificationElement.querySelector<HTMLElement>(".adt-notification-message")!;
    const close = notificationElement.querySelector<HTMLElement>(".adt-notification-close")!;

    // The notice waits for a gesture that may be a long way off, and a language picked meanwhile has to reach it
    const paint = () => {
      message.textContent = t("soundFx.audioNotice");
      close.setAttribute("aria-label", t("common.close"));
    };
    paint();
    stopNoticeLanguage?.();
    stopNoticeLanguage = onLanguageChange(paint);

    // Add click listener to close button
    close.addEventListener("click", hideInteractionNotification);

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
  stopNoticeLanguage?.();
  stopNoticeLanguage = null;
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

  stopNoticeLanguage?.();
  stopNoticeLanguage = null;
  interactionNotificationShown = false;
}

/** Cricket plays each dart, and none of a visit's total or its three darts together. */
function playsInCricket(trigger: IGameTrigger, match: IMatch): boolean {
  if (trigger.tag === "cricketScore") return false;
  return match.variant !== GameMode.CRICKET || trigger.category !== TriggerCategory.COMBO;
}

/**
 * Queues the sounds for an update: the best sound of each kind of trigger, in
 * Sound FX's priority order (utils/game-events/priorities.ts). A fallback for a
 * dart with no sound of its own is one of the triggers already ("triple" and
 * the number). A bot's or an opponent's dart plays on the second channel.
 */
function playTriggers({ triggers, context }: TriggerUpdate): void {
  if (!config?.soundFx?.sounds?.length) return;

  const picks = pickPerCategory(config.soundFx.sounds, triggers, { ...MATCH_OPTIONS, context });

  for (const pick of picks) {
    console.log(`Autodarts Tools: Sound FX "${pick.matched}"`);
    const channel = pick.category === TriggerCategory.THROWER ? 2 : 1;
    for (const sound of pick.items) enqueue(sound, channel);
  }
}

/** One of the sounds on a trigger, at random: a board, lobby or tournament event. */
function playTrigger(trigger: string, channel: number = 1): void {
  const sound = oneOn(config?.soundFx?.sounds, trigger, MATCH_OPTIONS);
  if (sound) enqueue(sound, channel);
}

/** Adds a sound to a channel's queue, which plays one sound after another. */
function enqueue(sound: ISound, channel: number): void {
  if (!sound.url && !sound.base64 && !sound.soundId && !sound.tts) return;

  const queued: QueuedSound = {
    url: sound.url,
    base64: sound.base64,
    soundId: sound.soundId,
    name: sound.name,
    volume: soundVolume(sound),
    tts: sound.tts,
  };
  if (channel === 2) {
    soundQueue2.push(queued);
    if (!isPlaying2) playNextSound(2);
  } else {
    soundQueue.push(queued);
    if (!isPlaying) playNextSound(1);
  }
}

/**
 * Play the next sound in the queue
 */
/**
 * Play a TTS sound using the Web Speech API
 */
function playTTSSound(tts: ISoundTTS, channel: number, percent: number = DEFAULT_VOLUME): void {
  if (!window.speechSynthesis) {
    console.error("Autodarts Tools: speechSynthesis not available");
    releaseLane(channel);
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
  // Speech can be turned down, never up
  utterance.volume = cappedVolume(percent);

  // Safety timeout for iOS (10 seconds)
  const safetyTimeout = setTimeout(() => {
    console.warn("Autodarts Tools: TTS safety timeout reached");
    speechSynthesis.cancel();
    releaseLane(channel);
  }, 10000);

  utterance.onend = () => {
    clearTimeout(safetyTimeout);
    console.log("Autodarts Tools: TTS playback ended");
    releaseLane(channel);
  };
  utterance.onerror = (e) => {
    clearTimeout(safetyTimeout);
    console.error("Autodarts Tools: TTS playback error", e);
    releaseLane(channel);
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

    const percent = nextSound.volume ?? DEFAULT_VOLUME;
    const plan = planVolume(percent, elementVolumeWorks());

    // Turned all the way down: nothing plays, and nothing behind it waits
    if (plan.kind === "silent") {
      playNextSound(2);
      return;
    }

    // Handle TTS sounds on channel 2
    if (nextSound.tts) {
      playTTSSound(nextSound.tts, 2, percent);
      return;
    }

    console.log("Autodarts Tools: Playing sound on channel 2");

    try {
      // Take a pool element that is not mid-playback, so a long sound still
      // playing in the background is never cut off to make room
      const audioElement = takeAudioElement(2);

      // Make sure the audio element exists
      if (!audioElement) {
        console.error("Autodarts Tools: Audio element not found in pool for channel 2");
        isPlaying2 = false;
        return;
      }

      // This sound owns the lane until it ends, proves to be a long one, or
      // outstays LANE_HOLD_TIMEOUT_MS
      holdLane(audioElement, 2);

      // Stop any current playback
      audioElement.pause();

      if (plan.kind === "copy") {
        // A volume the file doesn't have plays from a copy made at that volume
        void playCopy(nextSound, audioElement, 2, plan.percent);
      } else {
        // Pool elements are shared, so the last sound's volume must not carry over
        audioElement.volume = plan.volume;

        // Play based on available source (URL, IndexedDB, or base64)
        playWithAvailableSource(nextSound, audioElement, 2);
      }
    } catch (error) {
      console.error("Autodarts Tools: Exception while setting up audio for channel 2", error);
      // Move to next sound on error
      releaseLane(2);
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

    const percent = nextSound.volume ?? DEFAULT_VOLUME;
    const plan = planVolume(percent, elementVolumeWorks());

    // Turned all the way down: nothing plays, and nothing behind it waits
    if (plan.kind === "silent") {
      playNextSound(1);
      return;
    }

    // Handle TTS sounds on channel 1
    if (nextSound.tts) {
      playTTSSound(nextSound.tts, 1, percent);
      return;
    }

    console.log("Autodarts Tools: Playing sound on channel 1");

    try {
      // Take a pool element that is not mid-playback, so a long sound still
      // playing in the background is never cut off to make room
      const audioElement = takeAudioElement(1);

      // Make sure the audio element exists
      if (!audioElement) {
        console.error("Autodarts Tools: Audio element not found in pool for channel 1");
        isPlaying = false;
        return;
      }

      // This sound owns the lane until it ends, proves to be a long one, or
      // outstays LANE_HOLD_TIMEOUT_MS
      holdLane(audioElement, 1);

      // Stop any current playback
      audioElement.pause();

      if (plan.kind === "copy") {
        // A volume the file doesn't have plays from a copy made at that volume
        void playCopy(nextSound, audioElement, 1, plan.percent);
      } else {
        // Pool elements are shared, so the last sound's volume must not carry over
        audioElement.volume = plan.volume;

        // Play based on available source (URL, IndexedDB, or base64)
        playWithAvailableSource(nextSound, audioElement, 1);
      }
    } catch (error) {
      console.error("Autodarts Tools: Exception while setting up audio for channel 1", error);
      // Move to next sound on error
      releaseLane(1);
    }
  }
}

/** The file a sound plays from, found as playWithAvailableSource finds it: its link, then its upload in IndexedDB, then the config's copy. */
async function sourceOf(sound: { url?: string; base64?: string; soundId?: string }): Promise<string | undefined> {
  if (sound.url) return sound.url;
  if (sound.soundId && isIndexedDBAvailable()) {
    try {
      const stored = await getSoundFxFromIndexedDB(sound.soundId);
      if (stored) return stored;
    } catch (error) {
      console.error("Autodarts Tools: Error loading sound from IndexedDB", error);
    }
  }
  return sound.base64 || undefined;
}

/**
 * Plays a queued sound from a copy made at its volume, on the pool element
 * holding `channel`'s lane. The copy is made while the sound holds the lane.
 * If the lane is given up in the meantime (the watchdog, or every sound being
 * stopped) the sound is dropped rather than played late, even when the next
 * sound has taken the same element since. Without a copy it plays the file as
 * it is, as loud as the element goes.
 */
async function playCopy(nextSound: QueuedSound, audioElement: HTMLAudioElement, channel: number, percent: number): Promise<void> {
  const hold = holdOf(channel);
  let copy: string | null = null;
  try {
    const source = await sourceOf(nextSound);
    if (source) copy = await copies.copyAt(source, percent);
  } catch (error) {
    console.error(`Autodarts Tools: A sound could not be made at its volume (channel ${channel})`, error);
  }
  if (!stillHolds(audioElement, channel, hold)) return;

  try {
    if (copy) {
      startCopy(audioElement, copy, channel, hold);
      return;
    }
    audioElement.volume = cappedVolume(percent);
    playWithAvailableSource(nextSound, audioElement, channel);
  } catch (error) {
    console.error(`Autodarts Tools: Exception while setting up audio for channel ${channel}`, error);
    if (stillHolds(audioElement, channel, hold)) releaseLane(channel);
  }
}

/** Plays a copy made at a sound's volume on the pool element holding `channel`'s lane on `hold`. */
function startCopy(audioElement: HTMLAudioElement, copy: string, channel: number, hold: number): void {
  audioElement.volume = 1;
  audioElement.src = copy;
  audioElement.play()
    .then(() => {
      console.log(`Autodarts Tools: Sound playing at its volume (channel ${channel})`);
      if (holdOf(channel) === hold) releaseLaneIfLongSound(audioElement, channel);
    })
    .catch((error) => {
      console.error(`Autodarts Tools: Error playing a sound at its volume (channel ${channel})`, error);
      if (isAutoplayBlocked(error)) {
        showInteractionNotification();
        unlockAudio();
      }
      // Only a hold this sound still has: another may have the lane, or even this element, by now
      if (stillHolds(audioElement, channel, hold)) releaseLane(channel);
    });
}

// Helper function to play sound based on available source
function playWithAvailableSource(
  nextSound: QueuedSound,
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
        releaseLaneIfLongSound(audioElement, channel);
      })
      .catch((error) => {
        console.error(`Autodarts Tools: Error playing URL sound (channel ${channel})`, error);

        // Check if the error is due to user interaction requirement
        if (isAutoplayBlocked(error)) {
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
                playBase64Sound(base64, channel, audioElement);
              } else {
                console.error(`Autodarts Tools: Failed to load sound from IndexedDB (channel ${channel})`);
                // Try base64 if available as final fallback
                if (nextSound.base64) {
                  playBase64Sound(nextSound.base64, channel, audioElement);
                } else {
                  // Move to next sound
                  releaseLane(channel);
                }
              }
            })
            .catch((error) => {
              console.error(`Autodarts Tools: Error loading sound from IndexedDB (channel ${channel})`, error);
              // Try base64 if available as final fallback
              if (nextSound.base64) {
                playBase64Sound(nextSound.base64, channel, audioElement);
              } else {
                // Move to next sound
                releaseLane(channel);
              }
            });
        } else if (nextSound.base64) {
          console.log(`Autodarts Tools: Falling back to base64 after URL failure (channel ${channel})`);
          playBase64Sound(nextSound.base64, channel, audioElement);
        } else {
          // Move to next sound
          releaseLane(channel);
        }
      });
  } else if (nextSound.soundId && isIndexedDBAvailable()) {
    console.log(`Autodarts Tools: Using soundId source (channel ${channel})`);
    // Get the sound from IndexedDB and play it
    getSoundFxFromIndexedDB(nextSound.soundId)
      .then((base64) => {
        if (base64) {
          console.log(`Autodarts Tools: Successfully loaded sound from IndexedDB (channel ${channel})`);
          playBase64Sound(base64, channel, audioElement);
        } else {
          console.error(`Autodarts Tools: Failed to load sound from IndexedDB (channel ${channel})`);
          // Fall back to base64 if available
          if (nextSound.base64) {
            playBase64Sound(nextSound.base64, channel, audioElement);
          } else {
            // Move to next sound
            releaseLane(channel);
          }
        }
      })
      .catch((error) => {
        console.error(`Autodarts Tools: Error loading sound from IndexedDB (channel ${channel})`, error);
        // Fall back to base64 if available
        if (nextSound.base64) {
          playBase64Sound(nextSound.base64, channel, audioElement);
        } else {
          // Move to next sound
          releaseLane(channel);
        }
      });
  } else if (nextSound.base64) { // If no URL or soundId, try base64
    playBase64Sound(nextSound.base64, channel, audioElement);
  } else {
    console.error(`Autodarts Tools: Sound has neither URL, soundId, nor base64 data (channel ${channel})`);
    // Move to next sound
    releaseLane(channel);
  }
}

/**
 * Play a sound from base64 data
 */
function playBase64Sound(base64Data: string, channel: number = 1, reuseElement?: HTMLAudioElement): void {
  console.log(`Autodarts Tools: Using base64 source (channel ${channel})`);

  try {
    // Create a blob URL from the base64 data
    const audioUrl = createAudioBlobUrl(base64Data);

    if (!audioUrl) {
      console.error(`Autodarts Tools: Failed to create audio blob URL (channel ${channel})`);
      releaseLane(channel);
      return;
    }

    // Add URL to tracking array for later revocation
    blobUrlsToRevoke.push(audioUrl);

    // Reuse the element the caller already took the lane with, so a sound
    // reached through the IndexedDB/base64 fallback does not strand it
    const audioElement = reuseElement ?? takeAudioElement(channel);

    // Make sure the audio element exists
    if (!audioElement) {
      console.error(`Autodarts Tools: Audio element not found in pool for base64 (channel ${channel})`);
      URL.revokeObjectURL(audioUrl);
      const index = blobUrlsToRevoke.indexOf(audioUrl);
      if (index > -1) {
        blobUrlsToRevoke.splice(index, 1);
      }
      releaseLane(channel);
      return;
    }

    if (!reuseElement) holdLane(audioElement, channel);

    // Stop any current playback
    audioElement.pause();

    // Set the source to the blob URL
    audioElement.src = audioUrl;

    // Play the sound
    audioElement.play()
      .then(() => {
        console.log(`Autodarts Tools: Base64 sound playing successfully (channel ${channel})`);
        releaseLaneIfLongSound(audioElement, channel);
      })
      .catch((error) => {
        console.error(`Autodarts Tools: Base64 sound playback failed (channel ${channel})`, error);

        // Check if error is due to user interaction requirement
        if (isAutoplayBlocked(error)) {
          showInteractionNotification();
          unlockAudio(); // Try to unlock audio again
        }

        URL.revokeObjectURL(audioUrl);
        const index = blobUrlsToRevoke.indexOf(audioUrl);
        if (index > -1) {
          blobUrlsToRevoke.splice(index, 1);
        }
        releaseLane(channel);
      });
  } catch (error) {
    console.error(`Autodarts Tools: Error processing base64 data (channel ${channel})`, error);
    releaseLane(channel);
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

  // Reset playing flags and hand both lanes back
  releaseLane(1, false);
  releaseLane(2, false);
}
