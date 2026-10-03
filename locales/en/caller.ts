/**
 * The Caller — components/Settings/Caller.vue, and the notice that entrypoints/match.content/caller.ts puts over a
 * match. Its name is features.caller.
 * What it shares with Sound FX is in library.ts under `sounds`: the list's heading and search, the Add menu, Sort by
 * trigger, the delete-all dialog, the upload dialog, "Untitled sound" and "Unnamed sound", and the toasts of adding
 * and playing a sound. The list menu's button and Delete all are library.moreActions, library.more,
 * library.deleteAllMenu and library.deleteAll; the trigger field's words are in triggers.ts, and the games' in
 * gameModes.ts.
 * A file name (`0.mp3`) and a host name are what is typed or fetched, so they stay as they are inside a sentence. A
 * trigger is typed too: the one combinedThrows names (`s20_s5_s1`) is a param, as Sound FX's and WLED's are.
 */
export default {
  card: "Call out scores, checkouts and special events during your matches with customizable sound effects.",
  intro: "Calls out scores, checkouts and names during a match, in a voice of your choice. Each sound plays on the triggers you give it.",
  /** The notice over the match page, which stays until a click, a tap or a key press lets the page play sound. */
  audioNotice: "Please interact with the page (click, tap, or press a key) to enable audio for the caller.",
  sections: {
    options: "Options",
  },
  callEveryDart: {
    title: "Call every dart",
    description: "Call each dart as it lands, not only the visit's total.",
  },
  callCheckout: {
    title: "Call checkout",
    description: "Say what a player requires when they're on a finish, and in Gotcha the number left to the target.",
  },
  combinedThrows: {
    title: "Prefer combined throws",
    /** `token` is `s20_s5_s1`, a trigger. It is what is typed, so it is a param and no translation can change it. */
    description: "When there's a sound for the exact darts, such as <code>{token}</code>, play it instead of the visit's total.",
  },
  /** The row is headed gameModes.title. */
  gameModes: {
    description: "The games it calls in.",
    intro: "The Caller only calls in the games switched on here.",
  },
  list: {
    emptyText: "Import a ready-made caller set, upload recordings of your own, or generate them from text.",
  },
  /** Importing a caller set: the Add menu's item and its hint, the empty list's button, the dialog and what it says while it works. */
  import: {
    title: "Import a caller set",
    hint: "Ready-made voices in eight languages",
    setLabel: "Caller set",
    setHelper: "From darts-downloads.peschi.org. Some sets may not play in Safari, and Tools for Autodarts isn't responsible for what they say.",
    linkLabel: "Link",
    /** An example address: the same in every language. */
    linkPlaceholder: "https://darts-downloads.peschi.org/soundfiles/…",
    linkHint: "Filled in from the set above, or a link of your own: a ZIP file, or a folder with files named 0.mp3 to 180.mp3. Triggers come from the file names. Links on darts-downloads.peschi.org, adt-socket.tobias-thiele.de and autodarts.x10.mx are supported.",
    button: "Import",
    /** Asked by the browser when the dialog is closed while sounds are still being fetched. */
    cancelConfirm: "Import in progress. Are you sure you want to cancel?",
    /** The line over each progress bar. The number it counts is at the other end of the line, so it is not part of these. */
    progress: {
      downloading: "Downloading the ZIP file…",
      unpacking: "Unpacking…",
      matching: "Matching sounds to triggers…",
      looking: "Looking for sounds…",
      /** The number of sounds found so far, over the bar of a link that is no ZIP file. */
      found: "{count} found",
    },
    /** Said under the link field. */
    errors: {
      notHttps: "URL must start with https:// for security reasons",
      notAllowed: "Custom URLs are currently not supported due to security reasons",
      invalid: "Invalid URL format",
    },
  },
  /** The caller sets that can be picked: the options of the select. */
  sets: {
    pick: "Pick a set…",
    /** `region` is the country code of the set (NL, US), `voice` the voice's name, `gender` is female or male below. */
    label: "{region} - {voice} ({gender})",
    female: "Female",
    male: "Male",
  },
  /** The toasts of importing, sorting and clearing. The ones for adding and playing a sound are library.sounds.notifications. */
  notifications: {
    sorted: "Caller sounds have been sorted by their triggers",
    allDeleted: "All caller sounds have been deleted",
    noSoundsInZip: "No sounds found in the ZIP file or CSV mapping",
    noAudioInZip: "No audio files found in the ZIP file",
    importedFromZip: { one: "Successfully imported {count} sound from ZIP file", other: "Successfully imported {count} sounds from ZIP file" },
    importedFromUrl: { one: "Successfully imported {count} sound from URL", other: "Successfully imported {count} sounds from URL" },
    urlImportFailed: "Error importing sounds from URL",
    zipFailed: "Error processing ZIP file",
    zipDownloadFailed: "Failed to download ZIP file - check your URL",
    zipInvalid: "Invalid or corrupted ZIP file",
  },
};
