import type en from "../en/automaticNextLeg";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: {
    one: "Start de volgende leg automatisch {count} seconde nadat de darts zijn verwijderd.",
    other: "Start de volgende leg automatisch {count} seconden nadat de darts zijn verwijderd.",
  },
  intro: "Start de volgende leg zodra de darts uit het bord zijn, na een countdown op de eigen knop Volgende leg van autodarts.",
  sections: {
    options: "Opties",
  },
  countdown: {
    title: "Countdown",
    description: "Vanaf het moment dat de darts zijn verwijderd tot de volgende leg.",
  },
} satisfies Translation<typeof en>;
