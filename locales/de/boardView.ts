import type en from "../en/boardView";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Starte jedes Spiel mit der gewünschten Ansicht — Kamera oder gezeichnetes Board.",
  intro: "Autodarts hat einen einzigen Button dafür, was das Board zeigt, und der schaltet nur der Reihe nach weiter: Kamera 1, 2, 3, das gezeichnete Board und wieder von vorn. Diese Funktion drückt ihn für dich, wenn ein Spiel beginnt, bis die gewählte Ansicht erscheint.",
  sections: {
    options: "Optionen",
  },
  view: {
    title: "Jedes Spiel starten mit",
    description: "Ein Board mit weniger Kameras hat einen kürzeren Durchlauf. Wählst du eine Kamera, die es nicht hat, bleibt die Ansicht unverändert. Solange Board Skins an ist, bleibt stattdessen das gezeichnete Board im Bild, und diese Funktion hält sich heraus.",
    options: {
      camera1: "Kamera 1",
      camera2: "Kamera 2",
      camera3: "Kamera 3",
      image: "Board",
    },
  },
} satisfies Translation<typeof en>;
