import type { IConfig } from "@/utils/storage";
import type { IGameData } from "@/utils/game-data-storage";

import { addStyles, removeStyles } from "@/utils";
import { AutodartsToolsGameData } from "@/utils/game-data-storage";
import { AutodartsToolsConfig } from "@/utils/storage";
import { SELECTORS, qs } from "@/utils/selectors";
import { LAYERS } from "@/utils/layers";

/**
 * Instant Replay — play the winning throw back off your own webcam.
 *
 * This is a camera pointed at the board by hand, not the board's own: the board
 * camera is on the board, and nothing in the browser can reach it. So the
 * feature holds a rolling recording of whatever camera you picked, and when a
 * leg is won it plays the last few seconds of it over the screen.
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
 * plays a real clip. The recording is cut into segments a replay long, of which
 * the last two are kept; a replay is the newest ones that add up to the
 * configured length, played back to back.
 *
 * Segments rather than one long recording, because a `MediaRecorder` file
 * cannot be trimmed from the front: the header lives at the start and the
 * duration is never written, so seeking into one is unreliable in Chrome and
 * worse elsewhere. Playing whole segments needs neither. The seam between them
 * falls at the start of the replay, never at the throw, which is always in the
 * final segment.
 */
const HOST_ID = "adt-instant-replay";
const STYLE_ID = "instant-replay";

/** Matches the fade in the stylesheet. */
const FADE_MS = 500;

/**
 * How many finished segments to hold on to.
 *
 * Two, plus the one being recorded, is what guarantees a full replay: the
 * segment in hand can be almost empty when the leg ends, so there has to be a
 * whole one behind it.
 */
const KEEP_SEGMENTS = 2;

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

interface Segment {
  blob: Blob;
  ms: number;
}

let gameDataWatcherUnwatch: (() => void) | undefined;
let onReposition: (() => void) | null = null;
let host: HTMLElement | null = null;
let video: HTMLVideoElement | null = null;
let config: IConfig["instantReplay"] | null = null;

let stream: MediaStream | null = null;
let recorder: MediaRecorder | null = null;
let recording = false;
let chunks: Blob[] = [];
let segments: Segment[] = [];
let segmentStart = 0;
let rotateTimer: ReturnType<typeof setTimeout> | undefined;
/** Whoever is waiting for the segment being recorded to be closed and banked. */
let banked: Array<() => void> = [];

let urls: string[] = [];
let legWon = false;
let showTimer: ReturnType<typeof setTimeout> | undefined;
let endTimer: ReturnType<typeof setTimeout> | undefined;
let clearTimer: ReturnType<typeof setTimeout> | undefined;

export async function instantReplay() {
  console.log("Autodarts Tools: Instant Replay");

  const stored = await AutodartsToolsConfig.getValue();
  config = stored.instantReplay;

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

  clearTimeout(showTimer);
  clearTimeout(endTimer);
  clearTimeout(clearTimer);
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

/** A replay's worth, and never so short that rotating costs more than it saves. */
function segmentMs(): number {
  return Math.max(3000, (config?.duration ?? 10) * 1000);
}

function recorderOptions(): MediaRecorderOptions {
  const mimeType = FORMATS.find(format => MediaRecorder.isTypeSupported?.(format));
  return mimeType ? { mimeType } : {};
}

function startRecording(): void {
  recording = true;
  segments = [];
  startSegment();
}

/**
 * Started without a timeslice: the data then arrives in one piece when the
 * segment is closed, which is the only moment anything here cares about.
 */
function startSegment(): void {
  if (!stream || !recording) return;

  chunks = [];
  segmentStart = performance.now();

  try {
    recorder = new MediaRecorder(stream, recorderOptions());
  } catch (error) {
    console.warn("Autodarts Tools: Instant Replay - cannot record this camera", error);
    recording = false;
    recorder = null;
    return;
  }

  recorder.ondataavailable = (event: BlobEvent) => {
    if (event.data?.size) chunks.push(event.data);
  };
  recorder.onstop = bankSegment;

  try {
    recorder.start();
  } catch (error) {
    // A camera unplugged mid-match ends its track, and the recorder goes with it.
    console.warn("Autodarts Tools: Instant Replay - recording stopped", error);
    recording = false;
    recorder = null;
    return;
  }

  clearTimeout(rotateTimer);
  rotateTimer = setTimeout(() => {
    if (recorder?.state === "recording") recorder.stop();
  }, segmentMs());
}

/** Close the books on a segment and open the next, without a break in between. */
function bankSegment(): void {
  // The last stop of a match arrives here after the shelf has been cleared —
  // bank that one and it would be waiting, a match old, for the next replay.
  if (!recording) {
    chunks = [];
    const leaving = banked;
    banked = [];
    leaving.forEach(resolve => resolve());
    return;
  }

  const blob = chunks.length
    ? new Blob(chunks, { type: chunks[0].type || recorder?.mimeType || "video/webm" })
    : null;
  const ms = performance.now() - segmentStart;
  chunks = [];

  if (blob?.size) {
    segments.push({ blob, ms });
    while (segments.length > KEEP_SEGMENTS) segments.shift();
  }

  startSegment();

  const waiting = banked;
  banked = [];
  waiting.forEach(resolve => resolve());
}

/**
 * Close the segment being recorded so it can be played, and carry on recording.
 *
 * Resolves on a timer as well, because a recorder that never reports back would
 * otherwise mean a replay that never appears.
 */
function flush(): Promise<void> {
  return new Promise((resolve) => {
    if (!recorder || recorder.state !== "recording") return resolve();

    let done = false;
    const once = () => {
      if (done) return;
      done = true;
      resolve();
    };

    banked.push(once);
    setTimeout(once, 1500);

    clearTimeout(rotateTimer);
    recorder.stop();
  });
}

function stopRecording(): void {
  recording = false;
  clearTimeout(rotateTimer);
  rotateTimer = undefined;

  try {
    if (recorder && recorder.state !== "inactive") recorder.stop();
  } catch {
    // a recorder whose track has already gone throws on stop; nothing to do
  }

  recorder = null;
  chunks = [];
  segments = [];

  const waiting = banked;
  banked = [];
  waiting.forEach(resolve => resolve());
}

/** The newest segments that add up to a replay, oldest first. */
function clip(wantMs: number): Segment[] {
  const picked: Segment[] = [];
  let have = 0;

  for (let index = segments.length - 1; index >= 0 && have < wantMs; index--) {
    picked.unshift(segments[index]);
    have += segments[index].ms;
  }

  return picked;
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

async function show(): Promise<void> {
  if (!host || !video || !config) return;

  await flush();

  // Closing the segment takes a moment, and the throw can be corrected inside
  // it — at which point there is no longer a win to celebrate.
  if (!legWon) return;

  const picked = clip(Math.max(1, config.duration ?? 10) * 1000);
  if (!picked.length) {
    console.warn("Autodarts Tools: Instant Replay - nothing recorded yet");
    return;
  }

  clearTimeout(clearTimer);
  clearTimer = undefined;

  place();
  playClip(picked);
  host.setAttribute("data-open", "");
}

function playClip(picked: Segment[]): void {
  if (!video) return;

  revokeUrls();
  urls = picked.map(segment => URL.createObjectURL(segment.blob));

  let index = 0;
  video.onended = () => {
    if (++index >= urls.length) return hide();
    video!.src = urls[index];
    void video!.play().catch(() => hide());
  };

  video.src = urls[0];
  void video.play().catch((error) => {
    console.warn("Autodarts Tools: Instant Replay - playback failed", error);
    hide();
  });

  // `ended` never arrives from a clip the decoder will not take, and this
  // covers the board — so it comes off on a timer whatever happens.
  const total = picked.reduce((sum, segment) => sum + segment.ms, 0);
  clearTimeout(endTimer);
  endTimer = setTimeout(hide, total + 3000);
}

function hide(): void {
  clearTimeout(showTimer);
  clearTimeout(endTimer);
  showTimer = undefined;
  endTimer = undefined;

  if (!host?.hasAttribute("data-open")) return;
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
  revokeUrls();
}

function revokeUrls(): void {
  urls.forEach(URL.revokeObjectURL);
  urls = [];
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

  if (!won) return hide();

  // The site has its own moment first — the card lights up and it says GAME
  // SHOT — and the darts are still in the board.
  clearTimeout(showTimer);
  showTimer = setTimeout(() => {
    void show();
  }, Math.max(0, config?.startDelay ?? 3) * 1000);
}
