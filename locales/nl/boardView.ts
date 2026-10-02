import type en from "../en/boardView";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Start elk spel met de weergave die je echt wilt zien — camera of getekend bord.",
  intro: "Autodarts heeft één knop voor wat het bord toont, en die schakelt alleen door: camera 1, 2, 3, het getekende bord en dan weer van voren af aan. Deze functie drukt voor je op die knop wanneer een spel begint, totdat de gekozen weergave verschijnt.",
  sections: {
    options: "Opties",
  },
  view: {
    title: "Elk spel starten met",
    description: "Een bord met minder camera's heeft een kortere cyclus. Kies je een camera die het niet heeft, dan blijft de weergave ongewijzigd. Zolang Board Skins aan staat, blijft in plaats daarvan het getekende bord in beeld en houdt deze functie zich afzijdig.",
    options: {
      camera1: "Camera 1",
      camera2: "Camera 2",
      camera3: "Camera 3",
      image: "Bord",
    },
  },
} satisfies Translation<typeof en>;
