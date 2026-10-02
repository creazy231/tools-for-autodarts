import type en from "../en/streamingMode";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Optimaliseert de interface voor streaming met eigen achtergronden en lay-outs.",
  intro: "Vervangt het wedstrijdscherm door een broadcast-overlay: een chromakey- of afbeeldingsachtergrond, het bord en een scorebord dat je neerzet waar je wilt. Je schakelt het in en uit met het streampictogram in de koptekst van het wedstrijdscherm; wijzigingen hier zie je direct.",
  sections: {
    scoreboard: "Scorebord",
    board: "Bord",
    background: "Achtergrond",
    layout: "Lay-out",
  },
  design: {
    title: "Ontwerp",
    description: "Autodarts volgt het eigen ontwerp van de site: vlakke oppervlakken en één blauw voor wie er gooit.",
    options: {
      classic: "Klassiek",
    },
  },
  throws: {
    title: "Worpen",
    description: "De darts van de lopende beurt en het totaal, of Bust.",
  },
  checkout: {
    title: "Checkout-suggesties",
    description: "De resterende route voor de speler aan de werplijn, die met elke dart opschuift.",
  },
  averages: {
    title: "Gemiddelden",
    description: "Het leg-, set- en wedstrijdgemiddelde naast elke naam.",
  },
  footer: {
    title: "Voettekst",
    description: "Je eigen regel onderaan de overlay.",
  },
  footerDefault: "Spel aangeboden door Autodarts.com",
  showBoard: {
    title: "Bord tonen",
    description: "Het dartbord naast het scorebord.",
  },
  boardView: {
    title: "Weergave",
    ariaLabel: "Bordweergave",
    description: "Het getekende bord is een kopie die live wordt bijgewerkt, op elke grootte scherp blijft en invalt zolang er geen camera draait. Zolang Board Skins of Bordweergave aan staat, beslist die functie.",
    options: {
      camera: "Camera",
      drawn: "Getekend bord",
    },
  },
  background: {
    title: "Achtergrond",
    description: "Een effen kleur om in je streamingsoftware weg te keyen, of een eigen afbeelding.",
    options: {
      chromaKey: "Chromakey",
      image: "Afbeelding",
    },
  },
  colour: {
    title: "Kleur",
    description: "Kies er een die nergens anders op de overlay voorkomt.",
    ariaLabel: "Chromakeykleur",
  },
  image: {
    title: "Afbeelding",
    description: "Bedekt de hele overlay. Zolang er nog geen is, blijft de chromakeykleur zichtbaar.",
    alt: "Achtergrondafbeelding",
    replace: "Vervangen",
    upload: "Afbeelding uploaden",
  },
  backgroundImage: "achtergrondafbeelding",
  positions: {
    title: "Posities",
    description: "Zet het bord en het scorebord terug op hun beginpositie en beginformaat. Een overlay die al in beeld is, volgt direct.",
    reset: "Posities opnieuw instellen",
  },
  overlay: {
    boardScale: "Bordgrootte: ({percent} %)",
    scoreScale: "Scorebordgrootte: ({percent} %)",
    volume: "Volume",
    dartboard: "Dartbord",
    settings: "Instellingen voor Streamingmodus",
    leave: "Streamingmodus verlaten",
  },
  title: {
    firstToSets: { one: "Eerste tot {count} set", other: "Eerste tot {count} sets" },
    firstToLegs: { one: "Eerste tot {count} leg", other: "Eerste tot {count} legs" },
    variant: {
      x01: "X01",
      cricket: "Cricket",
      countUp: "Count Up",
      atc: "Around the Clock",
      randomCheckout: "Willekeurige checkout",
      rtw: "Round the World",
      segmentTraining: "Segmenttraining",
      bobs27: "Bob's 27",
      game121: "121",
      shanghai: "Shanghai",
      gotcha: "Gotcha",
      bermuda: "Bermuda",
      killer: "Killer",
      bullOff: "Bull-off",
    },
  },
  board: {
    bust: "Bust",
    sets: "Sets",
    legs: "Legs",
    avg: "Gem.",
  },
} satisfies Translation<typeof en>;
