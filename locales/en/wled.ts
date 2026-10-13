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
  onlyOnce: {
    title: "Don't restart a running effect",
    description: "An effect that is already showing isn't sent again, so the lights don't start over.",
  },
  keepTurnEffect: {
    title: "Keep the player's effect between darts",
    description: "A dart that sets off no effect of its own brings back the effect the turn started with, such as the player's own, instead of gameon.",
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
    packs: {
      label: "Animation packs",
      hint: "Ready-made animations for LED matrices",
    },
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
    /** `player` and `player_ascii` are the placeholders as they are typed: params, so no translation can change them. */
    hints: {
      preset: "Plays a preset saved on your WLED device, picked from its own list.",
      url: "Calls a link: a WLED API call such as /win/PL=1, or anything else. <code>{player}</code> in it becomes the name of the player whose turn it is, and <code>{player_ascii}</code> the same name in plain letters.",
      api: "Sends a JSON body to WLED's /json endpoint. <code>{player}</code> in it becomes the name of the player whose turn it is, and <code>{player_ascii}</code> the same name in plain letters, which a matrix's font can draw.",
    },
  },
  /** What {player} stands for when an effect is sent from here (its play button, Test) while nobody is signed in. It is shown on the lights. */
  samplePlayer: "Player",
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
  /** WLED previews: an effect's preset drawn from the user's own WLED (components/Settings/Wled/PresetPreview.vue). */
  preview: {
    title: "Preview",
    /** The preview's accessible name. `address` is the device's, such as 192.168.0.227. */
    alt: "Preview of preset {preset} on {address}",
    /** Under the dialog's preview: the preset's name on the device, and its number. */
    name: "{name} · preset {preset}",
    unnamed: "Preset {preset}",
    loading: "Reading the preset from your WLED…",
    unreachable: "Your WLED at {address} didn't answer, so there's no preview.",
    /** A row's tooltip on the icon it shows instead. */
    unreachableShort: "{address} didn't answer",
    missing: "Your WLED has no preset {preset}.",
    /** `effects` are WLED's own effect names, such as "Fire 2012". */
    effects: "{effects}: WLED draws this itself, so it only shows on the lights.",
    ownEffect: "WLED draws this preset itself, so it only shows on the lights.",
    empty: "Preset {preset} changes nothing that can be shown.",
  },
  /**
   * Animation packs: ready-made animations put on the user's WLED and added as an effect set
   * (components/Settings/Wled/PacksDialog.vue). A pack's name and description come with the pack, in each language.
   * A size is written "32 × 8", width × height, in every language.
   */
  packs: {
    /** The panel's first section, above its intro: the packs, a tile each. */
    section: {
      title: "Animation packs",
      intro: "Ready-made animations for LED matrices. Tools puts them on your WLED: a whole pack as an effect set of its own, or single animations into one of your sets.",
      browse: "Browse packs",
    },
    dialog: {
      title: "Animation packs",
      intro: "Pick a pack and the size of your matrix. Tools puts the animations on your WLED as presets and adds their effects to Tools: a whole pack as an effect set of its own, or single animations into the effect set you're editing.",
    },
    /** The address field and the line under it, which says what answered there. */
    device: {
      label: "Your WLED",
      hint: "Type your WLED's address to add animations.",
      reading: "Looking for your WLED…",
      /** `name` is the WLED's own name, `version` its WLED version, `size` its matrix ("64 × 8") and `free` its free space in kB. */
      found: "{name} · WLED {version} · {size} · {free} kB free",
      /** The same, for a WLED that doesn't say how much room it has. */
      foundNoRoom: "{name} · WLED {version} · {size}",
      /** `address` is what was typed, such as 192.168.0.227. */
      unreachable: "Nothing answered at {address}. Is your WLED on and on this network?",
      notWled: "{address} answered, but not as a WLED.",
      strip: {
        one: "This WLED drives a strip of {count} LED. The packs are for LED matrices.",
        other: "This WLED drives a strip of {count} LEDs. The packs are for LED matrices.",
      },
    },
    /** A pack's card. */
    card: {
      count: { one: "{count} animation", other: "{count} animations" },
      /** The size choice's accessible name. */
      size: "Size",
      add: "Add all",
      update: "Update",
      /** `size` is the size picked, such as "64 × 8". */
      fits: "Made for your WLED ({size})",
      /** `size` is the size picked, `device` the WLED's matrix. Adding it is still possible. */
      misfit: "Made for {size}. Your WLED is {device}.",
      /** `set` is the name of the effect set the pack was added as. */
      added: "In your effect sets as {set}",
      newer: "A newer version is here.",
      /** Opens the pack's page, where single animations can be added. */
      open: "Show animations",
      /** The cover's accessible name: `pack` is the pack's name, `size` the size shown. */
      cover: "{pack} at {size}",
    },
    /** A pack's page: its animations, each of which can be added alone. `set` is the name of the effect set single animations go into. */
    page: {
      back: "All packs",
      intro: "Add single animations to the effect set {set}, or all of them as an effect set of their own.",
      /** Under library.section.nothingMatches when the search finds none. */
      noMatch: "No animation has that in its name or triggers.",
      /** The row's + button: its accessible name and tooltip. `name` is the animation's. */
      addOne: "Add {name}",
      adding: "Putting it on your WLED…",
      added: "Added to {set}",
      present: "Already in {set}",
    },
    /** Under the packs. {discord} and {github} are links named Discord and GitHub, {email} a link named links.email. */
    otherSizes: "Need a pack in another size, such as 64 × 64? Ask on {discord}, on {github} or by {email}.",
    links: {
      email: "email",
    },
    loadFailed: "The packs couldn't be loaded. Reload the page and try again.",
    /** Putting a pack on the WLED. Using the new set afterwards is library.sets.use. */
    install: {
      back: "Back to the packs",
      /** The same, back to the page of the pack being added, by its name. */
      backTo: "Back to {pack}",
      /** `files` animation files of `kb` kB and `presets` presets go on the WLED at `address`; `effects` effects become the set `set`. */
      summary: "Puts {files} animation files ({kb} kB) and {presets} presets on your WLED at {address}, and adds {effects} effects to Tools as the effect set {set}.",
      /** The same, for a pack added before: its set is brought up to date. */
      summaryUpdate: "Puts {files} animation files ({kb} kB) and {presets} presets on your WLED at {address} again, and brings the {effects} effects of the effect set {set} up to date.",
      yours: "Your own presets stay as they are. Presets from an earlier install of this pack are brought up to date.",
      start: "Put it on my WLED",
      steps: {
        read: "Reading your WLED…",
        /** `done` of `count` animation files. */
        upload: "Putting the animations on your WLED: {done} of {count}",
        save: "Saving the presets…",
        check: "Checking…",
      },
      keepOpen: "Keep this tab open until it's done.",
      done: {
        one: "{pack} is on your WLED, and its effect is in the effect set {set}.",
        other: "{pack} is on your WLED, and its {count} effects are in the effect set {set}.",
      },
      plays: "The set plays from now on.",
      /** `set` is the name of the set that plays. */
      waits: "The set that plays is still {set}.",
      close: "Done",
      retry: "Try again",
      saveBackup: "Save your old presets",
    },
    /** Why a pack couldn't be put on the WLED. `address` is the WLED's, such as 192.168.0.227. */
    errors: {
      unreachable: "Your WLED at {address} didn't answer. Is it on and on this network?",
      notWled: "{address} isn't a WLED.",
      notMatrix: "Your WLED drives a strip. The packs are for LED matrices.",
      /** `effect` is WLED's name of an effect, such as Image. */
      effectMissing: "Your WLED has no {effect} effect, which the pack needs. It takes WLED 16 or newer on an ESP32.",
      presetsUnreadable: "Your WLED's presets.json can't be read, so nothing was changed.",
      noSlots: "The pack needs {needed} free preset numbers, and your WLED has {free}.",
      /** `address` here is the WLED's whole address, such as http://192.168.0.227. */
      noRoom: "The pack needs {needed} kB, and your WLED has {free} kB free. Delete files you don't need in WLED's file editor ({address}/edit).",
      locked: "Your WLED is locked with a settings PIN. Unlock it in WLED's settings, then try again.",
      /** `file` is the file's name, such as ad_180.gif. */
      uploadFailed: "Putting {file} on your WLED failed. Check the connection and try again.",
      restored: "Your WLED didn't keep the new presets, so the old ones were put back.",
      notRestored: "Your WLED's presets may be damaged. Save your old presets and restore them in WLED under Security & Updates.",
      packUnreadable: "The pack couldn't be read. Reload the page and try again.",
    },
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
