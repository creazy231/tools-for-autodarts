import type en from "../en/autoStart";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Voegt naast Spel starten een <b>Autostart</b>-schakelaar toe. Staat die aan, dan start het spel <b>3 seconden</b> nadat een andere speler deelneemt. In elke lobby staat hij eerst uit.",
  toggleOn: "Autostart aan",
  toggleOff: "Autostart uit",
} satisfies Translation<typeof en>;
