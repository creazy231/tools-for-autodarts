import type en from "../en/wled";
import type { Translation } from "../../utils/i18n/types";

export default {
  // Shorter than the English: the card's text sits in a column of two thirds of a card of fixed height.
  card: "WLED-effecten of links afspelen bij gameon, takeout en een gewonnen wedstrijd.",
  imageAlt: "WLED-effecten",
  intro: "Bij gebeurtenissen in het spel lichten je WLED-strips op, of wordt een andere link aangeroepen. Elk effect wordt afgespeeld bij de triggers die je eraan geeft.",
  sections: {
    options: "Opties",
  },
  onlyOnce: {
    title: "Een lopend effect niet opnieuw starten",
    description: "Een effect dat al actief is, wordt niet nog eens verzonden, zodat de verlichting niet opnieuw begint.",
  },
  keepTurnEffect: {
    title: "Het effect van de speler tussen de darts vasthouden",
    description: "Een dart zonder eigen effect haalt het effect terug waarmee de beurt begon, zoals dat van de speler, in plaats van gameon.",
  },
  gameModes: {
    description: "De spellen waarin WLED oplicht. Lobby- en toernooi-effecten worden in elk spel afgespeeld.",
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
    packs: {
      label: "Animatiepakketten",
      hint: "Kant-en-klare animaties voor LED-matrixen",
    },
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
      url: "Roept een link aan: een WLED-API-aanroep zoals /win/PL=1, of iets heel anders. <code>{player}</code> daarin wordt de naam van de speler die aan de beurt is, en <code>{player_ascii}</code> dezelfde naam in gewone letters.",
      api: "Stuurt een JSON-body naar het /json-eindpunt van WLED. <code>{player}</code> daarin wordt de naam van de speler die aan de beurt is, en <code>{player_ascii}</code> dezelfde naam in gewone letters, die het lettertype van een matrix kan tekenen.",
    },
  },
  samplePlayer: "Speler",
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
    pick: "Selecteer een preset",
  },
  preview: {
    title: "Voorbeeld",
    alt: "Voorbeeld van preset {preset} op {address}",
    name: "{name} · preset {preset}",
    unnamed: "Preset {preset}",
    loading: "De preset wordt van je WLED-apparaat gelezen…",
    unreachable: "Je WLED-apparaat op {address} gaf geen antwoord, dus er is geen voorbeeld.",
    unreachableShort: "{address} gaf geen antwoord",
    missing: "Je WLED-apparaat heeft geen preset {preset}.",
    effects: "{effects}: dit berekent WLED zelf, dus het is alleen in de verlichting te zien.",
    ownEffect: "Deze preset berekent WLED zelf, dus hij is alleen in de verlichting te zien.",
    empty: "Preset {preset} verandert niets wat te laten zien is.",
  },
  packs: {
    section: {
      title: "Animatiepakketten",
      intro: "Kant-en-klare animaties voor LED-matrixen. Tools zet ze op je WLED-apparaat: een heel pakket als eigen effectenset, of losse animaties in een van je sets.",
      browse: "Pakketten bekijken",
    },
    dialog: {
      title: "Animatiepakketten",
      intro: "Kies een pakket en de grootte van je matrix. Tools zet de animaties als presets op je WLED-apparaat en voegt de effecten toe aan Tools: een heel pakket als eigen effectenset, of losse animaties in de effectenset die je nu bewerkt.",
    },
    device: {
      label: "Je WLED-apparaat",
      hint: "Typ het adres van je WLED-apparaat om animaties toe te voegen.",
      reading: "Je WLED-apparaat wordt gezocht…",
      found: "{name} · WLED {version} · {size} · {free} kB vrij",
      foundNoRoom: "{name} · WLED {version} · {size}",
      unreachable: "Er gaf niets antwoord op {address}. Staat je WLED-apparaat aan en zit het op dit netwerk?",
      notWled: "{address} gaf antwoord, maar niet als WLED.",
      strip: {
        one: "Dit WLED-apparaat stuurt een strip met {count} led aan. De pakketten zijn voor LED-matrixen.",
        other: "Dit WLED-apparaat stuurt een strip met {count} leds aan. De pakketten zijn voor LED-matrixen.",
      },
    },
    card: {
      count: { one: "{count} animatie", other: "{count} animaties" },
      size: "Grootte",
      add: "Alles toevoegen",
      update: "Bijwerken",
      fits: "Gemaakt voor je WLED-apparaat ({size})",
      misfit: "Gemaakt voor {size}. Je WLED-apparaat is {device}.",
      added: "In je effectensets als {set}",
      newer: "Er is een nieuwere versie.",
      open: "Animaties bekijken",
      cover: "{pack} in {size}",
    },
    page: {
      back: "Alle pakketten",
      intro: "Voeg losse animaties toe aan de effectenset {set}, of allemaal als eigen effectenset.",
      noMatch: "Geen animatie heeft dat in de naam of de triggers.",
      addOne: "{name} toevoegen",
      adding: "Wordt op je WLED-apparaat gezet…",
      added: "Toegevoegd aan {set}",
      present: "Al in {set}",
    },
    otherSizes: "Wil je een pakket in een andere grootte, zoals 64 × 64? Vraag het op {discord}, op {github} of per {email}.",
    links: {
      email: "e-mail",
    },
    loadFailed: "De pakketten konden niet worden geladen. Laad de pagina opnieuw en probeer het nog eens.",
    install: {
      back: "Terug naar de pakketten",
      backTo: "Terug naar {pack}",
      summary: "Zet {files} animatiebestanden ({kb} kB) en {presets} presets op je WLED-apparaat op {address}, en voegt {effects} effecten in Tools toe als de effectenset {set}.",
      summaryUpdate: "Zet {files} animatiebestanden ({kb} kB) en {presets} presets opnieuw op je WLED-apparaat op {address}, en werkt de {effects} effecten van de effectenset {set} bij.",
      yours: "Je eigen presets blijven zoals ze zijn. Presets van een eerdere installatie van dit pakket worden bijgewerkt.",
      start: "Op mijn WLED zetten",
      steps: {
        read: "Je WLED-apparaat wordt gelezen…",
        upload: "De animaties gaan naar je WLED-apparaat: {done} van {count}",
        save: "De presets worden opgeslagen…",
        check: "Controleren…",
      },
      keepOpen: "Houd dit tabblad open tot het klaar is.",
      done: {
        one: "{pack} staat op je WLED-apparaat, en het effect staat in de effectenset {set}.",
        other: "{pack} staat op je WLED-apparaat, en de {count} effecten staan in de effectenset {set}.",
      },
      plays: "De set speelt vanaf nu.",
      waits: "De set die speelt is nog steeds {set}.",
      close: "Klaar",
      retry: "Opnieuw proberen",
      saveBackup: "Oude presets opslaan",
    },
    errors: {
      unreachable: "Je WLED-apparaat op {address} gaf geen antwoord. Staat het aan en zit het op dit netwerk?",
      notWled: "{address} is geen WLED-apparaat.",
      notMatrix: "Je WLED-apparaat stuurt een strip aan. De pakketten zijn voor LED-matrixen.",
      effectMissing: "Je WLED-apparaat heeft geen {effect}-effect, en dat heeft het pakket nodig. Daarvoor is WLED 16 of nieuwer op een ESP32 nodig.",
      presetsUnreadable: "De presets.json van je WLED-apparaat is niet te lezen, dus er is niets veranderd.",
      noSlots: "Het pakket heeft {needed} vrije presetnummers nodig, en je WLED-apparaat heeft er {free}.",
      noRoom: "Het pakket heeft {needed} kB nodig, en je WLED-apparaat heeft {free} kB vrij. Verwijder bestanden die je niet nodig hebt in de bestandseditor van WLED ({address}/edit).",
      locked: "Je WLED-apparaat is vergrendeld met een pincode voor de instellingen. Ontgrendel het in de instellingen van WLED en probeer het dan opnieuw.",
      uploadFailed: "{file} kon niet op je WLED-apparaat worden gezet. Controleer de verbinding en probeer het opnieuw.",
      restored: "Je WLED-apparaat heeft de nieuwe presets niet bewaard, dus de oude zijn teruggezet.",
      notRestored: "De presets van je WLED-apparaat zijn misschien beschadigd. Sla je oude presets op en zet ze in WLED terug onder Security & Updates.",
      packUnreadable: "Het pakket kon niet worden gelezen. Laad de pagina opnieuw en probeer het nog eens.",
    },
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
    presetFirst: "Selecteer eerst een preset.",
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
