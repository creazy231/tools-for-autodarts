import type en from "../en/wled";
import type { Translation } from "../../utils/i18n/types";

export default {
  // Shorter than the English: the card's text sits in a column of two thirds of a card of fixed height.
  card: "WLED-effecten (of andere links) afspelen bij gameon, takeout en wedstrijdwinst.",
  imageAlt: "WLED-effecten",
  intro: "Bij gebeurtenissen in het spel lichten je WLED-strips op, of wordt een andere link aangeroepen. Elk effect wordt afgespeeld bij de triggers die je eraan geeft.",
  sections: {
    options: "Opties",
  },
  boards: {
    title: "Borden",
    description: "Effecten worden alleen afgespeeld bij worpen op deze borden, en op elk bord zolang de lijst leeg is. Een effect op <code>{trigger}</code> wordt afgespeeld bij worpen op borden die niet in de lijst staan.",
    placeholder: "Plak een bord-ID en druk op Enter",
    invalid: "Dat lijkt niet op een bord-ID. Een bord-ID ziet er zo uit: 6a501a61-53a5-468a-a56a-17134ace3099.",
  },
  onlyOnce: {
    title: "Een lopend effect niet opnieuw starten",
    description: "Een effect dat al actief is, wordt niet opnieuw verzonden, zodat de verlichting niet opnieuw begint.",
  },
  gameModes: {
    description: "De spellen waarin WLED oplicht. Effecten in lobby's en toernooien worden in elk spel afgespeeld.",
    intro: "WLED licht alleen op in de spellen die hier aan staan.",
  },
  list: {
    title: "Effecten",
    searchPlaceholder: "Effecten zoeken op naam, trigger of adres",
    emptyTitle: "Nog geen effecten",
    emptyText: "Voeg een effect toe voor elk moment dat je verlichting moet laten zien, of importeer er een lijst van.",
    untitled: "Naamloos effect",
    send: "Dit effect verzenden",
    preset: "Preset {n} · {url}",
    api: "JSON-API · {url}",
  },
  add: {
    effect: {
      label: "Nieuw effect",
      hint: "Een preset, een link of een JSON-API-aanroep",
    },
    csv: {
      label: "CSV importeren",
      hint: "Meerdere effecten tegelijk, één per regel",
    },
  },
  menu: {
    sort: {
      label: "Sorteren op trigger",
      hint: "Zet de lijst in triggervolgorde",
    },
  },
  csv: {
    title: "Effecten importeren uit CSV",
    intro: "Eén effect per regel, de velden gescheiden door puntkomma's, in een van deze vormen:",
    example: "gameon;URL;http://wled-device.local/win/PL=1;gameon",
    button: "Importeren",
    errors: {
      fields: "Regel '{line}' heeft een naam, URL en trigger nodig",
      // Says what the English says: PRESET is not among the types it lists.
      type: "Regel '{line}': ongeldig type. Kies 'URL' of 'API'",
      url: "Regel '{line}': de URL moet met http:// of https:// beginnen",
    },
    imported: { one: "{count} effect geïmporteerd", other: "{count} effecten geïmporteerd" },
  },
  dialog: {
    addTitle: "Nieuw effect",
    editTitle: "Effect bewerken",
    nameLabel: "Naam",
    namePlaceholder: "Optioneel: getoond in de lijst",
    typeLabel: "Type",
    // The same word as the English and a word of the language: the footer holds three buttons, and a phone's row is narrow.
    test: "Test",
    // Shorter than "Effect toevoegen": the footer holds three buttons, and a phone's row is narrow.
    addButton: "Toevoegen",
  },
  type: {
    options: {
      preset: "Preset",
      url: "URL",
      api: "JSON-API",
    },
    hints: {
      preset: "Speelt een preset af die op je WLED-apparaat is opgeslagen, gekozen uit de lijst van het apparaat zelf.",
      url: "Roept een link aan: een WLED-API-aanroep zoals /win/PL=1, of iets heel anders.",
      api: "Stuurt een JSON-body naar het /json-eindpunt van WLED.",
    },
  },
  address: {
    label: "WLED-adres",
    placeholder: "wled-device.local of 192.168.0.69",
    mixedContent: "Een adres dat met http:// begint, werkt in je eigen netwerk, maar een browser kan het blokkeren als mixed content.",
  },
  preset: {
    label: "Preset",
    hint: "Wordt uit de presets.json van het apparaat gelezen zodra je het adres hebt ingevoerd.",
    typeAddress: "Voer eerst het adres in",
    readFailed: "Kon de presets niet van het apparaat lezen",
    pick: "Kies een preset",
  },
  link: {
    label: "Link",
    placeholder: "http://wled-device.local/win/PL=1",
    mixedContent: "Een link die met http:// begint, werkt in je eigen netwerk, maar een browser kan hem blokkeren als mixed content.",
  },
  api: {
    endpointLabel: "API-eindpunt",
    endpointPlaceholder: "http://wled-device.local/json",
  },
  errors: {
    linkScheme: "De link moet met http:// of https:// beginnen",
    presetFirst: "Kies eerst een preset.",
    jsonInvalid: "Dit is geen geldige JSON.",
  },
  deleteAll: {
    title: { one: "Het effect verwijderen?", other: "Alle {count} effecten verwijderen?" },
    body: "Ze worden definitief verwijderd. Dit kan niet ongedaan worden gemaakt.",
  },
  notifications: {
    // The site's own word for a configuration is configuratie (account.removeAccount.loseItems.boards).
    configNotLoaded: "Configuratie niet geladen",
    needsTrigger: "Geef minstens één trigger op",
    needsUrl: "Geef een URL op",
    jsonInvalid: "JSON is ongeldig",
    added: "Effect toegevoegd",
    updated: "Effect bijgewerkt",
    removed: "Effect verwijderd",
    sorted: "De WLED-effecten zijn op hun triggers gesorteerd",
    allDeleted: { one: "Het WLED-effect is verwijderd", other: "Alle {count} WLED-effecten zijn verwijderd" },
  },
} satisfies Translation<typeof en>;
