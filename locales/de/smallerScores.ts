import type en from "../en/smallerScores";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Verkleinert die Schrift des Scores inaktiver Spieler, damit der Fokus auf dem aktuellen Spieler liegt.",
  intro: "Lege fest, wie die Scores inaktiver Spieler angezeigt werden.",
  effect: "Diese Funktion verkleinert die Schriftgröße des Scores inaktiver Spieler.",
} satisfies Translation<typeof en>;
