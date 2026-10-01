import type en from "../en/migration";
import type { Translation } from "../../utils/i18n/types";

export default {
  title: "Update verfügbar",
  intro: "Eine neue Version von <b>Tools for Autodarts</b> ist verfügbar. Du kannst deine Einstellungen jetzt migrieren oder mit den Standardeinstellungen fortfahren.",
  note: "<b>Hinweis:</b> Die Sound-, Caller- und Animationsfunktionen wurden überarbeitet, und ihre Einstellungen können nicht automatisch migriert werden. Du kannst deine alten Einstellungen zum Nachschlagen herunterladen.",
  download: "Einstellungen herunterladen",
  resetWarning: "Wenn du ohne Migration fortfährst, werden deine Einstellungen auf die Standardwerte zurückgesetzt.",
  continueWithout: "Ohne Migration",
  migrateNow: "Jetzt migrieren",
  confirm: {
    title: "Ohne Migration fortfahren?",
    message: "Dadurch werden alle deine Einstellungen auf die Standardwerte zurückgesetzt. Alle eigenen Konfigurationen gehen verloren.",
    confirmText: "Fortfahren",
    cancelText: "Zurück",
  },
  migrated: "Einstellungen erfolgreich migriert. Die Seite wird neu geladen...",
} satisfies Translation<typeof en>;
