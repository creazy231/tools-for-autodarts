import type en from "../en/takeoutNotification";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Zeigt einen Hinweis an, solange die Darts abgezogen werden.",
  noSettings: "Diese Funktion hat keine zusätzlichen Einstellungen.",
  intro: "Wenn aktiviert, wird ein Hinweis angezeigt, solange die Darts abgezogen werden.",
  panel: "Darts werden abgezogen",
} satisfies Translation<typeof en>;
