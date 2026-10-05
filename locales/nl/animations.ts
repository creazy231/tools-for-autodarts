import type en from "../en/animations";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Toont animaties bij bijzondere momenten zoals een 180, bull, bust of gewonnen leg.",
  intro: "Toont een GIF over het bord op de momenten die je kiest: een 180, een bull, een bust, een gewonnen leg. Met een klik verdwijnt de GIF eerder.",
  noun: "animatie",
  untitled: "animatie",
  categoryOther: "Anders",
  sections: {
    options: "Opties",
  },
  startDelay: {
    title: "Startvertraging",
    description: "Seconden tussen de dart en de animatie.",
  },
  showFor: {
    title: "Duur",
    description: "Hoeveel seconden een animatie in beeld blijft.",
  },
  fit: {
    title: "Schaling",
    description: "Vullen vult de ruimte en kan de GIF bijsnijden. Inpassen toont de hele GIF.",
    options: {
      cover: "Vullen",
      contain: "Inpassen",
    },
  },
  covers: {
    title: "Bedekking",
    description: "Alleen het bord, of de hele pagina met een vervaagde achtergrond.",
    options: {
      boardOnly: "Alleen bord",
      fullPage: "Hele pagina",
    },
  },
  boards: {
    title: "Borden",
    description: "Animaties worden alleen afgespeeld voor worpen en overwinningen op deze borden. Als de lijst leeg is, werken ze op alle borden. Dit voorkomt dat een online tegenstander je lokale GIFs activeert.",
    placeholder: "Plak een bord-ID en druk op Enter",
    invalid: "Dit lijkt niet op een bord-ID. Bijvoorbeeld: 6a501a61-53a5-468a-a56a-17134ace3099.",
  },
  gameModes: {
    description: "De spellen waarin GIF's worden getoond.",
    intro: "Animaties worden alleen getoond in de spellen die hier aan staan.",
  },
  list: {
    emptyTitle: "Nog geen animaties",
    emptyText: "Upload GIF's vanaf je computer, of voeg er een toe via een link. Links van Tenor en Giphy werken.",
    searchPlaceholder: "Animaties zoeken op trigger of link",
  },
  add: {
    upload: {
      label: "GIF's uploaden",
      hint: "Vanaf je computer, meerdere tegelijk",
    },
    link: {
      label: "Toevoegen via een link",
      hint: "Een GIF van het web, bijv. van Tenor of Giphy",
    },
  },
  menu: {
    sort: {
      label: "Sorteren op trigger",
      hint: "Zet het raster in triggervolgorde",
    },
  },
  tile: {
    alt: "Animatie bij {triggers}",
    noTrigger: "geen trigger",
    switchLabel: "Animatie bij {name}: {state}",
    lengthTitle: "Duur: {duration}",
    lengthSpoken: "Duur:",
  },
  dialog: {
    addTitle: "Animatie toevoegen via een link",
    editTitle: "Animatie bewerken",
    previewAlt: "Voorbeeld",
    uploadedLabel: "Geüploade GIF",
    linkLabel: "Link naar een GIF",
    linkPlaceholder: "https://example.com/animation.gif",
    uploadedHint: "Bewaard in deze browser als {filename}. De triggers en de duur kun je hier wijzigen.",
    unknownFile: "onbekend",
    useLength: "GIF-lengte gebruiken",
    useLengthTitle: "Vult in hoe lang één afspeelronde van deze GIF duurt",
    useLengthNeedsLink: "Voeg eerst een link naar een GIF toe",
    showForHint: "Laat het leeg om de optie {option} te gebruiken ({seconds} s).",
    // Shorter than "Animatie toevoegen": next to Annuleren that would not fit a phone.
    addButton: "Toevoegen",
  },
  lengthErrors: {
    link: "De site van deze link laat de extensie het bestand niet lezen, dus de lengte kan niet worden uitgelezen.",
    upload: "De geüploade GIF kon niet worden gelezen.",
    notAnimated: "Dit is geen geanimeerde GIF, dus er is geen lengte om uit te lezen.",
  },
  triggerUnknown: "Animaties kennen deze trigger niet.",
  upload: {
    namesHint: "Een bestand met de naam 180.gif wordt afgespeeld bij 180. Combineer er meerdere met een +, zoals in 180+t20.gif. Een naam die geen trigger is, geeft er geen.",
  },
  deleteAll: {
    title: { one: "De animatie verwijderen?", other: "Alle {count} animaties verwijderen?" },
    body: "Ze worden definitief verwijderd, geüploade GIF's inbegrepen. Dit kan niet ongedaan worden gemaakt.",
  },
  notifications: {
    needsLink: "Voeg eerst een link naar een GIF toe.",
    invalidTriggers: "Sommige triggers waren ongeldig en zijn verwijderd: {triggers}",
    noValidTriggers: "Geen geldige triggers gevonden. Bekijk de documentatie voor de ondersteunde triggerformaten.",
    noStorage: "Je browser ondersteunt geen bestandsopslag. Probeer een andere browser.",
    failedToProcess: "{name} kon niet worden verwerkt",
    added: { one: "{count} GIF toegevoegd", other: "{count} GIF's toegevoegd" },
    processingError: "Fout bij het verwerken van de bestanden",
    allDeleted: "Alle animaties zijn verwijderd",
    sorted: "De animaties zijn op hun triggers gesorteerd",
  },
} satisfies Translation<typeof en>;
