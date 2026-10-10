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
  // "In Benutzung" and "benutzen" after the site's own "bereits in Benutzung" (account.email.errors.emailInUse).
  sets: {
    title: "Effekt-Sets",
    introSingle: "Lege für einen Anlass wie Halloween oder einen Geburtstag eine weitere Liste mit Effekten an und wechsle zu ihr, wenn der Tag gekommen ist.",
    intro: "Es wird immer ein Set abgespielt. Wähle ein Set, um seine Effekte zu bearbeiten; abgespielt wird es erst, wenn du es benutzt.",
    defaultName: "Standard",
    new: "Neues Set",
    inUse: "In Benutzung",
    cardLabel: "Effekt-Set in Benutzung:",
    status: {
      inUse: "Das ist das Set, das abgespielt wird.",
      notInUse: "Nicht in Benutzung. Abgespielt wird {set}.",
    },
    use: "Dieses Set benutzen",
    menu: {
      rename: "Set umbenennen",
      delete: "Set löschen",
      deleteInUse: "Benutze zuerst ein anderes Set",
    },
    dialog: {
      newTitle: "Neues Effekt-Set",
      renameTitle: "Set umbenennen",
      nameLabel: "Name",
      namePlaceholder: "Halloween, Weihnachten, ein Geburtstag …",
      // Over two buttons, "Kopie von …" and "Keine Effekte": "Beginnen mit" would want the dative in both.
      startLabel: "Inhalt",
      copy: "Kopie von {set}",
      empty: "Keine Effekte",
      create: "Set erstellen",
    },
    errors: {
      nameMissing: "Gib dem Set einen Namen.",
      nameTaken: "Es gibt schon ein Set mit diesem Namen.",
    },
    deleteDialog: {
      title: "{set} löschen?",
      body: {
        one: "Das Set und sein Effekt werden dauerhaft gelöscht. Dies kann nicht rückgängig gemacht werden.",
        other: "Das Set und seine {count} Effekte werden dauerhaft gelöscht. Dies kann nicht rückgängig gemacht werden.",
      },
      bodyEmpty: "Das Set hat keine Effekte. Dies kann nicht rückgängig gemacht werden.",
      confirm: "Set löschen",
    },
    notifications: {
      created: "{set} erstellt. Abgespielt wird es, sobald du es benutzt.",
      inUse: "Jetzt wird {set} abgespielt.",
      renamed: "Set umbenannt",
      deleted: "{set} gelöscht",
    },
  },
  boards: {
    title: "Boards",
    description: "Effekte werden nur bei Würfen auf diesen Boards abgespielt, bei leerer Liste auf jedem Board. Ein Effekt auf <code>{trigger}</code> wird bei Würfen auf Boards abgespielt, die nicht in der Liste stehen.",
    placeholder: "Board-ID einfügen und Enter drücken",
    invalid: "Das sieht nicht nach einer Board-ID aus. Eine Board-ID sieht so aus: 6a501a61-53a5-468a-a56a-17134ace3099.",
  },
  onlyOnce: {
    title: "Laufenden Effekt nicht neu starten",
    description: "Ein Effekt, der schon läuft, wird nicht noch einmal gesendet, damit die Lichter nicht von vorn beginnen.",
  },
  gameModes: {
    description: "Die Spiele, in denen WLED leuchtet. Lobby- und Turniereffekte werden in jedem Spiel abgespielt.",
    intro: "WLED leuchtet nur in den hier eingeschalteten Spielen.",
  },
  list: {
    title: "Effekte",
    titleInSet: "Effekte in {set}",
    searchPlaceholder: "Effekte nach Name, Trigger oder Adresse suchen",
    emptyTitle: "Noch keine Effekte",
    emptyText: "Füge für jeden Moment, den deine Lichter zeigen sollen, einen Effekt hinzu oder importiere eine Liste davon.",
    untitled: "Unbenannter Effekt",
    send: "Diesen Effekt senden",
    preset: "Preset {n} · {url}",
    api: "JSON-API · {url}",
  },
  add: {
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
