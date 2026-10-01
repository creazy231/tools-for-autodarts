import type en from "../en/whatsNew";
import type { Translation } from "../../utils/i18n/types";

export default {
  title: "Wat is er nieuw in {release}",
  intro: "Autodarts heeft zijn site opnieuw opgebouwd, dus deze versie is een herbouw van de extensie die daarbij past: elke functie is overgezet naar het nieuwe ontwerp, en een paar ervan werken nu behoorlijk anders.",
  beforeYouPlay: "Voordat je speelt",
  newInThisRelease: "Nieuw in deze versie",
  headsUp: {
    featuresGone: {
      title: "Twee functies zijn verdwenen",
      body: "Spelers schudden — de lobby heeft nu een eigen knop 'Volgorde willekeurig maken' — en Menu in wedstrijd verbergen, omdat het opnieuw opgebouwde wedstrijdscherm geen menu heeft dat je kunt verbergen.",
    },
    settingsFresh: {
      title: "Een paar instellingen beginnen opnieuw",
      body: "De Vertraging van Instant Replay heet nu Startvertraging en betekent iets anders, daarom begint die op 3 seconden; de Middenpositie van Darts Zoom is verdwenen en de tijd dat het bord op een dart ingezoomd blijft, wordt nu in milliseconden aangegeven. Het is de moeite waard om er voor je volgende wedstrijd even naar te kijken.",
    },
  },
  highlights: {
    boardView: {
      title: "Bordweergave",
      body: "Start elk spel — de bull-off inbegrepen — met de camera of het getekende bord waar je naar wilt kijken.",
    },
    zoom: {
      title: "Darts Zoom, vernieuwd",
      body: "De nieuwe modus Op het bord zoomt het eigen bord van Autodarts in op elke dart en voegt niets toe aan het scherm. Onderaan en Bovenaan tonen in plaats daarvan close-ups, en Onderaan is de nieuwe standaard.",
    },
    quietOwnDarts: {
      title: "Eigen darts dempen",
      body: "Dempt het inslaggeluid voor darts die je al kunt horen landen, en laat het horen voor alle anderen. De schakelaar staat in de eigen geluidsinstellingen van Autodarts, onder Dart geland.",
    },
    streamingMode: {
      title: "Streamingmodus",
      body: "Werkt op de opnieuw opgebouwde site en heeft geen bordcamera meer nodig. Er is een tweede scorebord om uit te kiezen — Autodarts, getekend volgens het eigen ontwerp van de site — naast het klassieke broadcast-scorebord.",
    },
    caller: {
      title: "Caller",
      body: "De optie Gecombineerde worpen voorrang geven voorkomt dat een beurt twee keer wordt afgeroepen als er een eigen combinatiegeluid voor is, en er is een bulloff-trigger, passend bij die van WLED.",
    },
    gotcha: {
      title: "Gotcha",
      body: "Checkoutroutes die hier worden berekend — Autodarts levert er geen voor Gotcha — en door de Caller worden afgeroepen, plus een hulpmiddel dat elke speler markeert die je zou kunnen terugzetten.",
    },
  },
  changelog: "Volledige changelog",
  reportIssue: "Probleem melden",
  gotIt: "Begrepen",
} satisfies Translation<typeof en>;
