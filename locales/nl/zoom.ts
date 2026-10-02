import type en from "../en/zoom";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Een close-up van waar elke dart is geland — onderaan het scherm, onder de scorebalk of op het bord zelf.",
  intro: "Een close-up van waar elke dart van de beurt is geland, één tegel per dart: onderaan het scherm, onder de scorebalk of op het bord zelf.",
  sections: {
    closeUps: "Close-ups",
    whichDarts: "Welke darts",
    board: "Bord",
  },
  position: {
    title: "Positie",
    description: "Onderaan krijgt elke dart een derde van het venster en gaan Ongedaan maken en Volgende naar rechtsboven, waar je ze overal heen kunt slepen. Bovenaan zet de strook onder de scorebalk. Op het bord zoomt in plaats daarvan het eigen bord van autodarts in op elke dart en voegt niets toe aan het scherm.",
    options: {
      bottom: "Onderaan",
      top: "Bovenaan",
      board: "Op het bord",
    },
  },
  barPosition: {
    title: "Positie van de balk",
    description: "Zet Ongedaan maken en Volgende van autodarts terug in de rechterbovenhoek.",
    reset: "Balkpositie opnieuw instellen",
  },
  holdFor: {
    title: "Duur",
    description: "Hoe lang het bord op een dart blijft. Het zoomt weer uit zodra de beurt eindigt of doorgaat.",
  },
  zoomLevel: {
    title: "Zoomniveau",
    description: "Hoe dicht elke tegel op zijn dart inzoomt.",
  },
  centreDot: {
    title: "Middelpunt",
    description: "Een stip precies waar elke dart is geland.",
  },
  showDartsOf: {
    title: "Darts tonen van",
    description: "De darts van iedereen, of alleen die van je tegenstanders.",
    options: {
      everyone: "Iedereen",
      opponents: "Tegenstanders",
    },
  },
  onlyOnCheckout: {
    title: "Alleen bij een checkout",
    description: "Alleen close-ups bij beurten waarin een checkout mogelijk is.",
  },
  view: {
    title: "Weergave",
    ariaLabel: "Bordweergave",
    description: "Wat het bord van autodarts tijdens een spel toont, en dus waar de close-ups uit worden gesneden: het eigen beeld van een camera, of een scherpe kopie van het getekende bord. Zolang Board Skins of Bordweergave aan staat, beslist die functie.",
    options: {
      camera1: "Camera 1",
      camera2: "Camera 2",
      camera3: "Camera 3",
      image: "Bord",
    },
  },
} satisfies Translation<typeof en>;
