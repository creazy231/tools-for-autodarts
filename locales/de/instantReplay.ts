import type en from "../en/instantReplay";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Spielt bei jedem gewonnenen Leg den entscheidenden Dart von deiner Webcam ab.",
  intro: "Richte eine Webcam auf dein Board, und sobald ein Leg gewonnen ist, wird der entscheidende Dart noch einmal über dem Bildschirm abgespielt, mit ein paar Sekunden davor und ein paar danach. Ein Klick auf das Replay blendet es vorzeitig aus.",
  note: "Es nimmt nur auf, solange du in einem Match bist, und nichts verlässt deinen Computer. Das ist deine eigene Webcam, nicht die Kamera des Boards, auf die der Browser nicht zugreifen kann.",
  badge: "Replay",
  sections: {
    camera: "Kamera",
    replay: "Replay",
    framing: "Bildausschnitt",
  },
  alert: {
    unavailable: "Kamera nicht verfügbar",
    noAccess: "Kein Kamerazugriff",
    tryAgain: "Nochmal",
  },
  errors: {
    unsupported: "Dein Browser unterstützt keinen Kamerazugriff.",
    denied: "Der Kamerazugriff wurde verweigert. Bitte erlaube den Kamerazugriff in den Einstellungen deines Browsers.",
    failed: "Beim Zugriff auf die Kamera ist ein Fehler aufgetreten.",
    allInUse: "Alle Kameras werden gerade von anderen Apps verwendet. Bitte schließe andere Video-Apps und versuche es erneut.",
    loadFailed: "Die Kameras konnten nicht geladen werden.",
    previewFailed: "Auf die gewählte Kamera konnte nicht zugegriffen werden.",
  },
  access: {
    title: "Kamerazugriff erforderlich",
    description: "Das Replay wird mit deiner Webcam aufgenommen, deshalb fragt dich der Browser zuerst. Erlaube den Zugriff in der Abfrage oder fordere ihn erneut an.",
    allow: "Kamera erlauben",
  },
  preview: {
    title: "Vorschau",
    fps: "{fps} FPS",
    noCamera: "Keine Kamera zum Anzeigen",
  },
  camera: {
    title: "Kamera",
    hint: {
      some: "Aufgelistet werden nur Kameras, die keine andere App verwendet.",
      none: "Keine freie Kamera gefunden. Vielleicht belegt eine andere App sie: Schließe diese App und suche dann erneut.",
    },
    unnamed: "Kamera {id}...",
    refresh: {
      busyLabel: "Suche nach Kameras",
      idleLabel: "Erneut nach Kameras suchen",
      busyTitle: "Suche…",
      idleTitle: "Erneut suchen",
    },
  },
  before: {
    title: "Vor dem Spielwurf",
    description: "Wie viel vom Vorlauf bis zum entscheidenden Dart das Replay zeigt.",
  },
  after: {
    title: "Nach dem Spielwurf",
    description: "Und wie viel von dem, was danach kommt.",
  },
  startDelay: {
    title: "Startverzögerung",
    description: "Vom gewonnenen Leg bis zum Replay, damit Platz für die eigene Siegesfeier von autodarts bleibt.",
    heldBack: "Vom gewonnenen Leg bis zum Replay. Die {after} s nach dem Spielwurf müssen zuerst gefilmt werden, deshalb startet es erst nach {after} s.",
  },
  covers: {
    title: "Abdeckung",
    description: "Nur das Board oder die ganze Seite.",
    options: {
      boardOnly: "Nur Board",
      fullPage: "Ganze Seite",
    },
  },
  zoom: {
    title: "Zoom",
    description: "Wie weit das Bild auf das Board hineinzoomt.",
    value: "{zoom}×",
  },
  panX: {
    title: "Links und rechts",
    description: "Wo das vergrößerte Bild liegt, von links nach rechts.",
  },
  panY: {
    title: "Oben und unten",
    description: "Und von oben nach unten.",
  },
  pan: {
    centre: "Mitte",
    left: "{percent}% links",
    right: "{percent}% rechts",
    up: "{percent}% oben",
    down: "{percent}% unten",
  },
} satisfies Translation<typeof en>;
