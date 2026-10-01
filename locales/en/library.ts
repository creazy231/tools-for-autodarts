/** The parts the Animations, Caller, Sound FX and WLED settings share: components/Settings/Library/. */
export default {
  /** A row's switch, spoken: "180: on". `state` is state.on or state.off. */
  itemState: "{title}: {state}",
  /** Lower case, as they end a spoken phrase. */
  state: {
    on: "on",
    off: "off",
  },
  editNamed: "Edit {title}",
  dragToReorder: "Drag to reorder",
  /** The bin on a row, spoken: "Delete 180". `name` is the thing's name. */
  deleteNamed: "Delete {name}",
  /** A play button, spoken: "Play 180". `name` is what plays, or a phrase such as soundDialog.thisSound. */
  playNamed: "Play {name}",
  stopNamed: "Stop {name}",
  /** The play button's tooltip, when its caller gives none. */
  play: "Play",
  stop: "Stop",
  /** The primary button of both sound dialogs while adding. */
  addSound: "Add sound",
  section: {
    /** The spoken name of the filter pills. */
    show: "Show",
    /** The pill that takes the filter off. The drag hints below name it. */
    all: "All",
    /** What a search or filter leaves: "3 of 12". */
    shownOf: "{shown} of {total}",
    nothingMatches: "Nothing matches",
    /** The search field's placeholder, when the list's panel gives none. */
    searchPlaceholder: "Search by name or trigger",
    /** The line under "Nothing matches", when the list's panel gives none. */
    noMatch: "No item has that in its name, triggers or source.",
    /** Said under a list that cannot be dragged while a search or filter narrows it. They name the All pill and the search's clear button. */
    dragHint: {
      searchAndFilter: "Clear the search and pick All to drag items into a new order.",
      search: "Clear the search to drag items into a new order.",
      filter: "Pick All to drag items into a new order.",
    },
  },
  /** The filter pills, one for each kind of trigger. */
  categories: {
    scores: "Scores",
    throws: "Throws",
    events: "Events",
    board: "Board",
    players: "Players",
  },
  soundDialog: {
    editTitle: "Edit sound",
    addTitle: "Add a sound from a link",
    /** What the play button plays, as the object of "Play …" and "Stop …" (playNamed, stopNamed). */
    thisSound: "this sound",
    theLink: "the link",
    uploadedHint: "Kept in this browser. Its name and triggers can be changed here.",
    linkLabel: "Link to the sound",
    /** An example address: the same in every language. */
    linkPlaceholder: "https://example.com/sound.mp3",
    linkHint: "An MP3, WAV or OGG file, on a link that starts with https://.",
    /** `volume` is the file's own volume, `max` the loudest it can be made. */
    volumeHint: "{volume}% is the file as it is. Up to {max}% makes a quiet one louder.",
    louderBlocked: "This link's site doesn't let the extension read the file, so it plays at {volume}% at most. To make it louder, upload the file instead.",
    nameLabel: "Name",
    namePlaceholder: "Optional: shown in the list",
  },
  tts: {
    editTitle: "Edit text-to-speech sound",
    addTitle: "Generate a sound",
    textLabel: "Text to speak",
    /** A sample sentence a person might want said. */
    textPlaceholder: "e.g. One hundred and eighty!",
    voiceLabel: "Voice",
    defaultVoice: "Default voice",
    speed: "Speed",
    pitch: "Pitch",
    volumeHint: "Up to {max}%: a voice can be turned down, but no louder than it speaks.",
    missingTrigger: "Add at least one trigger, or the sound never plays.",
    listen: "Listen",
  },
  upload: {
    dropzone: "Drop files here, or click to choose",
    /** `formats` is a finished text such as formatsAudio. */
    formatsLine: "{formats} · as many as you like",
    formatsAudio: "MP3, WAV or OGG",
    chosen: { one: "{count} file chosen", other: "{count} files chosen" },
    /** The primary button once files are chosen. The caller names the one that fits its files (the dialog's `add-key`). */
    addSounds: { one: "Add {count} sound", other: "Add {count} sounds" },
    addGifs: { one: "Add {count} GIF", other: "Add {count} GIFs" },
    /** The tooltip of a file's ✕; its spoken name is common.remove. */
    remove: "Remove",
    modes: {
      names: "From file names",
      shared: "The same for all",
    },
    sharedHint: "Every file gets these. Leave it empty to add the files without triggers.",
  },
  source: {
    tts: "Text to speech · {voice}",
    /** Said in place of {voice} when the sound uses the browser's own voice. */
    defaultVoice: "default voice",
    uploaded: "Uploaded file",
    none: "No source",
  },
  volume: {
    label: "Volume",
    playsAt: "Plays at {volume}%",
    reset: "Back to {volume}%",
  },
  triggers: {
    /** The field's label, in the upload dialog and over a trigger field. */
    label: "Triggers",
    placeholder: "Type a trigger and press Enter",
    none: "No trigger",
    noneTitle: "Without a trigger it never plays",
  },
};
