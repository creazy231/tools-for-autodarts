import type en from "../en/winnerAnimation";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Toont een animatie rond de spelerskaart wanneer een speler een leg wint, voor meer spanning in het spel.",
  intro: "Stel de instellingen van de winnaarsanimatie in.",
  effect: "Deze functie toont een animatie rond de spelerskaart wanneer een speler een leg wint.",
  customise: "Je kunt de animaties aanpassen in het onderdeel {animations} van de instellingenpagina.",
  darts: { one: "{count} dart", other: "{count} darts" },
  perfectLeg: "{count}-darter — Perfecte leg!",
} satisfies Translation<typeof en>;
