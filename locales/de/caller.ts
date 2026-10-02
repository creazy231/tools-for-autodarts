import type en from "../en/caller";
import type { Translation } from "../../utils/i18n/types";

export default {
  // Shorter than the English: the card's text sits in a column of two thirds of a card of fixed height.
  card: "Scores, Checkouts und besondere Ereignisse im Match mit anpassbaren Sounds ansagen.",
  intro: "Sagt Scores, Checkouts und Namen während eines Matches an, in einer Stimme deiner Wahl. Jeder Sound wird bei den Triggern abgespielt, die du ihm gibst.",
  audioNotice: "Bitte interagiere mit der Seite (klicke, tippe oder drücke eine Taste), um den Ton für den Caller zu aktivieren.",
  sections: {
    options: "Optionen",
  },
  // The site's own words for the first two rows (inGameSettings.callerSettings.callCheckout): "Checkout ansagen".
  callEveryDart: {
    title: "Jeden Dart ansagen",
    description: "Sagt jeden Dart an, sobald er landet, nicht nur die Summe der Aufnahme.",
  },
  callCheckout: {
    title: "Checkout ansagen",
    description: "Sagt an, was ein Spieler braucht, wenn er auf einem Finish steht, und in Gotcha, wie viel bis zum Ziel fehlt.",
  },
  combinedThrows: {
    title: "Kombinierte Würfe bevorzugen",
    description: "Gibt es einen Sound für genau diese Darts, etwa <code>s20_s5_s1</code>, wird er statt der Summe der Aufnahme abgespielt.",
  },
  gameModes: {
    description: "Die Spiele, in denen angesagt wird.",
    intro: "Der Caller sagt nur in den hier eingeschalteten Spielen an.",
  },
  list: {
    // Sprachaufnahmen, not Aufnahmen: a visit is an Aufnahme on the site.
    emptyText: "Importiere ein fertiges Caller-Set, lade eigene Sprachaufnahmen hoch oder erzeuge sie aus Text.",
  },
  import: {
    title: "Caller-Set importieren",
    hint: "Fertige Stimmen in acht Sprachen",
    setLabel: "Caller-Set",
    setHelper: "Von darts-downloads.peschi.org. Manche Sets lassen sich in Safari möglicherweise nicht abspielen, und Tools for Autodarts ist nicht verantwortlich für das, was sie sagen.",
    linkLabel: "Link",
    linkPlaceholder: "https://darts-downloads.peschi.org/soundfiles/…",
    linkHint: "Wird aus dem Set oben übernommen, oder du gibst einen eigenen Link ein: eine ZIP-Datei oder einen Ordner mit Dateien namens 0.mp3 bis 180.mp3. Die Trigger ergeben sich aus den Dateinamen. Unterstützt werden Links auf darts-downloads.peschi.org, adt-socket.tobias-thiele.de und autodarts.x10.mx.",
    button: "Importieren",
    cancelConfirm: "Der Import läuft noch. Möchtest du ihn wirklich abbrechen?",
    progress: {
      downloading: "ZIP-Datei wird heruntergeladen…",
      unpacking: "Wird entpackt…",
      matching: "Sounds werden Triggern zugeordnet…",
      looking: "Sounds werden gesucht…",
      found: "{count} gefunden",
    },
    errors: {
      notHttps: "Die URL muss aus Sicherheitsgründen mit https:// beginnen",
      notAllowed: "Eigene URLs werden aus Sicherheitsgründen derzeit nicht unterstützt",
      invalid: "Ungültiges URL-Format",
    },
  },
  sets: {
    pick: "Set auswählen…",
    label: "{region} - {voice} ({gender})",
    female: "weiblich",
    male: "männlich",
  },
  notifications: {
    sorted: "Die Caller-Sounds wurden nach ihren Triggern sortiert",
    allDeleted: "Alle Caller-Sounds wurden gelöscht",
    noSoundsInZip: "Keine Sounds in der ZIP-Datei oder der CSV-Zuordnung gefunden",
    noAudioInZip: "Keine Audiodateien in der ZIP-Datei gefunden",
    importedFromZip: { one: "{count} Sound erfolgreich aus der ZIP-Datei importiert", other: "{count} Sounds erfolgreich aus der ZIP-Datei importiert" },
    importedFromUrl: { one: "{count} Sound erfolgreich von der URL importiert", other: "{count} Sounds erfolgreich von der URL importiert" },
    urlImportFailed: "Fehler beim Importieren der Sounds von der URL",
    zipFailed: "Fehler beim Verarbeiten der ZIP-Datei",
    // The English has a spaced hyphen, and so does this: the glossary keeps it.
    zipDownloadFailed: "ZIP-Datei konnte nicht heruntergeladen werden - prüfe deine URL",
    zipInvalid: "Ungültige oder beschädigte ZIP-Datei",
  },
} satisfies Translation<typeof en>;
