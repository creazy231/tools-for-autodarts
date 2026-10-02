import type en from "../en/gameModes";
import type { Translation } from "../../utils/i18n/types";

export default {
  title: "Spelmodi",
  buttonLabel: "Spelmodi: {summary}",
  summary: {
    all: "Alle spellen",
    none: "Geen",
    count: "{on} van {total}",
  },
  groups: {
    x01Cricket: "X01 en Cricket",
    practice: "Oefenen",
    party: "Party",
    beforeMatch: "Vóór de wedstrijd",
  },
  modes: {
    x01: "X01",
    cricket: "Cricket / Tactics",
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
} satisfies Translation<typeof en>;
