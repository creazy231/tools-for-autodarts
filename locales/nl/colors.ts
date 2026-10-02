import type en from "../en/colors";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Pas de kleuren van de actieve spelerskaart, de achtergrond en meer aan — met kleurparen of je eigen kleuren.",
  intro: "Past de kleuren van het wedstrijdscherm aan: de kaart van de speler die aan de beurt is, de pagina erachter en de kleuren eromheen. Alles begint bij de eigen kleuren van autodarts, dus er verandert niets tot je iets kiest.",
  sections: {
    playerCard: {
      title: "Spelerskaart",
      description: "De kaart van de speler die aan de beurt is, in elke lay-out. Een bust en een gewonnen leg behouden de eigen kleuren van autodarts, net als het patroon van de winnaar.",
    },
    background: {
      title: "Achtergrond",
      description: "De pagina achter de wedstrijd, en daarmee ook de balk onderaan en zijn knoppen. Het logo van autodarts blijft op de pagina staan, in een tint die past bij de kleuren die je kiest.",
    },
    moreColours: "Meer kleuren",
  },
  everywhere: {
    title: "Op elke autodarts-pagina",
    description: "Zet de achtergrond ook op de lobby, de homepage en de instellingen, niet alleen op het wedstrijdscherm.",
  },
  flat: {
    cards: {
      title: "Overige kaarten",
      hint: "Elke kaart behalve de actieve, plus de scorebalk",
    },
    text: {
      title: "Tekst",
      hint: "Op de kaarten en in de scorebalk",
    },
    actionBar: {
      title: "Balk onderaan",
      hint: "De balk met Ongedaan maken en Volgende, samen met zijn knoppen",
    },
  },
  state: {
    followsBackground: "Volgt de achtergrond tot je een kleur kiest.",
    siteOwn: "Blijft zoals bij autodarts tot je een kleur kiest.",
  },
  reset: {
    followBackground: "{label}: weer de achtergrond volgen",
    siteOwn: "{label}: terug naar de kleur van autodarts",
  },
  scheme: {
    custom: "Eigen",
    topLeft: {
      title: "Linksboven",
      ariaLabel: "{label}: kleur linksboven",
    },
    bottomRight: {
      title: "Rechtsonder",
      ariaLabel: "{label}: kleur rechtsonder",
    },
  },
  presets: {
    default: "Standaard",
    card: {
      blueberry: "Bosbes",
      ocean: "Oceaan",
      lime: "Limoen",
      petrol: "Petrol",
      orange: "Oranje",
      crimson: "Karmijn",
      gold: "Goud",
      slate: "Leisteen",
      qwellcode: "qwellcode",
    },
    page: {
      royal: "Royaal",
      forest: "Bos",
      petrol: "Petrol",
      wine: "Wijn",
      plum: "Pruim",
      ember: "Gloed",
      graphite: "Grafiet",
      qwellcode: "qwellcode",
    },
  },
  preview: {
    you: "Jij",
    botName: "Botniveau {level}",
    leg: "Leg",
    match: "Wedstrijd",
    next: "Volgende",
  },
} satisfies Translation<typeof en>;
