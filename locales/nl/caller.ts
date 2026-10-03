import type en from "../en/caller";
import type { Translation } from "../../utils/i18n/types";

export default {
  // Shorter than the English: the card's text sits in a column of two thirds of a card of fixed height.
  card: "Scores, checkouts en bijzondere momenten tijdens je wedstrijden afroepen, met eigen geluiden.",
  intro: "Roept scores, checkouts en namen af tijdens een wedstrijd, met een stem naar keuze. Elk geluid wordt afgespeeld bij de triggers die je eraan geeft.",
  audioNotice: "Interageer met de pagina (klik, tik of druk op een toets) om het geluid voor de caller in te schakelen.",
  sections: {
    options: "Opties",
  },
  // The site's own words for the first two rows (inGameSettings.callerSettings.callCheckout): "Checkout afroepen".
  callEveryDart: {
    title: "Elke dart afroepen",
    description: "Roept elke dart af zodra hij landt, niet alleen het totaal van de beurt.",
  },
  callCheckout: {
    title: "Checkout afroepen",
    description: "Roept af wat een speler nodig heeft als die op een finish staat, en in Gotcha hoeveel er nog tot het doel ontbreekt.",
  },
  combinedThrows: {
    title: "Gecombineerde worpen voorrang geven",
    description: "Als er een geluid is voor precies die darts, zoals <code>{token}</code>, wordt dat afgespeeld in plaats van het totaal van de beurt.",
  },
  gameModes: {
    description: "De spellen waarin wordt afgeroepen.",
    intro: "De Caller roept alleen af in de spellen die hier aan staan.",
  },
  list: {
    emptyText: "Importeer een kant-en-klare Caller-set, upload eigen opnamen of genereer ze uit tekst.",
  },
  import: {
    title: "Caller-set importeren",
    hint: "Kant-en-klare stemmen in acht talen",
    setLabel: "Caller-set",
    setHelper: "Van darts-downloads.peschi.org. Sommige sets worden in Safari mogelijk niet afgespeeld, en Tools for Autodarts is niet verantwoordelijk voor wat ze zeggen.",
    linkLabel: "Link",
    linkPlaceholder: "https://darts-downloads.peschi.org/soundfiles/…",
    linkHint: "Wordt ingevuld vanuit de set hierboven, of gebruik een eigen link: een ZIP-bestand of een map met bestanden die 0.mp3 tot en met 180.mp3 heten. De triggers komen uit de bestandsnamen. Links op darts-downloads.peschi.org, adt-socket.tobias-thiele.de en autodarts.x10.mx worden ondersteund.",
    button: "Importeren",
    cancelConfirm: "Er loopt nog een import. Weet je zeker dat je wilt annuleren?",
    progress: {
      downloading: "ZIP-bestand downloaden…",
      unpacking: "Uitpakken…",
      matching: "Geluiden aan triggers koppelen…",
      looking: "Zoeken naar geluiden…",
      found: "{count} gevonden",
    },
    errors: {
      notHttps: "De URL moet om veiligheidsredenen met https:// beginnen",
      notAllowed: "Eigen URL's worden om veiligheidsredenen momenteel niet ondersteund",
      invalid: "Ongeldig URL-formaat",
    },
  },
  sets: {
    pick: "Selecteer een set…",
    label: "{region} - {voice} ({gender})",
    female: "vrouw",
    male: "man",
  },
  notifications: {
    sorted: "De Caller-geluiden zijn op hun triggers gesorteerd",
    allDeleted: "Alle Caller-geluiden zijn verwijderd",
    noSoundsInZip: "Geen geluiden gevonden in het ZIP-bestand of de CSV-koppeling",
    noAudioInZip: "Geen audiobestanden gevonden in het ZIP-bestand",
    importedFromZip: { one: "{count} geluid succesvol geïmporteerd uit het ZIP-bestand", other: "{count} geluiden succesvol geïmporteerd uit het ZIP-bestand" },
    importedFromUrl: { one: "{count} geluid succesvol geïmporteerd van de URL", other: "{count} geluiden succesvol geïmporteerd van de URL" },
    urlImportFailed: "Fout bij het importeren van geluiden van de URL",
    zipFailed: "Fout bij het verwerken van het ZIP-bestand",
    // The English has a spaced hyphen, and so does this: the glossary keeps it.
    zipDownloadFailed: "ZIP-bestand kon niet worden gedownload - controleer je URL",
    zipInvalid: "Ongeldig of beschadigd ZIP-bestand",
  },
} satisfies Translation<typeof en>;
