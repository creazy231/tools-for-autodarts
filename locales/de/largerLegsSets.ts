import type en from "../en/largerLegsSets";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Vergrößert die Schrift der Legs und Sets auf der Match-Seite, damit sie besser zu sehen sind.",
  imageAlt: "Größere Legs & Sets",
  intro: "Zeigt die Legs und Sets auf dem Match-Bildschirm größer an, damit sie von der Oche aus gut lesbar sind. Das Kästchen um jede Zahl wächst mit.",
  sections: {
    options: "Optionen",
  },
  size: {
    title: "Größe",
    description: "In rem: 1 ist die Basisgröße des Browsers, standardmäßig 16 Pixel. autodarts zeigt sie mit 1.5 an.",
  },
} satisfies Translation<typeof en>;
