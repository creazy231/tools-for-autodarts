import type en from "../en/qrCode";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Fixiert den Lobby-QR-Code oben rechts, statt des eigenen QR-Buttons von Autodarts. Das ✕ darunter blendet den Code für diese Lobby aus und gibt den Original-Button zurück.",
  hide: "QR-Code ausblenden",
} satisfies Translation<typeof en>;
