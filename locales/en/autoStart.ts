/**
 * Autostart — the card in components/Settings/AutoStart.vue (it has no settings panel) and the
 * toggle beside the lobby's Start Game button, entrypoints/lobby.content/AutoStartToggle.vue.
 * Its name is features.autoStart.
 */
export default {
  card: "Adds an <b>Autostart</b> toggle beside the lobby's Start Game button. While it is on, the game starts <b>3 seconds</b> after another player joins. Each lobby opens with it off.",
  /** The card picture's alt. It reads "Auto Start" as it did before the catalogs, which is not the feature's name (features.autoStart is "Autostart"). */
  imageAlt: "Auto Start",
  /** The two halves of the toggle in the lobby. It stands beside the site's own button, so each half names the feature. */
  toggleOn: "Autostart On",
  toggleOff: "Autostart Off",
};
