import type en from "../en/roundCounter";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Zeigt die aktuelle Runde in der Kopfzeile des Matches.",
  imageAlt: "Vorschau der Funktion Rundenzähler",
  intro: "Zeigt die aktuelle Runde und die maximale Rundenzahl des Matches mittig in der Kopfzeile des Matches – so wie es der Match-Bildschirm vor dem Umbau der Seite tat.",
  roundOf: "Runde {round}/{total}",
  round: "Runde {round}",
} satisfies Translation<typeof en>;
