/**
 * Instant Replay — components/Settings/InstantReplay.vue, and the badge that
 * entrypoints/match.content/instant-replay.ts draws over a replay. Its name is
 * features.instantReplay.
 * The camera errors are messages, not sentences: the panel keeps the key of the one it
 * shows, so it follows a language picked while it is on screen. The browser's own error
 * names (NotReadableError and the like) are only matched, never shown, and are not here.
 */
export default {
  card: "Plays the winning dart back from your own webcam whenever a leg is won.",
  intro: "Point a webcam at your board, and the winning dart is played back over the screen whenever a leg is won, from a few seconds before it to a few after. A click on the replay puts it away early.",
  note: "It records only while you are in a match, and nothing leaves your computer. This is your own webcam, not the board's camera, which the browser cannot reach.",
  /** The badge on the replay, which says it is not the live picture. CSS sets it in capitals. */
  badge: "Replay",
  sections: {
    camera: "Camera",
    replay: "Replay",
    framing: "Framing",
  },
  alert: {
    unavailable: "Camera unavailable",
    noAccess: "No camera access",
    tryAgain: "Try again",
  },
  errors: {
    unsupported: "Your browser does not support camera access.",
    denied: "Camera access was denied. Please allow camera access in your browser settings.",
    failed: "An error occurred while trying to access the camera.",
    allInUse: "All camera devices are currently in use by other applications. Please close other video applications and try again.",
    loadFailed: "Failed to load camera devices.",
    previewFailed: "Failed to access the selected camera.",
  },
  access: {
    title: "Camera access needed",
    description: "The replay is recorded from your webcam, so the browser asks you first. Allow it in the prompt, or ask again.",
    allow: "Allow camera access",
  },
  preview: {
    title: "Preview",
    fps: "{fps} FPS",
    noCamera: "No camera to show",
  },
  camera: {
    title: "Camera",
    hint: {
      some: "Only cameras no other app is using are listed.",
      none: "No free camera found. Another app may be using it: close that, then look again.",
    },
    /** What a camera the browser gave no name is called: the first characters of its id. */
    unnamed: "Camera {id}...",
    refresh: {
      busyLabel: "Looking for cameras",
      idleLabel: "Look for cameras again",
      busyTitle: "Looking…",
      idleTitle: "Look again",
    },
  },
  before: {
    title: "Before the gameshot",
    description: "How much of the run-up to the winning dart the replay shows.",
  },
  after: {
    title: "After the gameshot",
    description: "And how much of what follows it.",
  },
  startDelay: {
    title: "Start delay",
    description: "From the won leg to the replay, leaving room for autodarts' own celebration.",
    /** For when the seconds after the gameshot are longer than the delay: `after` stands twice. */
    heldBack: "From the won leg to the replay. The {after} s after the gameshot have to be filmed first, so it starts after {after} s.",
  },
  covers: {
    title: "Covers",
    description: "Just the board, or the whole page.",
    options: {
      boardOnly: "Board only",
      fullPage: "Full page",
    },
  },
  zoom: {
    title: "Zoom",
    description: "How far the picture zooms in on the board.",
    /** The zoom level beside its slider: "2.5×". */
    value: "{zoom}×",
  },
  panX: {
    title: "Left and right",
    description: "Where the zoomed picture sits, side to side.",
  },
  panY: {
    title: "Up and down",
    description: "And top to bottom.",
  },
  /** Where a pan slider stands, beside it. `percent` is how far from the middle, without its sign. */
  pan: {
    centre: "Centre",
    left: "{percent}% left",
    right: "{percent}% right",
    up: "{percent}% up",
    down: "{percent}% down",
  },
};
