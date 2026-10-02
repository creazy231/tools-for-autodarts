import type en from "../en/enhancedScoringDisplay";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Verbessert die Wurfanzeigen während Matches mit größeren Zahlen und Score-Notation.",
  intro: "Lege fest, wie der Score während Matches angezeigt wird.",
  effect: "Diese Funktion verbessert die Score-Anzeige mit größeren Punktwerten und Dart-Notation (S/D/T, BULL) und fügt sanfte Animationen hinzu, wenn sich Scores während Matches aktualisieren.",
  credit: "<i>Ursprünglich von @LeSiiN</i>",
} satisfies Translation<typeof en>;
