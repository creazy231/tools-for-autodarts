import type en from "../en/settings";
import type { Translation } from "../../utils/i18n/types";

export default {
  title: "Einstellungen",
  dialogTitle: "Einstellungen - {feature}",
  tabs: {
    lobbies: "Lobbys",
    matches: "Matches",
    boards: "Boards",
    soundsAnimations: "Sounds & Animationen",
  },
  header: {
    export: "Exportieren",
    import: "Importieren",
    kofi: "Auf Ko-fi unterstützen",
    advanced: "Erweiterte Einstellungen",
  },
  exportMenu: {
    download: "Datei herunterladen",
    downloadHint: "Als Backup behalten oder woanders importieren",
    copy: "In die Zwischenablage kopieren",
    copyHint: "Zum Teilen oder um es woanders über Importieren einzufügen",
  },
  importMenu: {
    upload: "Datei hochladen",
    uploadHint: "Ersetzt deine Einstellungen durch eine exportierte Datei",
    paste: "Aus der Zwischenablage einfügen",
    pasteHint: "Ersetzt deine Einstellungen durch die kopierten",
  },
  support: {
    title: "Unterstütze das Projekt",
    body: "Autodarts Tools ist kostenlos und Open Source. Wenn dir die Nutzung Spaß macht, unterstütze gern die Entwicklung, damit es weitergeht!",
  },
  releaseNotes: {
    title: "Versionshinweise",
    body: "Was sich in dieser Version geändert hat — wird einmal nach einem Update gezeigt, und hier jederzeit, wenn du es noch einmal sehen möchtest.",
    button: "Was ist neu",
  },
  danger: {
    title: "Gefahrenzone",
    body: "Diese Aktionen sind destruktiv und können nicht rückgängig gemacht werden. Sei bitte vorsichtig und exportiere am besten vorher deine Einstellungen.",
    resetTitle: "Alle Einstellungen zurücksetzen",
    resetBody: "Dadurch werden alle Einstellungen auf ihre Standardwerte zurückgesetzt. Alle deine Anpassungen gehen verloren.",
    resetConfirm: "Dadurch werden alle Einstellungen auf ihre Standardwerte zurückgesetzt. Alle deine Anpassungen gehen verloren. Bist du sicher, dass du fortfahren möchtest?",
  },
  performance: {
    title: "Performance-Warnung",
    body: "Das Aktivieren der Funktionen <b>{animations}</b>, <b>{caller}</b> oder <b>{soundFx}</b> kann zu Performance-Problemen führen und ordentliche Hardware erfordern. Falls es ruckelt oder Fehler auftreten, schalte diese Funktionen testweise aus.",
  },
  notifications: {
    exportSoundsFailed: "Fehler beim Exportieren der Sounddateien",
    invalidFile: "Ungültige Einstellungsdatei",
    importSoundsFailed: "Einstellungen importiert, aber Fehler beim Importieren der Sounds",
    imported: "Einstellungen erfolgreich importiert. Die Seite wird neu geladen, um die Änderungen anzuwenden...",
    importFailed: "Einstellungen konnten nicht importiert werden",
    resetDone: "Alle Einstellungen wurden auf die Standardwerte zurückgesetzt. Die Seite wird neu geladen, um die Änderungen anzuwenden...",
    copySoundsFailed: "Einstellungen kopiert, aber Fehler beim Einbinden der Sounds",
    copied: "Einstellungen in die Zwischenablage kopiert",
    copyFailed: "Einstellungen konnten nicht in die Zwischenablage kopiert werden",
    invalidData: "Ungültige Einstellungsdaten",
    pasteImportFailed: "Einstellungen konnten nicht aus der Zwischenablage importiert werden",
    pasteReadFailed: "Zwischenablage konnte nicht gelesen werden",
  },
} satisfies Translation<typeof en>;
