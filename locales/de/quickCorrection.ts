import type en from "../en/quickCorrection";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Fügt den Würfen eine Schnellkorrektur hinzu, mit der du falsch erkannte Darts korrigieren kannst.",
  intro: "Korrigiert einen Dart, den das Board falsch erkannt hat: Öffne die Korrektur bei einem Wurf und wähle aus einem Raster des ganzen Boards das richtige Segment, mit der Maus oder dem Ziffernblock.",
  safari: {
    card: "Vorerst nicht mit Safari-Browsern kompatibel.",
    panel: "In Safari noch nicht verfügbar: Safaris Sicherheitsregeln blockieren das Korrekturfenster.",
  },
  sections: {
    options: "Optionen",
  },
  windowSize: {
    title: "Fenstergröße",
    description: "Wie groß sich das Korrekturfenster öffnet.",
  },
} satisfies Translation<typeof en>;
