import type en from "../en/largerLegsSets";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Vergroot de lettergrootte van de legs en sets op de wedstrijdpagina, zodat ze beter te zien zijn.",
  imageAlt: "Grotere legs & sets",
  intro: "Toont de legs en sets groter op het wedstrijdscherm, zodat je ze vanaf de werplijn kunt lezen. Het vakje om elk getal groeit mee.",
  sections: {
    options: "Opties",
  },
  size: {
    title: "Grootte",
    description: "In rem: 1 is de basisgrootte van de browser, standaard 16 pixels. autodarts toont ze op 1.5.",
  },
} satisfies Translation<typeof en>;
