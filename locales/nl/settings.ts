import type en from "../en/settings";
import type { Translation } from "../../utils/i18n/types";

export default {
  title: "Instellingen",
  dialogTitle: "Instellingen - {feature}",
  tabs: {
    lobbies: "Lobby's",
    matches: "Wedstrijden",
    boards: "Borden",
    soundsAnimations: "Geluiden & animaties",
  },
  header: {
    export: "Exporteren",
    import: "Importeren",
    kofi: "Steunen via Ko-fi",
    advanced: "Geavanceerde instellingen",
  },
  exportMenu: {
    download: "Bestand downloaden",
    downloadHint: "Om te bewaren als back-up of elders te importeren",
    copy: "Naar klembord kopiëren",
    copyHint: "Om te delen of elders in te plakken via Importeren",
  },
  importMenu: {
    upload: "Bestand uploaden",
    uploadHint: "Vervangt je instellingen door een geëxporteerd bestand",
    paste: "Vanaf klembord plakken",
    pasteHint: "Vervangt je instellingen door de gekopieerde",
  },
  support: {
    title: "Steun het project",
    body: "Autodarts Tools is gratis en open source. Vind je het fijn om te gebruiken? Overweeg dan de ontwikkeling te steunen, zodat het kan blijven doorgaan!",
  },
  releaseNotes: {
    title: "Releasenotes",
    body: "Wat er in deze versie is veranderd — eenmalig getoond na een update, en hier wanneer je het nog eens wilt zien.",
    button: "Wat is er nieuw",
  },
  danger: {
    title: "Gevarenzone",
    body: "Deze acties zijn destructief en kunnen niet ongedaan worden gemaakt. Ga voorzichtig te werk en exporteer eerst je instellingen.",
    resetTitle: "Alle instellingen terugzetten",
    resetBody: "Hiermee worden alle instellingen teruggezet naar de standaardwaarden. Al je aanpassingen gaan verloren.",
    resetConfirm: "Hiermee worden alle instellingen teruggezet naar de standaardwaarden. Al je aanpassingen gaan verloren. Weet je zeker dat je wilt doorgaan?",
  },
  performance: {
    title: "Prestatiewaarschuwing",
    body: "Het inschakelen van de functies <b>{animations}</b>, <b>{caller}</b> of <b>{soundFx}</b> kan prestatieproblemen veroorzaken en vraagt om behoorlijke hardware. Merk je haperingen of fouten, probeer deze functies dan uit te schakelen.",
  },
  notifications: {
    exportSoundsFailed: "Fout bij het exporteren van de geluidsbestanden",
    invalidFile: "Ongeldig instellingenbestand",
    importSoundsFailed: "Instellingen geïmporteerd, maar fout bij het importeren van de geluiden",
    imported: "Instellingen succesvol geïmporteerd. De pagina wordt opnieuw geladen om de wijzigingen toe te passen...",
    importFailed: "De instellingen konden niet worden geïmporteerd",
    resetDone: "Alle instellingen zijn teruggezet naar de standaardwaarden. De pagina wordt opnieuw geladen om de wijzigingen toe te passen...",
    copySoundsFailed: "Instellingen gekopieerd, maar fout bij het meenemen van de geluiden",
    copied: "Instellingen naar klembord gekopieerd",
    copyFailed: "De instellingen konden niet naar het klembord worden gekopieerd",
    invalidData: "Ongeldige instellingengegevens",
    pasteImportFailed: "De instellingen konden niet vanaf het klembord worden geïmporteerd",
    pasteReadFailed: "Het klembord kon niet worden gelezen",
  },
} satisfies Translation<typeof en>;
