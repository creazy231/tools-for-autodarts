import type en from "../en/streamingMode";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Optimiert die Oberfläche fürs Streaming mit eigenen Hintergründen und Layouts.",
  intro: "Ersetzt den Match-Bildschirm durch ein Broadcast-Overlay: ein Chroma-Key- oder Bildhintergrund, das Board und ein Scoreboard, das du platzierst, wo du willst. Ein- und ausschalten kannst du es über das Stream-Symbol in der Kopfzeile des Matches; Änderungen hier wirken sofort.",
  sections: {
    scoreboard: "Scoreboard",
    board: "Board",
    background: "Hintergrund",
    layout: "Layout",
  },
  design: {
    title: "Design",
    description: "Autodarts folgt dem eigenen Design der Website: flache Oberflächen und ein einziges Blau für den Spieler, der gerade wirft.",
    options: {
      classic: "Klassisch",
    },
  },
  throws: {
    title: "Würfe",
    description: "Die Darts der laufenden Aufnahme und ihre Summe, oder Bust.",
  },
  checkout: {
    title: "Checkout-Vorschläge",
    description: "Der verbleibende Weg für den Spieler am Oche, mit jedem Dart weitergeführt.",
  },
  averages: {
    title: "Durchschnitte",
    description: "Der Leg-, Set- und Match-Durchschnitt neben jedem Namen.",
  },
  footer: {
    title: "Text der Fußzeile",
    description: "Deine eigene Zeile am unteren Rand des Overlays.",
  },
  footerDefault: "Spiel bereitgestellt von Autodarts.com",
  showBoard: {
    title: "Board anzeigen",
    description: "Das Dartboard neben dem Scoreboard.",
  },
  boardView: {
    title: "Ansicht",
    ariaLabel: "Board-Ansicht",
    description: "Das gezeichnete Board ist eine Live-Kopie, die in jeder Größe scharf bleibt und einspringt, solange keine Kamera läuft. Solange Board Skins oder Board-Ansicht an ist, entscheidet diese Funktion.",
    options: {
      camera: "Kamera",
      drawn: "Gezeichnet",
    },
  },
  background: {
    title: "Hintergrund",
    description: "Eine einfarbige Fläche zum Ausblenden in deiner Streaming-Software oder ein eigenes Bild.",
    options: {
      chromaKey: "Chroma-Key",
      image: "Bild",
    },
  },
  colour: {
    title: "Farbe",
    description: "Wähle eine Farbe, die sonst nirgends im Overlay vorkommt.",
    ariaLabel: "Chroma-Key-Farbe",
  },
  image: {
    title: "Bild",
    description: "Deckt das ganze Overlay ab. Solange es noch keins gibt, bleibt die Chroma-Key-Farbe zu sehen.",
    alt: "Hintergrundbild",
    replace: "Ersetzen",
    upload: "Bild hochladen",
  },
  backgroundImage: "Hintergrundbild",
  positions: {
    title: "Positionen",
    description: "Setzt Board und Scoreboard auf ihre Ausgangsposition und ihre erste Größe zurück. Ein Overlay, das gerade angezeigt wird, folgt sofort.",
    reset: "Positionen zurücksetzen",
  },
  overlay: {
    boardScale: "Board-Größe: ({percent} %)",
    scoreScale: "Scoreboard-Größe: ({percent} %)",
    volume: "Lautstärke",
    dartboard: "Dartboard",
    settings: "Einstellungen des Streaming-Modus",
    leave: "Streaming-Modus verlassen",
  },
  title: {
    firstToSets: { one: "Erster bis {count} Set", other: "Erster bis {count} Sets" },
    firstToLegs: { one: "Erster bis {count} Leg", other: "Erster bis {count} Legs" },
    variant: {
      x01: "X01",
      cricket: "Cricket",
      countUp: "Count Up",
      atc: "Around The Clock",
      randomCheckout: "Random Checkout",
      rtw: "Round the World",
      segmentTraining: "Segmenttraining",
      bobs27: "Bob's 27",
      game121: "121",
      shanghai: "Shanghai",
      gotcha: "Gotcha",
      bermuda: "Bermuda",
      killer: "Killer",
      bullOff: "Bull-Off",
    },
  },
  board: {
    bust: "Bust",
    sets: "Sets",
    legs: "Legs",
    avg: "Ø",
  },
} satisfies Translation<typeof en>;
