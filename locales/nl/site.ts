import type en from "../en/site";
import type { Translation } from "../../utils/i18n/types";

export default {
  languageNote: "Wijzigt ook de taal van Tools for Autodarts en zijn functies",
  quietOwnDarts: {
    label: "Alleen als anderen gooien",
    ariaLabel: "Het geluid Dart geland alleen afspelen als andere spelers gooien",
  },
} satisfies Translation<typeof en>;
