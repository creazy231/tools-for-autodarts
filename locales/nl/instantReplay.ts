import type en from "../en/instantReplay";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Speelt bij elke gewonnen leg de winnende dart af vanaf je eigen webcam.",
  intro: "Richt een webcam op je bord, en zodra een leg is gewonnen, wordt de winnende dart nog een keer over het scherm afgespeeld, met een paar seconden ervoor en een paar erna. Met een klik op de replay haal je die eerder weg.",
  note: "Er wordt alleen opgenomen terwijl je in een wedstrijd zit, en er verlaat niets je computer. Dit is je eigen webcam, niet de camera van het bord, waar de browser niet bij kan.",
  badge: "Replay",
  sections: {
    camera: "Camera",
    replay: "Replay",
    framing: "Uitsnede",
  },
  alert: {
    unavailable: "Camera niet beschikbaar",
    noAccess: "Geen cameratoegang",
    tryAgain: "Opnieuw",
  },
  errors: {
    unsupported: "Je browser ondersteunt geen cameratoegang.",
    denied: "Cameratoegang is geweigerd. Sta cameratoegang toe in de instellingen van je browser.",
    failed: "Er is een fout opgetreden bij het openen van de camera.",
    allInUse: "Alle camera's worden momenteel door andere apps gebruikt. Sluit andere video-apps en probeer het opnieuw.",
    loadFailed: "De camera's konden niet worden geladen.",
    previewFailed: "De gekozen camera kon niet worden geopend.",
  },
  access: {
    title: "Cameratoegang vereist",
    description: "De replay wordt opgenomen met je webcam, dus de browser vraagt eerst om toestemming. Sta het toe in de melding, of vraag opnieuw toegang.",
    allow: "Camera toestaan",
  },
  preview: {
    title: "Voorbeeld",
    fps: "{fps} FPS",
    noCamera: "Geen camera om te tonen",
  },
  camera: {
    title: "Camera",
    hint: {
      some: "Alleen camera's die geen andere app gebruikt, staan in de lijst.",
      none: "Geen vrije camera gevonden. Misschien gebruikt een andere app de camera: sluit die app en zoek dan opnieuw.",
    },
    unnamed: "Camera {id}...",
    refresh: {
      busyLabel: "Zoeken naar camera's",
      idleLabel: "Opnieuw naar camera's zoeken",
      busyTitle: "Zoeken…",
      idleTitle: "Opnieuw zoeken",
    },
  },
  before: {
    title: "Voor de game shot",
    description: "Hoeveel van de aanloop naar de winnende dart de replay laat zien.",
  },
  after: {
    title: "Na de game shot",
    description: "En hoeveel van wat erna komt.",
  },
  startDelay: {
    title: "Startvertraging",
    description: "Van de gewonnen leg tot de replay, zodat er ruimte blijft voor de eigen viering van autodarts.",
    heldBack: "Van de gewonnen leg tot de replay. De {after} s na de game shot moeten eerst worden gefilmd, dus de replay begint pas na {after} s.",
  },
  covers: {
    title: "Bedekking",
    description: "Alleen het bord, of de hele pagina.",
    options: {
      boardOnly: "Alleen bord",
      fullPage: "Hele pagina",
    },
  },
  zoom: {
    title: "Zoom",
    description: "Hoe ver het beeld op het bord inzoomt.",
    value: "{zoom}×",
  },
  panX: {
    title: "Links en rechts",
    description: "Waar het ingezoomde beeld zit, van links naar rechts.",
  },
  panY: {
    title: "Boven en onder",
    description: "En van boven naar beneden.",
  },
  pan: {
    centre: "Midden",
    left: "{percent}% links",
    right: "{percent}% rechts",
    up: "{percent}% boven",
    down: "{percent}% onder",
  },
} satisfies Translation<typeof en>;
