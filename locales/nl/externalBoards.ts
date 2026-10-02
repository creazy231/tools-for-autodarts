import type en from "../en/externalBoards";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Bewaar externe borden en volg ze makkelijk.",
  unnamedBoard: "Naamloos bord",
  forget: "Dit bord vergeten",
  follow: "Volgen",
  placeholders: {
    name: "Naam van bord",
    id: "Bord-ID of link",
  },
  errors: {
    missingId: "Plak een bordlink of bord-ID",
    alreadyListed: "Dat bord staat al in de lijst",
  },
} satisfies Translation<typeof en>;
