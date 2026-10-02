import type en from "../en/largerPlayerNames";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Vergroot de lettergrootte van de spelersnamen op de wedstrijdpagina, zodat ze beter te zien zijn.",
  intro: "Toont de spelersnamen groter op het wedstrijdscherm, in elke lay-out, ook in de zijbalk van een smaller venster.",
  sections: {
    options: "Opties",
  },
  size: {
    title: "Grootte",
    description: "In rem: 1 is de basisgrootte van de browser, standaard 16 pixels. autodarts toont namen op ongeveer 1.1.",
  },
} satisfies Translation<typeof en>;
