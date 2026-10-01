import type en from "../en/localLobby";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Verwijdert je vermelding en zet iedereen die deelneemt op jouw bord, zodat iedereen op jouw dartbord speelt. Alleen in <b>privélobby's</b> waar jij host bent.",
  noSettings: "Deze functie heeft geen extra instellingen.",
  intro: "Wanneer ingeschakeld, wordt je eigen vermelding uit de lobby verwijderd en wordt iedereen die met een eigen bord deelneemt naar het jouwe verplaatst, zodat iedereen op jouw dartbord gooit.",
  teams: "Om in teams te spelen die een score delen, gebruik je de functie {teams}.",
  scope: "Werkt alleen in privélobby's waar jij host bent.",
} satisfies Translation<typeof en>;
