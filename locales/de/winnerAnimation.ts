import type en from "../en/winnerAnimation";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Zeigt eine Animation um die Spielerkarte, wenn ein Spieler ein Leg gewinnt, und sorgt für mehr Spannung im Spiel.",
  intro: "Lege die Einstellungen der Gewinner-Animation fest.",
  effect: "Diese Funktion zeigt eine Animation um die Spielerkarte, wenn ein Spieler ein Leg gewinnt.",
  customise: "Du kannst die Animationen im Bereich {animations} der Einstellungsseite anpassen.",
  darts: { one: "{count} Dart", other: "{count} Darts" },
  perfectLeg: "{count}-Darter — Perfektes Leg!",
} satisfies Translation<typeof en>;
