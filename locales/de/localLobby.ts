import type en from "../en/localLobby";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Entfernt deinen Eintrag und verschiebt alle Beitretenden auf dein Board, sodass alle an deinem Dartboard spielen. Nur in <b>privaten Lobbys</b> mit dir als Host.",
  noSettings: "Diese Funktion hat keine zusätzlichen Einstellungen.",
  intro: "Wenn aktiviert, wird dein eigener Eintrag aus der Lobby entfernt, und jeder, der mit seinem eigenen Board beitritt, wird auf deins verschoben, sodass alle auf dein Dartboard werfen.",
  teams: "Um in Teams zu spielen, die sich einen Punktestand teilen, nutze die Funktion {teams}.",
  scope: "Läuft nur in privaten Lobbys mit dir als Host.",
} satisfies Translation<typeof en>;
