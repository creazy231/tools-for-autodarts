/**
 * WLED — components/Settings/Wled.vue. Its name is features.wled.
 * The list's menu button and its Delete all are library.moreActions, library.more, library.deleteAllMenu and
 * library.deleteAll; the trigger field's words are in triggers.ts, and the games' in gameModes.ts.
 * What an effect is made of is what is typed or stored, so it stays as it is inside a sentence in every language: the
 * type names `PRESET`, `URL` and `API` that a CSV line is read by, the example addresses (`wled-device.local`,
 * `192.168.0.69`), `presets.json`, the example board ID, and the words "JSON" and "CSV".
 */
export default {
  card: "Play WLED effects (or any other link) for events like gameon, takeout, and match wins.",
  /** The card picture's alt. It reads "WLED Effects" as it did before the catalogs, which is not the feature's name (features.wled is "WLED"). */
  imageAlt: "WLED Effects",
  intro: "Lights your WLED strips, or calls any other link, on game events. Each effect plays on the triggers you give it.",
  sections: {
    options: "Options",
  },
  boards: {
    title: "Boards",
    /** `trigger` is `other`, the trigger of the boards that aren't listed. It is what is typed, so it is a param and no translation can change it. */
    description: "Effects play only for throws on these boards, and on every board while the list is empty. An effect on <code>{trigger}</code> plays for throws on boards that aren't listed.",
    placeholder: "Paste a board ID and press Enter",
    /** Said under a chip that is no board ID. The example shows what one looks like: the same in every language. */
    invalid: "That doesn't look like a board ID. They look like 6a501a61-53a5-468a-a56a-17134ace3099.",
  },
  onlyOnce: {
    title: "Don't restart a running effect",
    description: "An effect that is already showing isn't sent again, so the lights don't start over.",
  },
  /** The row is headed gameModes.title. */
  gameModes: {
    description: "The games it lights up in. Lobby and tournament effects play in any game.",
    intro: "WLED only lights up in the games switched on here.",
  },
  list: {
    title: "Effects",
    searchPlaceholder: "Search effects by name, trigger or address",
    emptyTitle: "No effects yet",
    emptyText: "Add an effect for each moment you want your lights to show, or import a list of them.",
    /** The name the list gives an effect that has no name and no trigger. It is shown, and it is searched. */
    untitled: "Untitled effect",
    /** The tooltip of a row's play button. */
    send: "Send this effect",
    /** What a row says under its name. `n` is the preset's number on the device, `url` the address. */
    preset: "Preset {n} · {url}",
    api: "JSON API · {url}",
  },
  /** The Add menu and, for the same two labels, the empty list's buttons. */
  add: {
    effect: {
      label: "New effect",
      hint: "A preset, a link or a JSON API call",
    },
    csv: {
      label: "Import CSV",
      hint: "Several effects at once, one per line",
    },
  },
  /** The list's menu. Its button and its Delete all are library.moreActions, library.more and library.deleteAllMenu. */
  menu: {
    sort: {
      label: "Sort by trigger",
      hint: "Puts the list in trigger order",
    },
  },
  /** The CSV import dialog. The form of a line is shown as it is typed, and is the same in every language. */
  csv: {
    title: "Import effects from CSV",
    intro: "One effect per line, its fields separated by semicolons, in one of these forms:",
    /** A sample line: what is typed, so the same in every language. */
    example: "gameon;URL;http://wled-device.local/win/PL=1;gameon",
    button: "Import",
    /**
     * Said under the field. `line` is the line as it was pasted, and the quotes round it are part of the message.
     * The English of `type` leaves PRESET out of the types to choose from. It is kept as it was, and German and Dutch say what the English says.
     */
    errors: {
      fields: "Line \"{line}\" doesn't have name, URL and trigger",
      type: "Line \"{line}\": Invalid type. Choose from 'URL' or 'API'",
      url: "Line \"{line}\": URL must start with http:// or https://",
    },
    imported: { one: "{count} effect imported", other: "{count} effects imported" },
  },
  dialog: {
    addTitle: "New effect",
    editTitle: "Edit effect",
    nameLabel: "Name",
    namePlaceholder: "Optional: shown in the list",
    typeLabel: "Type",
    test: "Test",
    /** The primary button while adding; Save (common.save) while editing. */
    addButton: "Add effect",
  },
  /** The three kinds of effect: the options of the type picker, and a line under it for the one picked. */
  type: {
    options: {
      preset: "Preset",
      url: "URL",
      api: "JSON API",
    },
    hints: {
      preset: "Plays a preset saved on your WLED device, picked from its own list.",
      url: "Calls a link: a WLED API call such as /win/PL=1, or anything else.",
      api: "Sends a JSON body to WLED's /json endpoint.",
    },
  },
  address: {
    label: "WLED address",
    /** Two example addresses: the same in every language. */
    placeholder: "wled-device.local or 192.168.0.69",
    mixedContent: "A plain http:// address works on your own network, but a browser may block it as mixed content.",
  },
  /** The preset picker. Its three notes stand in the place of the device's presets until it has them; a preset of the device is shown by its own name. */
  preset: {
    label: "Preset",
    hint: "Read from the device's presets.json once the address is typed.",
    typeAddress: "Type the address first",
    readFailed: "Couldn't read presets from the device",
    pick: "Pick a preset",
  },
  link: {
    label: "Link",
    /** An example address: the same in every language. */
    placeholder: "http://wled-device.local/win/PL=1",
    mixedContent: "A plain http:// link works on your own network, but a browser may block it as mixed content.",
  },
  api: {
    endpointLabel: "API endpoint",
    /** An example address: the same in every language. */
    endpointPlaceholder: "http://wled-device.local/json",
  },
  /** Said under the dialog's fields when Save refuses. */
  errors: {
    linkScheme: "The link has to start with http:// or https://",
    presetFirst: "Pick a preset first.",
    jsonInvalid: "That isn't valid JSON.",
  },
  deleteAll: {
    /** The dialog's heading. The menu item and the confirm button are library.deleteAllMenu and library.deleteAll. */
    title: { one: "Delete the {count} effect?", other: "Delete all {count} effects?" },
    body: "They're removed for good. This can't be undone.",
  },
  notifications: {
    configNotLoaded: "Configuration not loaded",
    needsTrigger: "Please provide at least one trigger",
    needsUrl: "Please provide a URL",
    jsonInvalid: "JSON is invalid",
    added: "Effect added",
    updated: "Effect updated",
    removed: "Effect removed",
    sorted: "WLED effects have been sorted by their triggers",
    allDeleted: { one: "The {count} WLED effect has been deleted", other: "All {count} WLED effects have been deleted" },
  },
};
