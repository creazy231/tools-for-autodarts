import type en from "../en/largerPlayerMatchData";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Vergroot de lettergrootte van de spelersgegevens op de wedstrijdpagina, zodat ze beter te zien zijn.",
  intro: "Toont het leg- en wedstrijdgemiddelde groter onder elke score. Een rij die niet meer op de kaart past, springt over naar een tweede regel.",
  sections: {
    options: "Opties",
  },
  size: {
    title: "Grootte",
    description: "In rem: 1 is de basisgrootte van de browser, standaard 16 pixels. autodarts toont de gemiddelden op ongeveer 1.4.",
  },
} satisfies Translation<typeof en>;
