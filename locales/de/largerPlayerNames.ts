import type en from "../en/largerPlayerNames";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Vergrößert die Schrift der Spielernamen auf der Match-Seite, damit sie besser zu sehen sind.",
  intro: "Zeigt die Spielernamen auf dem Match-Bildschirm größer an, in jedem Layout, auch in der Seitenleiste eines schmaleren Fensters.",
  sections: {
    options: "Optionen",
  },
  size: {
    title: "Größe",
    description: "In rem: 1 ist die Basisgröße des Browsers, standardmäßig 16 Pixel. autodarts zeigt Namen mit etwa 1.1 an.",
  },
} satisfies Translation<typeof en>;
