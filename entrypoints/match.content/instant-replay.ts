import type { IGameData } from "@/utils/game-data-storage";
import type { InstantReplayConfig } from "@/utils/instant-replay";

import { addStyles, removeStyles } from "@/utils";
import { AutodartsToolsGameData } from "@/utils/game-data-storage";
import { normalizeInstantReplay } from "@/utils/instant-replay";
import { AutodartsToolsConfig } from "@/utils/storage";
import { SELECTORS, qs } from "@/utils/selectors";
import { LAYERS } from "@/utils/layers";

/**
 * Instant Replay — play the winning throw back off your own webcam.
 *
 * This is a camera pointed at the board by hand, not the board's own: the board
 * camera is on the board, and nothing in the browser can reach it. So the
 * feature holds a rolling recording of whatever camera you picked, and when a
 * leg is won it plays the seconds around the winning dart over the screen:
 * `before` of them leading up to it and `after` of what follows.
 *
 * v1 did this by reading every frame back off a canvas with `getImageData` and
 * keeping them in a list — a GPU-to-CPU copy per frame, and around half a
 * gigabyte of uncompressed pixels for its own default five second delay. What
 * it produced was not a replay either: it was the live feed running a few
 * seconds behind, so once the buffer had drained you were watching a lagging
 * camera rather than the throw.
 *
 * This records with `MediaRecorder` instead — compressed by the same encoder
 * the browser uses for video calls, a few megabytes rather than hundreds — and
 * plays a real clip.
 *
 * A recorder hands its file over only once it is stopped, and a file cannot be
 * trimmed from the front, so the recording is a series of takes, each started
 * while the one before is still running. A take is kept until the next one
 * holds a whole run-up by itself: whenever a leg is won, one of them started at
 * least `before` seconds earlier. That one records on through the `after`
 * seconds, is stopped, and is played from the second the run-up begins — one
 * file, so the replay has no seam in it anywhere. Two recorders run at once
 * only for the overlap: `before` and a second, in every half minute or more.
 *
 * The one seek is to that first second. A file recorded in one piece, with no
 * timeslice, carries its length and an index in Chrome, and a seek lands on the
 * frame asked for. A browser that cannot seek plays the take from its start
 * instead: a longer run-up, never a shorter one.
 */
const HOST_ID = "adt-instant-replay";
const STYLE_ID = "instant-replay";

/** Matches the fade in the stylesheet. */
const FADE_MS = 500;

/** On top of the run-up, before a take is let go: timers run late. */
const OVERLAP_SLACK_MS = 1000;

/** New takes no more often than this, so two recorders run at once for a small part of the time. */
const MIN_PERIOD_MS = 30_000;

/** Less than this recorded before the winning dart, and there is no run-up to show. */
const MIN_RUN_UP_MS = 1000;

/** How long the video gets to load a take, and then to find the run-up in it. */
const CUE_TIMEOUT_MS = 3000;

/** How long a recorder gets to hand its footage over once stopped. */
const STOP_TIMEOUT_MS = 1500;

/** Ordered by preference; Safari has none of the WebM ones. */
const FORMATS = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
  "video/mp4",
];

const STYLES = `
  #${HOST_ID} {
    position: fixed;
    /*
     * Above the takeout notice, which is by definition on screen at the same
     * time: a leg ends with three darts in the board, so the board reports a
     * takeout in the same breath as the win.
     */
    z-index: ${LAYERS.instantReplay};
    overflow: hidden;
    background: var(--color-black-90, #01040b);
    cursor: pointer;
    opacity: 0;
    visibility: hidden;
    transition: opacity ${FADE_MS}ms ease, visibility 0s linear ${FADE_MS}ms;
  }

  #${HOST_ID}[data-open] {
    opacity: 1;
    visibility: visible;
    transition: opacity ${FADE_MS}ms ease, visibility 0s;
  }

  #${HOST_ID}[data-mode="full-page"] {
    inset: 0;
  }

  /* over the board alone, at the site's own panel radius */
  #${HOST_ID}[data-mode="board-only"] {
    border-radius: calc(var(--radius, 0.625rem) + 4px);
    box-shadow: 0 0 0 1px rgb(247 248 250 / 15%);
  }

  #${HOST_ID} video {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform-origin: center;
  }

  /* so a delayed picture of the board is never mistaken for the live one */
  #${HOST_ID}::after {
    content: "Replay";
    position: absolute;
    top: 0.75rem;
    left: 0.75rem;
    padding: 0.25rem 0.75rem 0.125rem;
    border-radius: var(--radius, 0.625rem);
    background: var(--system-warning, #f7d458);
    color: var(--system-warning-on, #01040b);
    font-family: var(--font-display, sans-serif);
    font-size: 1.25rem;
    line-height: 1.2;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
`;

interface Take {
  recorder: MediaRecorder;
  /** When it began, by `performance.now()`: where its first frame sits, to within a frame. */
  start: number;
  /** Its footage, once it has been stopped; null when it recorded nothing. */
  footage: Promise<Blob | null>;
}

let gameDataWatcherUnwatch: (() => void) | undefined;
let onReposition: (() => void) | null = null;
let host: HTMLElement | null = null;
let video: HTMLVideoElement | null = null;
let config: InstantReplayConfig | null = null;

let stream: MediaStream | null = null;
let recording = false;
/** Oldest first. */
let takes: Take[] = [];
/** The take a won leg is holding on to, which retiring passes by. */
let held: Take | null = null;
let rotateTimer: ReturnType<typeof setTimeout> | undefined;
let retireTimer: ReturnType<typeof setTimeout> | undefined;

let url: string | null = null;
let legWon = false;
/** Goes up with every replay begun or called off, so a step still waiting can tell it is out of date. */
let replay = 0;
let captureTimer: ReturnType<typeof setTimeout> | undefined;
let showTimer: ReturnType<typeof setTimeout> | undefined;
let endTimer: ReturnType<typeof setTimeout> | undefined;
let clearTimer: ReturnType<typeof setTimeout> | undefined;

export async function instantReplay() {
  console.log("Autodarts Tools: Instant Replay");

  const stored = await AutodartsToolsConfig.getValue();
  config = normalizeInstantReplay(stored.instantReplay);

  if (!await startCamera()) return;

  addStyles(STYLES, STYLE_ID);
  mount();
  startRecording();

  legWon = false;
  gameDataWatcherUnwatch?.();
  gameDataWatcherUnwatch = AutodartsToolsGameData.watch(onGameData);

  onReposition = () => {
    if (host?.hasAttribute("data-open")) place();
  };
  window.addEventListener("resize", onReposition);
}

export function instantReplayOnRemove() {
  console.log("Autodarts Tools: Instant Replay removed!");

  gameDataWatcherUnwatch?.();
  gameDataWatcherUnwatch = undefined;

  if (onReposition) {
    window.removeEventListener("resize", onReposition);
    onReposition = null;
  }

  replay++;
  clearTimeout(captureTimer);
  clearTimeout(showTimer);
  clearTimeout(endTimer);
  clearTimeout(clearTimer);
  captureTimer = undefined;
  showTimer = undefined;
  endTimer = undefined;
  clearTimer = undefined;
  legWon = false;

  stopRecording();
  releaseCamera();

  clearVideo();
  host?.remove();
  host = null;
  video = null;
  config = null;
  removeStyles(STYLE_ID);
}

// ------------------------------------------------------------------- the camera

/**
 * The camera the settings page chose, or any camera if that one has since been
 * unplugged — a stale device id should not take the whole feature down.
 *
 * Permission belongs to the page, not to the extension, and the settings page
 * is injected into the same origin, so the grant made there covers this.
 */
async function startCamera(): Promise<boolean> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    console.warn("Autodarts Tools: Instant Replay - this browser cannot record video");
    return false;
  }

  const deviceId = config?.deviceId;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: deviceId ? { deviceId: { exact: deviceId } } : true,
      audio: false,
    });
    return true;
  } catch (error) {
    console.warn("Autodarts Tools: Instant Replay - chosen camera unavailable", error);
  }

  if (!deviceId) return false;

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    return true;
  } catch (error) {
    console.warn("Autodarts Tools: Instant Replay - no camera available", error);
    return false;
  }
}

function releaseCamera(): void {
  stream?.getTracks().forEach(track => track.stop());
  stream = null;
}

// ---------------------------------------------------------------- the recording

/** How long a take is kept once the next has started: until that one alone holds a run-up. */
function overlapMs(): number {
  return (config?.before ?? 10) * 1000 + OVERLAP_SLACK_MS;
}

/** How often a take starts: twice the overlap at least, so two overlap half the time at most. */
function periodMs(): number {
  return Math.max(MIN_PERIOD_MS, 2 * overlapMs());
}

function recorderOptions(): MediaRecorderOptions {
  const mimeType = FORMATS.find(format => MediaRecorder.isTypeSupported?.(format));
  return mimeType ? { mimeType } : {};
}

function startRecording(): void {
  recording = true;
  takes = [];
  held = null;
  rotate();
}

/** Start the next take, and let the older ones go once it holds a run-up of its own. */
function rotate(): void {
  if (!recording) return;

  clearTimeout(rotateTimer);
  rotateTimer = undefined;
  if (!startTake()) {
    recording = false;
    return;
  }

  clearTimeout(retireTimer);
  retireTimer = setTimeout(retire, overlapMs());
  rotateTimer = setTimeout(rotate, periodMs());
}

/** Every take but the newest, which holds a whole run-up by now — and but the one a won leg is holding. */
function retire(): void {
  retireTimer = undefined;
  for (const take of takes.slice(0, -1)) {
    if (take !== held) dropTake(take);
  }
}

/**
 * Started without a timeslice: the footage then arrives in one piece when the
 * take is stopped, which is the only moment anything here wants it — and a file
 * made in one piece carries its own length and index, which is what lets the
 * replay start at the right second.
 */
function startTake(): Take | null {
  if (!stream) return null;

  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, recorderOptions());
  } catch (error) {
    console.warn("Autodarts Tools: Instant Replay - cannot record this camera", error);
    return null;
  }

  const chunks: Blob[] = [];
  const footage = new Promise<Blob | null>((resolve) => {
    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data?.size) chunks.push(event.data);
    };
    recorder.onstop = () => resolve(chunks.length
      ? new Blob(chunks, { type: chunks[0].type || recorder.mimeType || "video/webm" })
      : null);
  });

  try {
    recorder.start();
  } catch (error) {
    // A camera unplugged mid-match ends its track, and the recorder goes with it.
    console.warn("Autodarts Tools: Instant Replay - recording stopped", error);
    return null;
  }

  const take = { recorder, start: performance.now(), footage };
  takes.push(take);
  return take;
}

/**
 * Stop a take and hand its footage over.
 *
 * Resolves on a timer as well, because a recorder that never reports back would
 * otherwise mean a replay that never appears.
 */
function stopTake(take: Take): Promise<Blob | null> {
  takes = takes.filter(other => other !== take);
  try {
    if (take.recorder.state !== "inactive") take.recorder.stop();
  } catch {
    // a recorder whose track has already gone throws on stop; nothing to do
  }
  return Promise.race([ take.footage, new Promise<null>(resolve => setTimeout(resolve, STOP_TIMEOUT_MS, null)) ]);
}

/** Stop a take and throw its footage away. */
function dropTake(take: Take): void {
  take.recorder.ondataavailable = null;
  void stopTake(take);
}

function stopRecording(): void {
  recording = false;
  clearTimeout(rotateTimer);
  clearTimeout(retireTimer);
  rotateTimer = undefined;
  retireTimer = undefined;
  held = null;
  [ ...takes ].forEach(dropTake);
  takes = [];
}

// ------------------------------------------------------------------ the overlay

function mount(): void {
  document.getElementById(HOST_ID)?.remove();

  host = document.createElement("div");
  host.id = HOST_ID;
  host.setAttribute("data-mode", config?.viewMode === "full-page" ? "full-page" : "board-only");
  // Anywhere on it, not just on the picture: the replay is in the way by
  // design, so it should be easy to get rid of.
  host.addEventListener("click", hide);

  video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  // The zoom and offset the settings page framed the board with. Scaled about
  // the middle first, so the offset is in the magnified picture's own terms —
  // which is how it was framed in the preview.
  video.style.transform = `scale(${config?.zoom ?? 1}) translate(${config?.positionX ?? 0}%, ${config?.positionY ?? 0}%)`;

  host.appendChild(video);
  document.body.appendChild(host);
}

/**
 * Full page, or the square the board is drawn in.
 *
 * Measured when the replay starts rather than kept up to date: it is on screen
 * for a few seconds over a layout that is not moving. v1 polled for this once a
 * second for the whole match.
 */
function place(): void {
  if (!host || !config) return;

  const board = config.viewMode === "board-only"
    ? qs<HTMLElement>(SELECTORS.match.boardArea)?.getBoundingClientRect()
    : undefined;

  if (!board?.width) {
    host.setAttribute("data-mode", "full-page");
    for (const property of [ "top", "left", "width", "height" ]) host.style.removeProperty(property);
    return;
  }

  host.setAttribute("data-mode", "board-only");
  host.style.top = `${board.top}px`;
  host.style.left = `${board.left}px`;
  host.style.width = `${board.width}px`;
  host.style.height = `${board.height}px`;
}

/**
 * Put a won leg's take on screen: loaded, and moved to the second its run-up
 * starts while the overlay is still out of sight; then shown once autodarts has
 * had its own moment.
 *
 * `offset` is where the run-up starts in the take and `length` how long the
 * take is, both in milliseconds.
 */
async function present(id: number, footage: Blob, offset: number, length: number, won: number): Promise<void> {
  if (!host || !video || !config) return;

  clearTimeout(clearTimer);
  clearTimer = undefined;
  revokeUrl();
  url = URL.createObjectURL(footage);
  video.onended = null;
  video.src = url;

  // A browser that cannot seek into the take plays it from the start: more run-up, never less.
  // Such a seek still reports `seeked`, landing wherever the file allows, so where it
  // landed is what counts.
  const cued = await when(video, "loadedmetadata", CUE_TIMEOUT_MS)
    && await seek(video, offset / 1000)
    && Math.abs(video.currentTime * 1000 - offset) < 1000;
  if (id !== replay || !host || !video) return;
  if (!cued) console.warn("Autodarts Tools: Instant Replay - cannot find the run-up in the recording, playing all of it");

  // The site has its own moment first — the card lights up and it says GAME
  // SHOT — and the darts are still in the board.
  const wait = won + config.startDelay * 1000 - performance.now();
  if (wait > 0) {
    await new Promise((resolve) => {
      showTimer = setTimeout(resolve, wait);
    });
    showTimer = undefined;
    if (id !== replay || !host || !video) return;
  }

  place();
  host.setAttribute("data-open", "");
  video.onended = hide;
  void video.play().catch((error) => {
    console.warn("Autodarts Tools: Instant Replay - playback failed", error);
    hide();
  });

  // `ended` never arrives from a clip the decoder will not take, and this
  // covers the board — so it comes off on a timer whatever happens, counted from
  // where the picture really starts.
  const total = Number.isFinite(video.duration) ? video.duration * 1000 : length;
  clearTimeout(endTimer);
  endTimer = setTimeout(hide, total - video.currentTime * 1000 + 3000);
}

/** Whether `type` fires on `target` within `ms`. */
function when(target: EventTarget, type: string, ms: number): Promise<boolean> {
  const done = new AbortController();
  return new Promise<boolean>((resolve) => {
    target.addEventListener(type, () => resolve(true), { once: true, signal: done.signal });
    setTimeout(resolve, ms, false);
  }).finally(() => done.abort());
}

/** Move to `seconds` into the clip, and whether it got there. */
function seek(element: HTMLVideoElement, seconds: number): Promise<boolean> {
  const seeked = when(element, "seeked", CUE_TIMEOUT_MS);
  element.currentTime = seconds;
  return seeked;
}

function hide(): void {
  clearTimeout(showTimer);
  clearTimeout(endTimer);
  showTimer = undefined;
  endTimer = undefined;

  // A replay still being put together has nothing on screen to fade.
  if (!host?.hasAttribute("data-open")) return clearVideo();
  host.removeAttribute("data-open");

  // Let the fade finish first: dropping the source now would black the picture
  // out halfway through it.
  clearTimeout(clearTimer);
  clearTimer = setTimeout(clearVideo, FADE_MS + 100);
}

function clearVideo(): void {
  clearTimer = undefined;
  if (video) {
    video.onended = null;
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
  revokeUrl();
}

function revokeUrl(): void {
  if (url) URL.revokeObjectURL(url);
  url = null;
}

// ------------------------------------------------------------------ the trigger

/**
 * A leg being won, and only the moment it is won.
 *
 * The match state is pushed on every change, so the win is reported over and
 * over while the board is being cleared; v1 scheduled a replay each time and
 * never cleared the timer it used, so they stacked up. Only the change of state
 * counts here.
 *
 * Correcting the last throw takes the win back, which cancels a replay that has
 * not started and pulls one that has. The bull-off has a winner too, and is not
 * worth replaying.
 */
function onGameData(gameData: IGameData): void {
  const match = gameData?.match;
  if (!match) return;

  const editing = match.activated !== undefined && match.activated >= 0;
  const won = !editing
    && match.variant !== "Bull-off"
    && ((match.gameWinner ?? -1) >= 0 || (match.winner ?? -1) >= 0);

  if (won === legWon) return;
  legWon = won;

  if (!won) return cancel();
  capture(performance.now());
}

/**
 * Hold on to the take with this leg's run-up, and stop it once the seconds
 * after the gameshot are in. `won` is when the leg was won.
 */
function capture(won: number): void {
  if (!config) return;

  const from = won - config.before * 1000;
  // The newest take already rolling when the run-up began; early in a match, the oldest there is.
  const take = takes.filter(candidate => candidate.start <= from).at(-1) ?? takes[0];
  // A page opened on a leg that was already won has nothing from before the dart.
  if (!take || won - take.start < MIN_RUN_UP_MS) {
    console.warn("Autodarts Tools: Instant Replay - nothing recorded before the winning dart");
    return;
  }

  const id = ++replay;
  held = take;
  // The next leg is recorded in a take of its own.
  rotate();

  clearTimeout(captureTimer);
  captureTimer = setTimeout(() => {
    captureTimer = undefined;
    void finishCapture(id, take, from, won);
  }, config.after * 1000);
}

/** The seconds after the gameshot are in: stop the take and put it on screen. */
async function finishCapture(id: number, take: Take, from: number, won: number): Promise<void> {
  const length = performance.now() - take.start;
  const footage = await stopTake(take);
  if (held === take) held = null;
  if (id !== replay) return;
  if (!footage) {
    console.warn("Autodarts Tools: Instant Replay - nothing recorded");
    return;
  }
  await present(id, footage, Math.max(0, from - take.start), length, won);
}

/** The win was taken back: drop the replay being put together, or put away the one on screen. */
function cancel(): void {
  replay++;
  held = null;
  clearTimeout(captureTimer);
  captureTimer = undefined;
  hide();
}
