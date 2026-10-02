import type en from "../en/boardSkins";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Spiele auf dem Board von autodarts in einem anderen Design — klassisch, qwellcode, Opal, Marmor oder Sorbet.",
  intro: "Zeichnet das Board von autodarts im gewählten Design, für alle, die darauf werfen, auch für Bots. Das Bild einer Kamera hat kein Board zum Neuzeichnen, deshalb bleibt während eines Spiels außerdem das gezeichnete Board im Bild.",
  sections: {
    skin: "Skin",
  },
  skinAlt: "Board-Design {skin}",
  skins: {
    default: {
      label: "Standard",
      description: "Das Board, das autodarts heute zeichnet.",
    },
    v1: {
      label: "Klassisch",
      description: "Das Board, das autodarts vor dem Neuaufbau gezeichnet hat.",
    },
    qwellcode: {
      label: "qwellcode",
      description: "Das qwellcode-Board in Schwarz-Weiß, mit einem Ring in Dunkelgrün und Limettengrün.",
    },
    opal: {
      label: "Opal",
      description: "Perlmuttsegmente auf pflaumenfarbenem Grund, mit Kupferring.",
    },
    marble: {
      label: "Marmor",
      description: "Schwarz-weißer Marmor mit Goldadern, in einem vergoldeten Rand.",
    },
    sorbet: {
      label: "Sorbet",
      description: "Pastelltöne in Zitrone, Koralle und Minze auf einem Lavendelring.",
    },
  },
  selected: {
    redrawn: "<b>{label}:</b> {description} Die Darts, das Gelb eines Treffers und das manuelle Zielen funktionieren wie auf dem eigenen Board von autodarts, und auch die Nahaufnahmen von Darts Zoom und das Board im Streaming-Modus tragen diesen Skin.",
    kept: "<b>{label}:</b> {description} Am Board ändert sich nichts, es wird nur auf dem gezeichneten Board gehalten.",
  },
  note: "Wenn du selbst den Kamera-Button oder die eigenen Tasten 1, 2 und 3 von autodarts drückst, bestimmst du die Ansicht bis zum nächsten Leg selbst. Solange diese Funktion an ist, hält sich Board-Ansicht heraus, und Darts Zoom und Streaming-Modus schalten das Board nicht mehr um.",
} satisfies Translation<typeof en>;
