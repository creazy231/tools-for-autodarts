/**
 * Animations — components/Settings/Animations.vue. Its name is features.animations.
 * The list's menu button, its Delete all, and the words of its rows and filters are shared with the Caller,
 * Sound FX and WLED, and are in library.ts; the trigger field's words are in triggers.ts, and the games' in
 * gameModes.ts. A trigger (`180`, `bull`) is what is typed, so it stays as it is inside a sentence, and so
 * do the example file names in upload.namesHint.
 */
export default {
  card: "Displays animations for special events like 180s, bulls, busts, and leg wins during gameplay.",
  intro: "Shows a GIF over the board at the moments you pick: a 180, a bull, a bust, a won leg. A click puts it away early.",
  /** What one animation is called where a sentence needs a noun: "Delete animation" (library.deleteNamed), "Edit animation" (library.editNamed). */
  noun: "animation",
  /** The name of an animation that has no triggers, on its switch ("Animation on animation: on") and in the search. */
  untitled: "animation",
  /** The filter pill for every trigger that is no built-in event. The library files those under Players; here they are anything else. */
  categoryOther: "Other",
  sections: {
    options: "Options",
  },
  startDelay: {
    title: "Start delay",
    description: "Seconds between the dart and the animation.",
  },
  showFor: {
    title: "Show for",
    description: "Seconds an animation stays up.",
  },
  fit: {
    title: "Fit",
    description: "Cover fills the space and may crop the GIF. Contain shows all of it.",
    options: {
      cover: "Cover",
      contain: "Contain",
    },
  },
  covers: {
    title: "Covers",
    description: "Just the board, or the whole page over a blurred background.",
    options: {
      boardOnly: "Board only",
      fullPage: "Full page",
    },
  },
  /** The row is headed gameModes.title. */
  boards: {
    title: "Boards",
    description: "Animations play only for throws and wins on these boards, and on every board while the list is empty. This is useful in online matches so a remote opponent does not trigger your local GIFs.",
    placeholder: "Paste a board ID and press Enter",
    invalid: "That doesn't look like a board ID. Example: 6a501a61-53a5-468a-a56a-17134ace3099.",
  },
  gameModes: {
    description: "The games it shows GIFs in.",
    intro: "Animations only show in the games switched on here.",
  },
  list: {
    emptyTitle: "No animations yet",
    emptyText: "Upload GIFs from your computer, or add one from a link. Links from Tenor and Giphy work.",
    searchPlaceholder: "Search animations by trigger or link",
  },
  /** The two ways to add GIFs: the Add menu, the empty list's buttons and (for upload) the dialog's heading. */
  add: {
    upload: {
      label: "Upload GIFs",
      hint: "From your computer, several at once",
    },
    link: {
      label: "Add from a link",
      hint: "A GIF on the web, e.g. from Tenor or Giphy",
    },
  },
  /** The list's menu. Its button and its Delete all are library.moreActions, library.more and library.deleteAllMenu. */
  menu: {
    sort: {
      label: "Sort by trigger",
      hint: "Puts the grid in trigger order",
    },
  },
  tile: {
    /** `triggers` is the animation's triggers joined with commas, or noTrigger. */
    alt: "Animation on {triggers}",
    /** Said in place of {triggers} when the animation has none, so it must fit "Animation on …". */
    noTrigger: "no trigger",
    /** The switch's spoken name: "Animation on 180: on". `name` is its triggers joined with commas, or untitled; `state` is library.state.on or library.state.off. */
    switchLabel: "Animation on {name}: {state}",
    /** The chip of an animation with a length of its own, as its tooltip. `duration` is the length with its unit: "2.37 s". */
    lengthTitle: "Stays up for {duration}",
    /** What a screen reader says before the length the chip shows, so it must end where lengthTitle's {duration} does. */
    lengthSpoken: "Stays up for",
  },
  dialog: {
    addTitle: "Add an animation from a link",
    editTitle: "Edit animation",
    previewAlt: "Preview",
    uploadedLabel: "Uploaded GIF",
    linkLabel: "Link to a GIF",
    /** An example address: the same in every language. */
    linkPlaceholder: "https://example.com/animation.gif",
    /** `filename` is the file's name as it was uploaded, or unknownFile. */
    uploadedHint: "Kept in this browser as {filename}. Its triggers and how long it stays up can be changed.",
    /** Said in place of the file's name when none was stored. */
    unknownFile: "unknown",
    useLength: "Use the GIF's length",
    useLengthTitle: "Fill in how long one run of this GIF takes",
    useLengthNeedsLink: "Add a link to a GIF first",
    /** `option` is the Show for option's title, showFor.title, so the two stay the same words. */
    showForHint: "Leave it empty to use the {option} option ({seconds} s).",
    addButton: "Add animation",
  },
  /** Why "Use the GIF's length" found none, said under the field. The panel keeps the key of the one it shows. */
  lengthErrors: {
    link: "This link's site doesn't let the extension read the file, so its length can't be read.",
    upload: "The uploaded GIF couldn't be read.",
    notAnimated: "This isn't an animated GIF, so it has no length to read.",
  },
  /** Under the trigger field, for a trigger that animations have no event for. */
  triggerUnknown: "Animations don't know this trigger.",
  upload: {
    /** The two example file names and the `+` are what a person types, so they stay as they are in every language. */
    namesHint: "A file named 180.gif plays on 180. Join several with a +, as in 180+t20.gif. A name that isn't a trigger gives none.",
  },
  deleteAll: {
    /** The dialog's heading. The menu item and the confirm button are library.deleteAllMenu and library.deleteAll. */
    title: { one: "Delete the {count} animation?", other: "Delete all {count} animations?" },
    body: "They're removed for good, uploaded GIFs included. This can't be undone.",
  },
  notifications: {
    needsLink: "Add a link to a GIF first.",
    /** `triggers` are the ones that were removed, as typed, joined with commas. */
    invalidTriggers: "Some triggers were invalid and removed: {triggers}",
    noValidTriggers: "No valid triggers found. Please check the documentation for supported trigger formats.",
    noStorage: "Your browser doesn't support file storage. Try a different browser.",
    /** `name` is the file's name. */
    failedToProcess: "Failed to process {name}",
    added: { one: "Added {count} GIF", other: "Added {count} GIFs" },
    processingError: "Error processing files",
    allDeleted: "All animations have been deleted",
    sorted: "Animations have been sorted by their triggers",
  },
};
