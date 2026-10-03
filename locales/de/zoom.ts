import type en from "../en/zoom";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Eine Nahaufnahme, wo jeder Dart gelandet ist — am unteren Rand, unter der Punkteleiste oder auf dem Board.",
  intro: "Eine Nahaufnahme, wo jeder Dart der Aufnahme gelandet ist, eine Kachel pro Dart: am unteren Bildschirmrand, unter der Punkteleiste oder direkt auf dem Board.",
  sections: {
    closeUps: "Nahaufnahmen",
    whichDarts: "Welche Darts",
    board: "Board",
  },
  position: {
    title: "Position",
    description: "Unten bekommt jeder Dart ein Drittel des Fensters, und Rückgängig und Weiter wandern nach oben rechts, von wo du sie überallhin ziehen kannst. Oben legt den Streifen unter die Punkteleiste. Auf dem Board zoomt stattdessen das Board von autodarts selbst auf jeden Dart und fügt dem Bildschirm nichts hinzu.",
    options: {
      bottom: "Unten",
      top: "Oben",
      board: "Auf dem Board",
    },
  },
  barPosition: {
    title: "Position der Leiste",
    description: "Setzt Rückgängig und Weiter von autodarts wieder in die obere rechte Ecke.",
    reset: "Position zurücksetzen",
  },
  holdFor: {
    title: "Haltedauer",
    description: "Wie lange das Board auf einem Dart bleibt. Es zoomt wieder heraus, sobald die Aufnahme endet oder weitergeht.",
  },
  zoomLevel: {
    title: "Zoomstufe",
    description: "Wie nah jede Kachel an ihren Dart heranzoomt.",
  },
  centreDot: {
    title: "Mittelpunkt",
    description: "Ein Punkt genau dort, wo jeder Dart gelandet ist.",
  },
  showDartsOf: {
    title: "Darts zeigen von",
    description: "Die Darts aller oder nur die deiner Gegner.",
    options: {
      everyone: "Allen",
      opponents: "Gegnern",
    },
  },
  onlyOnCheckout: {
    title: "Nur bei einem Checkout",
    description: "Nahaufnahmen nur bei Aufnahmen, in denen ein Checkout möglich ist.",
  },
  view: {
    title: "Ansicht",
    ariaLabel: "Board-Ansicht",
    description: "Was das Board von autodarts während eines Spiels zeigt und woraus die Nahaufnahmen geschnitten werden: das Bild einer Kamera oder eine scharfe Kopie des gezeichneten Boards. Solange Board Skins oder Board-Ansicht an ist, entscheidet diese Funktion.",
    options: {
      camera1: "Kamera 1",
      camera2: "Kamera 2",
      camera3: "Kamera 3",
      image: "Board",
    },
  },
} satisfies Translation<typeof en>;
