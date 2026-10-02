import type en from "../en/automaticNextLeg";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: {
    one: "Startet das nächste Leg automatisch {count} Sekunde nach dem Abziehen der Darts.",
    other: "Startet das nächste Leg automatisch {count} Sekunden nach dem Abziehen der Darts.",
  },
  intro: "Startet das nächste Leg, sobald die Darts aus dem Board gezogen sind, nach einem Countdown auf dem eigenen Button Nächstes Leg von autodarts.",
  sections: {
    options: "Optionen",
  },
  countdown: {
    title: "Countdown",
    description: "Vom Ende des Abziehens bis zum nächsten Leg.",
  },
} satisfies Translation<typeof en>;
