import type en from "../en/boardSkins";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Speel op het bord van autodarts in een ander ontwerp — Classic, qwellcode, Opal, Marble of Sorbet.",
  intro: "Tekent het bord van autodarts in het ontwerp dat je kiest, voor iedereen die erop gooit, bots inbegrepen. Het beeld van een camera heeft geen bord om opnieuw te tekenen, dus deze functie houdt ook het getekende bord in beeld zolang een spel bezig is.",
  sections: {
    skin: "Skin",
  },
  skinAlt: "Bordontwerp {skin}",
  skins: {
    default: {
      label: "Default",
      description: "Het bord dat autodarts nu tekent.",
    },
    v1: {
      label: "Classic",
      description: "Het bord dat autodarts tekende vóór de herbouw.",
    },
    qwellcode: {
      label: "qwellcode",
      description: "Het qwellcode-bord in zwart-wit, met een ring in donkergroen en limoengroen.",
    },
    opal: {
      label: "Opal",
      description: "Parelmoeren segmenten op een pruimkleurige ondergrond, met een koperen ring.",
    },
    marble: {
      label: "Marble",
      description: "Zwart-wit marmer met gouden aders, in een vergulde rand.",
    },
    sorbet: {
      label: "Sorbet",
      description: "Pastelkleuren in citroen, koraal en mintgroen op een lavendelkleurige ring.",
    },
  },
  selected: {
    redrawn: "<b>{label}:</b> {description} De darts, het geel van een treffer en handmatig mikken werken zoals op het eigen bord van autodarts, en ook de close-ups van Darts Zoom en het bord in de Streamingmodus dragen deze skin.",
    kept: "<b>{label}:</b> {description} Aan het bord verandert niets, het wordt alleen op het getekende bord gehouden.",
  },
  note: "Als je zelf op de cameraknop of de eigen toetsen 1, 2 en 3 van autodarts drukt, bepaal jij de weergave tot de volgende leg. Zolang dit aan staat, houdt Bordweergave zich afzijdig, en schakelen Darts Zoom en de Streamingmodus het bord niet meer om.",
} satisfies Translation<typeof en>;
