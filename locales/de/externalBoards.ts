import type en from "../en/externalBoards";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Speichere externe Boards, um ihnen einfach zu folgen.",
  unnamedBoard: "Unbenanntes Board",
  forget: "Dieses Board vergessen",
  follow: "Folgen",
  placeholders: {
    name: "Board-Name",
    id: "Board-ID oder Link",
  },
  errors: {
    missingId: "Board-Link oder -ID einfügen",
    alreadyListed: "Das Board ist bereits in der Liste",
  },
} satisfies Translation<typeof en>;
