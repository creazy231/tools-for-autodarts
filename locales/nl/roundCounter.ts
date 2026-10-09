import type en from "../en/roundCounter";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Toont de huidige ronde in de koptekst van het wedstrijdscherm.",
  imageAlt: "Voorbeeld van de functie Rondeteller",
  intro: "Toont de huidige ronde en het maximale aantal rondes van de wedstrijd, midden in de koptekst van het wedstrijdscherm – zoals het wedstrijdscherm deed vóór de vernieuwing van de site.",
  roundOf: "Ronde {round}/{total}",
  round: "Ronde {round}",
} satisfies Translation<typeof en>;
