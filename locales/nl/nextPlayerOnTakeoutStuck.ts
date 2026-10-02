import type en from "../en/nextPlayerOnTakeoutStuck";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: {
    one: "Zet het bord terug en gaat door naar de volgende speler als de darts {count} seconde niet zijn verwijderd.",
    other: "Zet het bord terug en gaat door naar de volgende speler als de darts {count} seconden niet zijn verwijderd.",
  },
  intro: "Drukt voor je op Volgende wanneer het verwijderen van de darts nooit eindigt. Zodra het verwijderen begint, start op de eigen knop Volgende van autodarts een countdown, die je met een klik ergens kunt annuleren.",
  sections: {
    options: "Opties",
  },
  countdown: {
    title: "Countdown",
    description: "Vanaf het begin van het verwijderen tot het indrukken, tenzij het bord eerder weer reageert.",
  },
} satisfies Translation<typeof en>;
