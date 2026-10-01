import type en from "../en/common";
import type { Translation } from "../../utils/i18n/types";

export default {
  add: "Hinzufügen",
  cancel: "Abbrechen",
  clear: "Löschen",
  clearSearch: "Suche löschen",
  close: "Schließen",
  confirm: "Bestätigen",
  delete: "Löschen",
  edit: "Bearbeiten",
  off: "Aus",
  on: "An",
  remove: "{name} entfernen",
  reset: "Zurücksetzen",
  save: "Speichern",
  search: "Suchen",
  typeAndPressEnter: "Eingeben und Enter drücken",
  inUnit: "{label} in {unit}",
  units: {
    s: "Sekunden",
    min: "Minuten",
    ms: "Millisekunden",
  },
} satisfies Translation<typeof en>;
