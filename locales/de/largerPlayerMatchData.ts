import type en from "../en/largerPlayerMatchData";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Vergrößert die Schrift der Spielerdaten auf der Match-Seite, damit sie besser zu sehen sind.",
  intro: "Zeigt Leg- und Match-Durchschnitt unter jedem Score größer an. Eine Zeile, die nicht mehr auf die Karte passt, bricht in eine zweite Zeile um.",
  sections: {
    options: "Optionen",
  },
  size: {
    title: "Größe",
    description: "In rem: 1 ist die Basisgröße des Browsers, standardmäßig 16 Pixel. autodarts zeigt die Durchschnitte mit etwa 1.4 an.",
  },
} satisfies Translation<typeof en>;
