import type en from "../en/wled";
import type { Translation } from "../../utils/i18n/types";

export default {
  // Shorter than the English: the card's text sits in a column of two thirds of a card of fixed height.
  card: "WLED-Effekte (oder andere Links) bei gameon, takeout und Matchgewinn abspielen.",
  imageAlt: "WLED-Effekte",
  intro: "Lässt bei Spielereignissen deine WLED-Streifen leuchten oder ruft einen beliebigen anderen Link auf. Jeder Effekt wird bei den Triggern abgespielt, die du ihm gibst.",
  sections: {
    options: "Optionen",
  },
  onlyOnce: {
    title: "Laufenden Effekt nicht neu starten",
    description: "Ein Effekt, der schon läuft, wird nicht noch einmal gesendet, damit die Lichter nicht von vorn beginnen.",
  },
  keepTurnEffect: {
    title: "Effekt des Spielers zwischen den Darts halten",
    description: "Ein Dart ohne eigenen Effekt holt den Effekt zurück, mit dem die Aufnahme begann, etwa den des Spielers, statt gameon.",
  },
  gameModes: {
    description: "Die Spiele, in denen WLED leuchtet. Lobby- und Turniereffekte werden in jedem Spiel abgespielt.",
    intro: "WLED leuchtet nur in den hier eingeschalteten Spielen.",
  },
  list: {
    title: "Effekte",
    searchPlaceholder: "Effekte nach Name, Trigger oder Adresse suchen",
    emptyTitle: "Noch keine Effekte",
    emptyText: "Füge für jeden Moment, den deine Lichter zeigen sollen, einen Effekt hinzu oder importiere eine Liste davon.",
    untitled: "Unbenannter Effekt",
    send: "Diesen Effekt senden",
    preset: "Preset {n} · {url}",
    api: "JSON-API · {url}",
  },
  add: {
    packs: {
      label: "Animationspakete",
      hint: "Fertige Animationen für LED-Matrizen",
    },
    effect: {
      label: "Neuer Effekt",
      hint: "Ein Preset, ein Link oder ein JSON-API-Aufruf",
    },
    csv: {
      label: "CSV importieren",
      hint: "Mehrere Effekte auf einmal, einer pro Zeile",
    },
  },
  menu: {
    sort: {
      label: "Nach Trigger sortieren",
      hint: "Ordnet die Liste nach Trigger",
    },
  },
  csv: {
    title: "Effekte aus CSV importieren",
    intro: "Ein Effekt pro Zeile, seine Felder durch Semikolons getrennt, in einer dieser Formen:",
    example: "gameon;URL;http://wled-device.local/win/PL=1;gameon",
    button: "Importieren",
    errors: {
      fields: "Zeile „{line}“ braucht Name, URL und Trigger",
      // Says what the English says: PRESET is not among the types it lists.
      type: "Zeile „{line}“: Ungültiger Typ. Wähle „URL“ oder „API“",
      url: "Zeile „{line}“: Die URL muss mit http:// oder https:// beginnen",
    },
    imported: { one: "{count} Effekt importiert", other: "{count} Effekte importiert" },
  },
  dialog: {
    addTitle: "Neuer Effekt",
    editTitle: "Effekt bearbeiten",
    nameLabel: "Name",
    namePlaceholder: "Optional: erscheint in der Liste",
    typeLabel: "Typ",
    // The same word as the English and a word of the language: the footer holds three buttons, and a phone's row is narrow.
    test: "Test",
    // Shorter than "Effekt hinzufügen": the footer holds three buttons, and a phone's row is narrow.
    addButton: "Hinzufügen",
  },
  type: {
    options: {
      preset: "Preset",
      url: "URL",
      api: "JSON-API",
    },
    hints: {
      preset: "Spielt ein auf deinem WLED-Gerät gespeichertes Preset ab, ausgewählt aus der Liste des Geräts.",
      url: "Ruft einen Link auf: einen WLED-API-Aufruf wie /win/PL=1 oder etwas ganz anderes. <code>{player}</code> darin wird zum Namen des Spielers, der dran ist, und <code>{player_ascii}</code> zum selben Namen in einfachen Buchstaben.",
      api: "Sendet einen JSON-Body an den /json-Endpunkt von WLED. <code>{player}</code> darin wird zum Namen des Spielers, der dran ist, und <code>{player_ascii}</code> zum selben Namen in einfachen Buchstaben, die die Schrift einer Matrix zeichnen kann.",
    },
  },
  samplePlayer: "Spieler",
  address: {
    label: "WLED-Adresse",
    placeholder: "wled-device.local oder 192.168.0.69",
    mixedContent: "Eine Adresse, die mit http:// beginnt, funktioniert im eigenen Netzwerk, aber ein Browser kann sie als Mixed Content blockieren.",
  },
  preset: {
    label: "Preset",
    hint: "Wird aus der presets.json des Geräts gelesen, sobald du die Adresse eingegeben hast.",
    typeAddress: "Gib zuerst die Adresse ein",
    readFailed: "Die Presets konnten nicht vom Gerät gelesen werden",
    pick: "Wähle ein Preset",
  },
  preview: {
    title: "Vorschau",
    alt: "Vorschau von Preset {preset} auf {address}",
    name: "{name} · Preset {preset}",
    unnamed: "Preset {preset}",
    loading: "Das Preset wird von deinem WLED-Gerät gelesen …",
    unreachable: "Dein WLED-Gerät unter {address} hat nicht geantwortet, darum gibt es keine Vorschau.",
    unreachableShort: "{address} hat nicht geantwortet",
    missing: "Dein WLED-Gerät hat kein Preset {preset}.",
    effects: "{effects}: Das berechnet WLED selbst, es ist nur an den Lichtern zu sehen.",
    ownEffect: "Dieses Preset berechnet WLED selbst, es ist nur an den Lichtern zu sehen.",
    empty: "Preset {preset} ändert nichts, was sich zeigen ließe.",
  },
  packs: {
    section: {
      title: "Animationspakete",
      intro: "Fertige Animationen für LED-Matrizen. Tools überträgt ein Paket auf dein WLED-Gerät und legt seine Effekte als eigenes Set an.",
      browse: "Pakete ansehen",
    },
    dialog: {
      title: "Animationspakete",
      intro: "Wähle ein Paket und die Größe deiner Matrix. Tools überträgt die Animationen als Presets auf dein WLED-Gerät und legt ihre Effekte in Tools als Effekt-Set an.",
    },
    device: {
      label: "Dein WLED-Gerät",
      hint: "Gib die Adresse deines WLED-Geräts ein, um ein Paket hinzuzufügen.",
      reading: "Dein WLED-Gerät wird gesucht …",
      found: "{name} · WLED {version} · {size} · {free} kB frei",
      foundNoRoom: "{name} · WLED {version} · {size}",
      unreachable: "Unter {address} hat nichts geantwortet. Ist dein WLED-Gerät an und in diesem Netzwerk?",
      notWled: "{address} hat geantwortet, aber nicht als WLED.",
      strip: {
        one: "Dieses WLED-Gerät steuert einen Streifen mit {count} LED. Die Pakete sind für LED-Matrizen.",
        other: "Dieses WLED-Gerät steuert einen Streifen mit {count} LEDs. Die Pakete sind für LED-Matrizen.",
      },
    },
    card: {
      count: { one: "{count} Animation", other: "{count} Animationen" },
      size: "Größe",
      add: "Hinzufügen",
      update: "Aktualisieren",
      fits: "Passt zu deinem WLED-Gerät ({size})",
      misfit: "Gemacht für {size}. Dein WLED-Gerät hat {device}.",
      added: "In deinen Effekt-Sets als {set}",
      newer: "Es gibt eine neuere Version.",
      show: { one: "Animation zeigen", other: "Alle {count} Animationen zeigen" },
      hide: "Animationen ausblenden",
      cover: "{pack} in {size}",
    },
    otherSizes: "Du brauchst ein Paket in einer anderen Größe, etwa 64 × 64? Frag auf {discord}, auf {github} oder per {email}.",
    links: {
      email: "E-Mail",
    },
    loadFailed: "Die Pakete konnten nicht geladen werden. Lade die Seite neu und versuch es noch einmal.",
    install: {
      back: "Zurück zu den Paketen",
      summary: "Überträgt {files} Animationsdateien ({kb} kB) und {presets} Presets auf dein WLED-Gerät unter {address} und legt {effects} Effekte in Tools als Effekt-Set {set} an.",
      summaryUpdate: "Überträgt {files} Animationsdateien ({kb} kB) und {presets} Presets erneut auf dein WLED-Gerät unter {address} und bringt die {effects} Effekte im Effekt-Set {set} auf den neuesten Stand.",
      yours: "Deine eigenen Presets bleiben, wie sie sind. Presets aus einer früheren Installation dieses Pakets werden auf den neuesten Stand gebracht.",
      start: "Auf mein WLED übertragen",
      steps: {
        read: "Dein WLED-Gerät wird gelesen …",
        upload: "Die Animationen werden übertragen: {done} von {count}",
        save: "Die Presets werden gespeichert …",
        check: "Wird geprüft …",
      },
      keepOpen: "Lass diesen Tab offen, bis alles fertig ist.",
      done: {
        one: "{pack} ist auf deinem WLED-Gerät, und sein Effekt ist im Effekt-Set {set}.",
        other: "{pack} ist auf deinem WLED-Gerät, und seine {count} Effekte sind im Effekt-Set {set}.",
      },
      plays: "Das Set spielt ab jetzt.",
      waits: "Gespielt wird weiter das Set {set}.",
      close: "Fertig",
      retry: "Noch einmal versuchen",
      saveBackup: "Alte Presets speichern",
    },
    errors: {
      unreachable: "Dein WLED-Gerät unter {address} hat nicht geantwortet. Ist es an und in diesem Netzwerk?",
      notWled: "{address} ist kein WLED-Gerät.",
      notMatrix: "Dein WLED-Gerät steuert einen Streifen. Die Pakete sind für LED-Matrizen.",
      effectMissing: "Deinem WLED-Gerät fehlt der Effekt {effect}, den das Paket braucht. Den gibt es ab WLED 0.15 auf einem ESP32.",
      presetsUnreadable: "Die presets.json deines WLED-Geräts lässt sich nicht lesen, darum wurde nichts geändert.",
      noSlots: "Das Paket braucht {needed} freie Preset-Nummern, und dein WLED-Gerät hat {free}.",
      noRoom: "Das Paket braucht {needed} kB, und dein WLED-Gerät hat {free} kB frei. Lösche Dateien, die du nicht brauchst, im Dateieditor von WLED ({address}/edit).",
      locked: "Dein WLED-Gerät ist mit einer PIN für die Einstellungen gesperrt. Entsperre es in den Einstellungen von WLED und versuch es dann noch einmal.",
      uploadFailed: "{file} konnte nicht auf dein WLED-Gerät übertragen werden. Prüfe die Verbindung und versuch es noch einmal.",
      restored: "Dein WLED-Gerät hat die neuen Presets nicht behalten, darum wurden die alten zurückgespielt.",
      notRestored: "Die Presets deines WLED-Geräts sind womöglich beschädigt. Speichere deine alten Presets und stelle sie in WLED unter Security & Updates wieder her.",
      packUnreadable: "Das Paket konnte nicht gelesen werden. Lade die Seite neu und versuch es noch einmal.",
    },
  },
  link: {
    label: "Link",
    placeholder: "http://wled-device.local/win/PL=1",
    mixedContent: "Ein Link, der mit http:// beginnt, funktioniert im eigenen Netzwerk, aber ein Browser kann ihn als Mixed Content blockieren.",
  },
  api: {
    endpointLabel: "API-Endpunkt",
    endpointPlaceholder: "http://wled-device.local/json",
  },
  errors: {
    linkScheme: "Der Link muss mit http:// oder https:// beginnen",
    presetFirst: "Wähle zuerst ein Preset.",
    jsonInvalid: "Das ist kein gültiges JSON.",
  },
  deleteAll: {
    title: { one: "Den Effekt löschen?", other: "Alle {count} Effekte löschen?" },
    body: "Sie werden dauerhaft gelöscht. Dies kann nicht rückgängig gemacht werden.",
  },
  notifications: {
    // The site's own word for a configuration is Konfiguration (account.removeAccount.loseItems.boards).
    configNotLoaded: "Konfiguration nicht geladen",
    needsTrigger: "Gib mindestens einen Trigger an",
    needsUrl: "Gib eine URL an",
    jsonInvalid: "JSON ist ungültig",
    added: "Effekt hinzugefügt",
    updated: "Effekt aktualisiert",
    removed: "Effekt entfernt",
    sorted: "Die WLED-Effekte wurden nach ihren Triggern sortiert",
    allDeleted: { one: "Der WLED-Effekt wurde gelöscht", other: "Alle {count} WLED-Effekte wurden gelöscht" },
  },
} satisfies Translation<typeof en>;
