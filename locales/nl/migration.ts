import type en from "../en/migration";
import type { Translation } from "../../utils/i18n/types";

export default {
  title: "Update beschikbaar",
  intro: "Er is een nieuwe versie van <b>Tools for Autodarts</b> beschikbaar. Je kunt je instellingen nu migreren of doorgaan met de standaardinstellingen.",
  note: "<b>Let op:</b> De functies voor geluid, caller en animaties zijn vernieuwd, en hun instellingen kunnen niet automatisch worden gemigreerd. Je kunt je oude instellingen als naslag downloaden.",
  download: "Instellingen downloaden",
  resetWarning: "Als je doorgaat zonder migratie, worden je instellingen teruggezet naar de standaardwaarden.",
  continueWithout: "Doorgaan zonder",
  migrateNow: "Nu migreren",
  confirm: {
    title: "Doorgaan zonder migratie?",
    message: "Hiermee worden al je instellingen teruggezet naar de standaardwaarden. Alle aangepaste configuraties gaan verloren.",
    confirmText: "Doorgaan",
    cancelText: "Terug",
  },
  migrated: "Instellingen succesvol gemigreerd. De pagina wordt opnieuw geladen...",
} satisfies Translation<typeof en>;
