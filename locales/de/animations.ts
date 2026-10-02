import type en from "../en/animations";
import type { Translation } from "../../utils/i18n/types";

export default {
  // Shorter than the English: the card's text sits in a column of two thirds of a card of fixed height.
  card: "Zeigt Animationen bei Ereignissen wie 180, Bull, Bust oder einem gewonnenen Leg.",
  intro: "Zeigt zu den Momenten, die du auswählst, ein GIF über dem Board: eine 180, ein Bull, ein Bust, ein gewonnenes Leg. Ein Klick blendet es früher aus.",
  noun: "Animation",
  untitled: "Animation",
  categoryOther: "Sonstiges",
  sections: {
    options: "Optionen",
  },
  startDelay: {
    title: "Startverzögerung",
    description: "Sekunden zwischen dem Dart und der Animation.",
  },
  showFor: {
    title: "Anzeigedauer",
    description: "Wie viele Sekunden eine Animation angezeigt wird.",
  },
  fit: {
    title: "Skalierung",
    description: "Ausfüllen deckt die ganze Fläche ab und schneidet das GIF womöglich zu. Einpassen zeigt es vollständig.",
    options: {
      cover: "Ausfüllen",
      contain: "Einpassen",
    },
  },
  covers: {
    title: "Abdeckung",
    description: "Nur das Board oder die ganze Seite vor einem unscharfen Hintergrund.",
    options: {
      boardOnly: "Nur Board",
      fullPage: "Ganze Seite",
    },
  },
  gameModes: {
    description: "Die Spiele, in denen GIFs gezeigt werden.",
    intro: "Animationen werden nur in den hier eingeschalteten Spielen gezeigt.",
  },
  list: {
    emptyTitle: "Noch keine Animationen",
    emptyText: "Lade GIFs von deinem Computer hoch oder füge eines über einen Link hinzu. Links von Tenor und Giphy funktionieren.",
    searchPlaceholder: "Animationen nach Trigger oder Link suchen",
  },
  add: {
    upload: {
      label: "GIFs hochladen",
      hint: "Von deinem Computer, mehrere auf einmal",
    },
    link: {
      label: "Von einem Link hinzufügen",
      hint: "Ein GIF aus dem Web, z. B. von Tenor oder Giphy",
    },
  },
  menu: {
    sort: {
      label: "Nach Trigger sortieren",
      hint: "Ordnet das Raster nach Trigger",
    },
  },
  tile: {
    alt: "Animation bei {triggers}",
    // The dative, as it follows "bei".
    noTrigger: "keinem Trigger",
    switchLabel: "Animation bei {name}: {state}",
    lengthTitle: "Anzeigedauer: {duration}",
    lengthSpoken: "Anzeigedauer:",
  },
  dialog: {
    addTitle: "Animation von einem Link hinzufügen",
    editTitle: "Animation bearbeiten",
    previewAlt: "Vorschau",
    uploadedLabel: "Hochgeladenes GIF",
    linkLabel: "Link zu einem GIF",
    linkPlaceholder: "https://example.com/animation.gif",
    uploadedHint: "In diesem Browser gespeichert als {filename}. Trigger und Anzeigedauer lassen sich hier ändern.",
    unknownFile: "unbekannt",
    // Shorter than "Länge des GIFs verwenden": it shares a row with the label, and a phone's row is narrow.
    useLength: "GIF-Länge nutzen",
    useLengthTitle: "Trägt ein, wie lange ein Durchlauf dieses GIFs dauert",
    useLengthNeedsLink: "Füge zuerst einen Link zu einem GIF hinzu",
    showForHint: "Lass das Feld leer, um die Option {option} zu verwenden ({seconds} s).",
    // Shorter than "Animation hinzufügen": next to Abbrechen that would not fit a phone.
    addButton: "Hinzufügen",
  },
  lengthErrors: {
    link: "Die Website dieses Links erlaubt der Erweiterung nicht, die Datei zu lesen, deshalb lässt sich ihre Länge nicht auslesen.",
    upload: "Das hochgeladene GIF konnte nicht gelesen werden.",
    notAnimated: "Das ist kein animiertes GIF, deshalb gibt es keine Länge zum Auslesen.",
  },
  triggerUnknown: "Animationen kennen diesen Trigger nicht.",
  upload: {
    namesHint: "Eine Datei namens 180.gif wird bei 180 abgespielt. Mehrere verbindest du mit einem +, wie in 180+t20.gif. Ein Name, der kein Trigger ist, ergibt keinen.",
  },
  deleteAll: {
    title: { one: "Die Animation löschen?", other: "Alle {count} Animationen löschen?" },
    body: "Sie werden dauerhaft gelöscht, hochgeladene GIFs eingeschlossen. Dies kann nicht rückgängig gemacht werden.",
  },
  notifications: {
    needsLink: "Füge zuerst einen Link zu einem GIF hinzu.",
    invalidTriggers: "Einige Trigger waren ungültig und wurden entfernt: {triggers}",
    noValidTriggers: "Keine gültigen Trigger gefunden. Bitte sieh in der Dokumentation nach, welche Trigger-Formate unterstützt werden.",
    noStorage: "Dein Browser unterstützt keine Dateispeicherung. Probiere einen anderen Browser aus.",
    failedToProcess: "{name} konnte nicht verarbeitet werden",
    added: { one: "{count} GIF hinzugefügt", other: "{count} GIFs hinzugefügt" },
    processingError: "Fehler beim Verarbeiten der Dateien",
    allDeleted: "Alle Animationen wurden gelöscht",
    sorted: "Die Animationen wurden nach ihren Triggern sortiert",
  },
} satisfies Translation<typeof en>;
