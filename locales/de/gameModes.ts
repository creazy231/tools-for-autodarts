import type en from "../en/gameModes";
import type { Translation } from "../../utils/i18n/types";

export default {
  title: "Spielmodi",
  buttonLabel: "Spielmodi: {summary}",
  summary: {
    all: "Alle Spiele",
    none: "Keine",
    count: "{on} von {total}",
  },
  groups: {
    x01Cricket: "X01 und Cricket",
    practice: "Training",
    party: "Party",
    beforeMatch: "Vor dem Match",
  },
  modes: {
    x01: "X01",
    cricket: "Cricket / Taktik",
    countUp: "Count Up",
    atc: "Around The Clock",
    randomCheckout: "Zufälliges Checkout",
    rtw: "Round the World",
    segmentTraining: "Segmenttraining",
    bobs27: "Bob's 27",
    game121: "121",
    shanghai: "Shanghai",
    gotcha: "Gotcha",
    bermuda: "Bermuda",
    killer: "Killer",
    bullOff: "Bull-Off",
  },
} satisfies Translation<typeof en>;
