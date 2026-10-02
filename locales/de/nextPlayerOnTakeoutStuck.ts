import type en from "../en/nextPlayerOnTakeoutStuck";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: {
    one: "Setzt das Board zurück und wechselt zum nächsten Spieler, wenn das Abziehen {count} Sekunde hängt.",
    other: "Setzt das Board zurück und wechselt zum nächsten Spieler, wenn das Abziehen {count} Sekunden hängt.",
  },
  intro: "Drückt für dich Weiter, wenn das Abziehen der Darts nie endet. Sobald das Abziehen beginnt, läuft auf dem eigenen Weiter-Button von autodarts ein Countdown, und ein Klick irgendwo bricht ihn ab.",
  sections: {
    options: "Optionen",
  },
  countdown: {
    title: "Countdown",
    description: "Vom Beginn des Abziehens bis zum Drücken, es sei denn, das Board meldet sich vorher wieder.",
  },
} satisfies Translation<typeof en>;
