import type en from "../en/whatsNew";
import type { Translation } from "../../utils/i18n/types";

export default {
  title: "Was ist neu in {release}",
  intro: "Autodarts hat seine Website neu gebaut, deshalb ist diese Version ein dazu passender Neuaufbau der Erweiterung: Jede Funktion wurde auf das neue Design übertragen, und ein paar davon funktionieren jetzt ziemlich anders.",
  beforeYouPlay: "Bevor du spielst",
  newInThisRelease: "Neu in dieser Version",
  headsUp: {
    featuresGone: {
      title: "Zwei Funktionen gibt es nicht mehr",
      body: "Spieler mischen — die Lobby hat jetzt einen eigenen Shuffle-Button — und Menü im Match ausblenden, weil der neu gebaute Match-Bildschirm kein Menü hat, das sich ausblenden ließe.",
    },
    settingsFresh: {
      title: "Ein paar Einstellungen beginnen von vorn",
      body: "Die Verzögerung von Instant Replay heißt jetzt Startverzögerung und bedeutet etwas anderes, deshalb steht sie zunächst auf 3 Sekunden; die Mittelposition von Darts Zoom ist weg, und seine Haltedauer wird jetzt in Millisekunden angegeben. Wirf vor deinem nächsten Match einen Blick darauf.",
    },
  },
  highlights: {
    boardView: {
      title: "Board-Ansicht",
      body: "Starte jedes Spiel — auch das Bull-Off — gleich mit der Ansicht, die du sehen willst: einer Kamera oder dem gezeichneten Board.",
    },
    zoom: {
      title: "Darts Zoom, überarbeitet",
      body: "Der neue Modus Auf dem Board zoomt das Board von Autodarts selbst auf jeden Dart und fügt dem Bildschirm nichts hinzu. Unten und Oben zeigen stattdessen Nahaufnahmen, und Unten ist der neue Standard.",
    },
    quietOwnDarts: {
      title: "Eigene Darts stummschalten",
      body: "Schaltet den Einschlagton für Darts stumm, die du ohnehin schon einschlagen hörst, und lässt ihn für alle anderen an. Der Schalter dafür steht in den eigenen Soundeinstellungen von Autodarts, unter Dart geworfen.",
    },
    streamingMode: {
      title: "Streaming-Modus",
      body: "Funktioniert auf der neu gebauten Website und braucht keine Board-Kamera mehr. Es gibt ein zweites Scoreboard zur Auswahl — Autodarts, nach dem eigenen Design der Website gezeichnet — neben dem klassischen Broadcast-Scoreboard.",
    },
    caller: {
      title: "Caller",
      body: "Die Option Kombinierte Würfe bevorzugen verhindert, dass eine Aufnahme doppelt angesagt wird, wenn sie einen eigenen Kombinationssound hat, und es gibt einen bulloff-Trigger, passend zu dem von WLED.",
    },
    gotcha: {
      title: "Gotcha",
      body: "Checkout-Wege, die hier berechnet — Autodarts liefert keine für Gotcha — und vom Caller angesagt werden, dazu ein Helfer, der jeden Spieler markiert, den du zurücksetzen könntest.",
    },
  },
  changelog: "Vollständiges Changelog",
  reportIssue: "Problem melden",
  gotIt: "Verstanden",
} satisfies Translation<typeof en>;
