/**
 * Sound FX — components/Settings/SoundFx.vue, and the notice that entrypoints/match.content/sound-fx.ts puts over a
 * match. Its name is features.soundFx.
 * What it shares with the Caller is in library.ts under `sounds`: the list's heading and search, the Add menu, Sort by
 * trigger, the delete-all and upload dialogs, "Untitled sound" and "Unnamed sound", and the toasts of adding and
 * playing a sound. The list menu's button and Delete all are library.moreActions, library.more,
 * library.deleteAllMenu and library.deleteAll; the trigger field's words are in triggers.ts, and the games' in
 * gameModes.ts.
 * The trigger prefix `ambient_` is what is typed, so the intro takes it as a param and no translation can change it.
 */
export default {
  card: "Play sound effects for special events like 180s, checkouts, and match wins.",
  /** `prefix` is `ambient_`. The Caller is features.caller, in its possessive. */
  intro: "Plays sound effects on game events, such as a crowd on a 180 or a groan on a bust. Each sound plays on the triggers you give it. Start them with <code>{prefix}</code> to keep them apart from the Caller's.",
  /** The notice over the match page, which stays until a click, a tap or a key press lets the page play sound. */
  audioNotice: "Please interact with the page (click, tap, or press a key) to enable audio for sound effects.",
  sections: {
    options: "Options",
  },
  /** The row is headed gameModes.title. Sound FX is features.soundFx. */
  gameModes: {
    description: "The games it plays in. Lobby and tournament sounds play in any game.",
    intro: "Sound FX only plays in the games switched on here.",
  },
  list: {
    emptyText: "Upload sounds of your own, add one from a link, or generate one from text.",
  },
  /** The toasts the Caller words differently or has no use for. The ones for adding and playing a sound are library.sounds.notifications. Sound FX is features.soundFx. */
  notifications: {
    configNotLoaded: "Configuration not loaded",
    sorted: "Sound FX sounds have been sorted by their triggers",
    allDeleted: "All sound effects have been deleted",
  },
};
