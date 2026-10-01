import type en from "../en/recentLocalPlayers";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Autodarts onthoudt je laatste 6 lokale spelers en vergeet de rest voorgoed. Dit bewaart ze allemaal, in de lobby op één klik afstand.",
  intro: "Bewaart de lokale spelers die je invoert, niet alleen de zes die autodarts onthoudt, en zet ze op één klik afstand in een strook onder de spelerslijst van de lobby.",
  stripTitle: "Opgeslagen spelers",
  sections: {
    options: "Opties",
  },
  playersToKeep: {
    title: "Te bewaren spelers",
    description: "Zodra de lijst vol is, maakt de oudste naam plaats voor een nieuwe.",
  },
  list: {
    title: "Opgeslagen spelers",
    emptyTitle: "Nog geen opgeslagen spelers",
    emptyText: "Elke lokale speler die je aan een lobby toevoegt, wordt hier opgeslagen en aangeboden in een strook onder de spelerslijst van de lobby.",
    noMatch: "Geen opgeslagen speler heeft dat in zijn naam.",
    searchPlaceholder: "Spelers zoeken",
  },
  moreActions: "Meer acties",
  more: "Meer",
  deleteAll: {
    menu: "Alles verwijderen…",
    title: { one: "De opgeslagen speler verwijderen?", other: "Alle {count} opgeslagen spelers verwijderen?" },
    body: "Ze verdwijnen uit de strook van de lobby en uit de eigen lijst van autodarts onder Speler toevoegen. Dit kan niet ongedaan worden gemaakt.",
    confirm: "Alles verwijderen",
  },
} satisfies Translation<typeof en>;
