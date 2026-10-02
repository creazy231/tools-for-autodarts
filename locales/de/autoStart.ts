import type en from "../en/autoStart";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Fügt neben Spiel starten einen <b>Autostart</b>-Schalter hinzu. Ist er an, startet das Spiel <b>3 Sekunden</b>, nachdem ein weiterer Spieler beigetreten ist. In jeder Lobby ist er zunächst aus.",
  imageAlt: "Autostart",
  toggleOn: "Autostart an",
  toggleOff: "Autostart aus",
} satisfies Translation<typeof en>;
