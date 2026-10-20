import type { IGameTrigger } from "@/utils/game-events/types";
import type { TriggerUpdate } from "@/utils/game-events/processor";
import type { IMatch } from "@/utils/websocket-helpers";

import { GameMode } from "@/utils/game-modes";
import { AutodartsToolsConfig, type IConfig, type ISound, type ISoundTTS } from "@/utils/storage";
import { getSoundFromIndexedDB, isIndexedDBAvailable } from "@/utils/helpers";
import { oneOn, pickPerCategory } from "@/utils/game-events/match";
import { registerTriggers } from "@/utils/game-events/processor";
import { TriggerCategory } from "@/utils/game-events/types";
import { onLanguageChange, t } from "@/utils/i18n";
import { LAYERS } from "@/utils/layers";
import { elementVolumeWorks, soundCopies } from "@/utils/sound-copies";
import { DEFAULT_VOLUME, cappedVolume, isLink, planVolume, soundVolume } from "@/utils/sound-volume";

let unregisterTriggers: (() => void) | null = null;
let config: IConfig;

/** A win or a bust is called instead of the dart that made it, and its total. */
/** A sound waiting its turn, and the volume it plays at (utils/sound-volume.ts). */
interface QueuedSound { url?: string; base64?: string; name?: string; soundId?: string; tts?: ISoundTTS; volume?: number }

// Audio player for Safari compatibility
let audioPlayer: HTMLAudioElement | null = null;
// Queue for sounds to be played
const soundQueue: QueuedSound[] = [];
// Flag to track if we're currently playing a sound
let isPlaying = false;
// Flag to track if audio has been unlocked
let audioUnlocked = false;
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
let currentAudioIndex = 0;

// Calls play strictly one after another, because a score is queued as separate
// clips ("one hundred" then "eighty") that are unintelligible on top of each
// other. The catch is that a long clip used to hold that lane for its whole
// length, so everything behind it went silent and then arrived in a burst. A
// clip therefore only keeps the lane while it is short enough to be part of a
// spoken sequence; a longer one plays out on its own pool element while the
// queue moves on. Generous, so real caller packs stay perfectly sequential.
const LANE_HOLD_MAX_SECONDS = 5;
// However long a clip claims to be, it never holds the lane past this — covers
// unknown durations and stalled loads.
const LANE_HOLD_TIMEOUT_MS = 6000;
// The pool element holding the lane, if any. Only this element's "ended"/"error"
// advances the queue, so a long clip finishing later cannot advance a lane it
// no longer owns.
let laneHolder: HTMLAudioElement | null = null;
let laneTimeout: number | null = null;
// Bumped whenever the lane is taken or given up. A sound that waited for its
// copy checks it still has its own hold, not just its element: a pool element
// that sat paused through the wait is the first one a later sound takes.
let laneHold = 0;
// Tracking URLs that need to be revoked
const blobUrlsToRevoke: string[] = [];
// Copies of sounds at volumes their files don't have — see utils/sound-copies.ts
const copies = soundCopies();

export async function caller() {
  console.log("Autodarts Tools: caller");

  try {
    config = await AutodartsToolsConfig.getValue();
    console.log("Autodarts Tools: Config loaded", config?.caller?.sounds?.length || 0, "sounds available");

    // Initialize audio player for Safari compatibility
    initAudioPlayer();

    // Copies of the sounds set to volumes their files don't have, made before they are needed
    void copies.prepare(config.caller?.sounds ?? [], sourceOf);

    // What happens in the game comes as triggers, worked out once for every
    // feature (utils/game-events/processor.ts). A won leg reported again, the
    // bull-off going on and a gameon already called never get here.
    unregisterTriggers ??= registerTriggers({
      feature: "caller",
      settings: () => config?.caller,
      categories: callerCategories,
      fallbacks: [ "word", "number", "outside", "missWildcard" ],
      filter: callsInCricket,
      onTriggers: callTriggers,
      onBoard: callBoardTrigger,
      onEdit: stopAllSounds,
    });
  } catch (error) {
    console.error("Autodarts Tools: caller initialization error", error);
  }
}

export function callerOnRemove() {
  console.log("Autodarts Tools: caller on remove");
  unregisterTriggers?.();
  unregisterTriggers = null;

  // Cancel any ongoing TTS
  if (window.speechSynthesis) {
    speechSynthesis.cancel();
  }

  // Clean up audio player
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.removeEventListener("ended", startQueueIfIdle);
    audioPlayer = null;
  }

  // Clean up audio pool
  audioPool.forEach((audio) => {
    audio.pause();
    audio.src = "";
    audio.remove();
  });
  audioPool.length = 0;

  // Drop the lane and its watchdog
  releaseLane(false);

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
 * They are `{ once: true }`, so a gesture that fires them without actually
 * unlocking used to consume them for good and leave the caller mute for the
 * rest of the page's life. Anything that finds audio still locked re-arms them.
 */
function armUnlockListeners(): void {
  document.addEventListener("click", unlockAudio, { once: true });
  document.addEventListener("pointerdown", unlockAudio, { once: true });
  document.addEventListener("touchstart", unlockAudio, { once: true });
  document.addEventListener("keydown", unlockAudio, { once: true });
}

/**
 * Starts the queue only if nothing is playing. `isPlaying` covers both a held
 * lane and an active TTS utterance, which holds no pool element of its own.
 */
function startQueueIfIdle(): void {
  if (!isPlaying) playNextSound();
}

/** Frees the lane and, unless told otherwise, starts the next call. */
function releaseLane(advance: boolean = true): void {
  if (laneTimeout !== null) {
    clearTimeout(laneTimeout);
    laneTimeout = null;
  }
  laneHolder = null;
  laneHold++;
  isPlaying = false;
  if (advance) playNextSound();
}

/** Marks `audioElement` as the clip holding the lane. */
function holdLane(audioElement: HTMLAudioElement): void {
  if (laneTimeout !== null) clearTimeout(laneTimeout);
  laneHolder = audioElement;
  laneHold++;
  laneTimeout = window.setTimeout(() => releaseLane(), LANE_HOLD_TIMEOUT_MS);
}

/** Whether `audioElement` still has the hold it took the lane with — see laneHold. */
function stillHolds(audioElement: HTMLAudioElement, hold: number): boolean {
  return laneHolder === audioElement && laneHold === hold;
}

/**
 * Called once a clip is actually playing. One too long to be part of a spoken
 * sequence gives the lane back straight away and finishes in the background.
 */
function releaseLaneIfLongSound(audioElement: HTMLAudioElement): void {
  if (laneHolder !== audioElement) return;

  const { duration } = audioElement;
  if (Number.isFinite(duration) && duration > LANE_HOLD_MAX_SECONDS) {
    console.log(`Autodarts Tools: ${duration.toFixed(1)}s call left to play out, freeing the queue`);
    releaseLane();
  }
}

/**
 * A pool element free to take a new clip, i.e. one not mid-playback. Falls back
 * to round-robin so a saturated pool still plays the clip instead of dropping it.
 */
function takeAudioElement(): HTMLAudioElement | undefined {
  const idle = audioPool.find(audio => audio !== laneHolder && (audio.paused || audio.ended));
  if (idle) return idle;

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
    audioPlayer.addEventListener("ended", startQueueIfIdle);

    // Handle errors
    audioPlayer.addEventListener("error", (e) => {
      console.error("Autodarts Tools: Audio playback error", e);
      // Move to next sound on error
      startQueueIfIdle();
    });

    // Initialize audio pool
    for (let i = 0; i < AUDIO_POOL_SIZE; i++) {
      const audio = new Audio();
      audio.addEventListener("ended", () => {
        console.log("Autodarts Tools: Pool audio ended");
        // A long clip that already gave the lane back finishes here; it must
        // not advance a queue it is no longer responsible for.
        if (audio === laneHolder) releaseLane();
      });
      audio.addEventListener("error", (error) => {
        console.error("Autodarts Tools: Pool audio error", error);
        armUnlockListeners();
        if (audio === laneHolder) releaseLane();
      });
      audioPool.push(audio);
    }

    // Unlock audio on first user interaction (required for Safari/iOS)
    armUnlockListeners();
  }
}

/**
 * Unlock audio playback on user interaction (required for Safari/iOS)
 */
function unlockAudio(): void {
  if (audioUnlocked || !audioPlayer) return;

  console.log("Autodarts Tools: Attempting to unlock audio");

  // Create a short silent audio buffer
  const silentAudio = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

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
        playNextSound();
      }
    })
    .catch((error) => {
      console.error("Autodarts Tools: Failed to unlock audio", error);
      // Still locked: put the one-shot gesture listeners back so the next
      // interaction gets another go, instead of never trying again.
      armUnlockListeners();
    });
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
        z-index: ${LAYERS.callerStatus};
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
    notificationElement.setAttribute("data-adt-notification-source", "caller");
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
      message.textContent = t("caller.audioNotice");
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
  if (notificationElement && notificationElement.getAttribute("data-adt-notification-source") === "caller") {
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

/**
 * The kinds of trigger the Caller calls: every dart only with Call every dart
 * on, what is left only with Call checkout on.
 */
function callerCategories(): TriggerCategory[] {
  const categories = [
    TriggerCategory.START,
    TriggerCategory.PLAYER,
    TriggerCategory.WINNER,
    TriggerCategory.OUTCOME,
    TriggerCategory.TOTAL,
    TriggerCategory.COMBO,
    TriggerCategory.VARIANT,
  ];
  if (config?.caller?.callCheckout) categories.push(TriggerCategory.REMAINING);
  if (config?.caller?.callEveryDart) categories.push(TriggerCategory.THROW);
  return categories;
}

/** Cricket calls the running score when it moved, never a visit's three darts. */
function callsInCricket(trigger: IGameTrigger, match: IMatch): boolean {
  return match.variant !== GameMode.CRICKET || trigger.category !== TriggerCategory.COMBO;
}

/**
 * Queues the calls for an update: the best sound of each kind of trigger, in
 * the Caller's priority order (utils/game-events/priorities.ts) — a name before
 * the checkout, a dart before the visit's total. A fallback for a dart with no
 * sound of its own is one of the triggers already ("triple" and the number).
 */
function callTriggers({ triggers, context }: TriggerUpdate): void {
  if (!config?.caller?.sounds?.length) return;

  let picks = pickPerCategory(config.caller.sounds, triggers, { context });
  // Prefer combined throws: a sound for the exact darts stands in for the total.
  if (config.caller.preferCombinedThrows && picks.some(pick => pick.category === TriggerCategory.COMBO)) {
    picks = picks.filter(pick => pick.category !== TriggerCategory.TOTAL);
  }

  for (const pick of picks) {
    console.log(`Autodarts Tools: Calling "${pick.matched}"`);
    pick.items.forEach(enqueue);
  }
}

/** A board event's call, one of its sounds at random. */
function callBoardTrigger(trigger: string): void {
  const sound = oneOn(config?.caller?.sounds, trigger);
  if (sound) enqueue(sound);
}

/** Adds a sound to the queue, which plays one call after another. */
function enqueue(sound: ISound): void {
  if (!sound.url && !sound.base64 && !sound.soundId && !sound.tts) return;

  soundQueue.push({
    url: sound.url,
    base64: sound.base64,
    name: sound.name,
    volume: soundVolume(sound),
    soundId: sound.soundId,
    tts: sound.tts,
  });
  if (!isPlaying) playNextSound();
}

/**
 * Play the next sound in the queue
 */
async function playNextSound(): Promise<void> {
  console.log(`Autodarts Tools: Next sound, queue length: ${soundQueue.length}`);

  // If the queue is empty, we're done
  if (soundQueue.length === 0) {
    isPlaying = false;
    return;
  }

  isPlaying = true;

  // Get the next sound from the queue
  const nextSound = soundQueue.shift();

  if (nextSound) {
    try {
      console.log(`Autodarts Tools: Playing sound: ${nextSound.name || "unnamed"}`);

      const percent = nextSound.volume ?? DEFAULT_VOLUME;
      const plan = planVolume(percent, elementVolumeWorks());

      // Turned all the way down: nothing plays, and nothing behind it waits
      if (plan.kind === "silent") {
        releaseLane();
        return;
      }

      // Handle TTS sounds
      if (nextSound.tts) {
        playTTSSound(nextSound.tts, percent);
        return;
      }

      // A volume the file doesn't have plays from a copy made at that volume
      if (plan.kind === "copy") {
        await playCopy(nextSound, percent);
        return;
      }

      // Try to load from IndexedDB first if soundId is present
      if (nextSound.soundId && isIndexedDBAvailable()) {
        console.log("Autodarts Tools: Attempting to load sound from IndexedDB");
        try {
          const base64Data = await getSoundFromIndexedDB(nextSound.soundId);
          if (base64Data) {
            console.log("Autodarts Tools: Successfully loaded sound from IndexedDB");
            playBase64Sound(base64Data, plan.volume);
            return;
          } else {
            console.warn("Autodarts Tools: Sound not found in IndexedDB, falling back to base64/URL");
          }
        } catch (error) {
          console.error("Autodarts Tools: Error loading sound from IndexedDB", error);
        }
      }

      // Fall back to base64 in config if available
      if (nextSound.base64) {
        playBase64Sound(nextSound.base64, plan.volume);
      } else if (nextSound.url) {
        // Use URL source if available
        console.log("Autodarts Tools: Using URL source");

        // Take a pool element that is not mid-playback, so a long clip still
        // playing in the background is never cut off to make room
        const audioElement = takeAudioElement();

        // Make sure the audio element exists
        if (!audioElement) {
          console.error("Autodarts Tools: Audio element not found in pool");
          // Move to next sound
          releaseLane();
          return;
        }

        // This clip owns the lane until it ends, proves to be a long one, or
        // outstays LANE_HOLD_TIMEOUT_MS
        holdLane(audioElement);

        // Stop any current playback
        audioElement.pause();

        // Pool elements are shared, so the last sound's volume must not carry over
        audioElement.volume = plan.volume;

        // Set the source to the URL
        audioElement.src = nextSound.url;

        // Play the sound
        audioElement.play()
          .then(() => {
            console.log("Autodarts Tools: URL sound playing successfully");
            releaseLaneIfLongSound(audioElement);
          })
          .catch((error) => {
            console.error("Autodarts Tools: Error playing URL sound", error);

            // Check if the error is due to user interaction requirement
            if (isAutoplayBlocked(error)) {
              showInteractionNotification();
              unlockAudio(); // Try to unlock audio again
            }

            // Move to next sound
            releaseLane();
          });
      } else {
        console.error("Autodarts Tools: Sound has neither URL, base64 data, nor soundId");
        // Move to next sound
        releaseLane();
      }
    } catch (error) {
      console.error("Autodarts Tools: Exception while setting up audio", error);
      // Move to next sound on error
      releaseLane();
    }
  } else {
    console.error("Autodarts Tools: nextSound is unexpectedly empty even though queue had items");
    isPlaying = false;
  }
}

/** The file a sound plays from, found as the queue finds it: its upload in IndexedDB, then the config's copy, then its link. */
async function sourceOf(sound: { url?: string; base64?: string; soundId?: string }): Promise<string | undefined> {
  if (sound.soundId && isIndexedDBAvailable()) {
    try {
      const stored = await getSoundFromIndexedDB(sound.soundId);
      if (stored) return stored;
    } catch (error) {
      console.error("Autodarts Tools: Error loading sound from IndexedDB", error);
    }
  }
  return sound.base64 || sound.url || undefined;
}

/**
 * Plays a sound at a volume its file doesn't have, from a copy made at that
 * volume. The copy is made while the sound holds the lane, as an IndexedDB
 * read would be. If the lane is given up in the meantime (the watchdog, or
 * every sound being stopped) the sound is dropped rather than played late,
 * even when the next sound has taken the same element since. Without a copy
 * it plays the file as it is, as loud as the element goes.
 */
async function playCopy(sound: QueuedSound, percent: number): Promise<void> {
  const audioElement = takeAudioElement();
  if (!audioElement) {
    console.error("Autodarts Tools: Audio element not found in pool");
    releaseLane();
    return;
  }
  holdLane(audioElement);
  const hold = laneHold;
  audioElement.pause();

  let source: string | undefined;
  let copy: string | null = null;
  try {
    source = await sourceOf(sound);
    if (source) copy = await copies.copyAt(source, percent);
  } catch (error) {
    console.error("Autodarts Tools: A sound could not be made at its volume", error);
  }
  if (!stillHolds(audioElement, hold)) return;

  if (!source) {
    console.error("Autodarts Tools: Sound has neither URL, base64 data, nor soundId");
    releaseLane();
    return;
  }

  if (copy) {
    startOnElement(audioElement, copy, 1, hold);
  } else if (isLink(source)) {
    startOnElement(audioElement, source, cappedVolume(percent), hold);
  } else {
    const blobUrl = createAudioBlobUrl(source);
    if (!blobUrl) {
      releaseLane();
      return;
    }
    blobUrlsToRevoke.push(blobUrl);
    startOnElement(audioElement, blobUrl, cappedVolume(percent), hold, blobUrl);
  }
}

/** Plays `src` on the pool element holding the lane on `hold`. `blobUrl` is revoked if it fails to play. */
function startOnElement(audioElement: HTMLAudioElement, src: string, volume: number, hold: number, blobUrl?: string): void {
  audioElement.volume = volume;
  audioElement.src = src;
  audioElement.play()
    .then(() => {
      console.log("Autodarts Tools: Sound playing at its volume");
      if (laneHold === hold) releaseLaneIfLongSound(audioElement);
    })
    .catch((error) => {
      console.error("Autodarts Tools: Error playing a sound at its volume", error);
      if (isAutoplayBlocked(error)) {
        showInteractionNotification();
        unlockAudio();
      }
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        const index = blobUrlsToRevoke.indexOf(blobUrl);
        if (index > -1) blobUrlsToRevoke.splice(index, 1);
      }
      // Only a hold this sound still has: another may have the lane, or even this element, by now
      if (stillHolds(audioElement, hold)) releaseLane();
    });
}

/**
 * Play a TTS sound using the Web Speech API
 */
function playTTSSound(tts: ISoundTTS, percent: number = DEFAULT_VOLUME): void {
  if (!window.speechSynthesis) {
    console.error("Autodarts Tools: speechSynthesis not available");
    releaseLane();
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
    releaseLane();
  }, 10000);

  utterance.onend = () => {
    clearTimeout(safetyTimeout);
    console.log("Autodarts Tools: TTS playback ended");
    releaseLane();
  };
  utterance.onerror = (e) => {
    clearTimeout(safetyTimeout);
    console.error("Autodarts Tools: TTS playback error", e);
    releaseLane();
  };

  speechSynthesis.speak(utterance);
}

/**
 * Play a sound from base64 data
 */
function playBase64Sound(base64Data: string, volume: number = 1): void {
  console.log("Autodarts Tools: Using base64 source");

  try {
    // Create a blob URL from the base64 data
    const audioUrl = createAudioBlobUrl(base64Data);

    if (!audioUrl) {
      console.error("Autodarts Tools: Failed to create audio blob URL");
      releaseLane();
      return;
    }

    // Add URL to tracking array for later revocation
    blobUrlsToRevoke.push(audioUrl);

    // Take a pool element that is not mid-playback
    const audioElement = takeAudioElement();

    // Make sure the audio element exists
    if (!audioElement) {
      console.error("Autodarts Tools: Audio element not found in pool for base64");
      URL.revokeObjectURL(audioUrl);
      const index = blobUrlsToRevoke.indexOf(audioUrl);
      if (index > -1) {
        blobUrlsToRevoke.splice(index, 1);
      }
      releaseLane();
      return;
    }

    holdLane(audioElement);

    // Stop any current playback
    audioElement.pause();

    // Pool elements are shared, so the last sound's volume must not carry over
    audioElement.volume = volume;

    // Set the source to the blob URL
    audioElement.src = audioUrl;

    // Play the sound
    audioElement.play()
      .then(() => {
        console.log("Autodarts Tools: Base64 sound playing successfully");
        releaseLaneIfLongSound(audioElement);
      })
      .catch((error) => {
        console.error("Autodarts Tools: Base64 sound playback failed", error);

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
        releaseLane();
      });
  } catch (error) {
    console.error("Autodarts Tools: Error processing base64 data", error);
    releaseLane();
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

  // Clear the sound queue
  soundQueue.length = 0;

  // Stop the main audio player if it exists
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
  }

  // Stop all audio elements in the pool
  audioPool.forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });

  // Reset playing flag and hand the lane back
  releaseLane(false);
}
