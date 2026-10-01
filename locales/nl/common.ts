import type en from "../en/common";
import type { Translation } from "../../utils/i18n/types";

export default {
  add: "Toevoegen",
  cancel: "Annuleren",
  clear: "Wissen",
  clearSearch: "Zoekopdracht wissen",
  close: "Sluiten",
  confirm: "Bevestigen",
  delete: "Verwijderen",
  edit: "Bewerken",
  off: "Uit",
  on: "Aan",
  remove: "{name} verwijderen",
  reset: "Opnieuw instellen",
  save: "Opslaan",
  search: "Zoeken",
  typeAndPressEnter: "Typ en druk op Enter",
  inUnit: "{label} in {unit}",
  units: {
    s: "seconden",
    min: "minuten",
    ms: "milliseconden",
  },
} satisfies Translation<typeof en>;
