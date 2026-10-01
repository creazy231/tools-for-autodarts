/**
 * QR Code — the card in components/Settings/QrCode.vue (it has no settings panel) and the code it
 * pins in the lobby, entrypoints/lobby.content/QrCodeOverlay.vue. Its name is features.qrCode.
 */
export default {
  /** "The ✕" is the button under the code in the lobby: keep the symbol. */
  card: "Pins the lobby's join code to the top right corner, in place of Autodarts' own QR button. The ✕ below it hides the code for that lobby and gives the original button back.",
  /** The ✕ button's tooltip and spoken name: it has no text of its own. */
  hide: "Hide the QR code",
};
