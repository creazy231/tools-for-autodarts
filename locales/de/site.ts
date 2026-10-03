import type en from "../en/site";
import type { Translation } from "../../utils/i18n/types";

export default {
  languageNote: "Ändert auch die Sprache von Tools for Autodarts und seinen Funktionen",
  quietOwnDarts: {
    label: "Nur wenn andere werfen",
    ariaLabel: "Den Sound Dart geworfen nur abspielen, wenn andere Spieler werfen",
  },
} satisfies Translation<typeof en>;
