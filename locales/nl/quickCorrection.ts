import type en from "../en/quickCorrection";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Voegt een snelle correctie toe aan dartworpen, zodat je verkeerd herkende darts kunt corrigeren.",
  intro: "Corrigeert een dart die het bord verkeerd heeft herkend: open de correctie bij een worp en kies het juiste segment uit een raster van het hele bord, met de muis of het numerieke toetsenblok.",
  safari: {
    card: "Voorlopig niet compatibel met Safari-browsers.",
    panel: "Nog niet beschikbaar in Safari: de beveiligingsregels van Safari blokkeren het correctievenster.",
  },
  sections: {
    options: "Opties",
  },
  windowSize: {
    title: "Venstergrootte",
    description: "Hoe groot het correctievenster opent.",
  },
} satisfies Translation<typeof en>;
