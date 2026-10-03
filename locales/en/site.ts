/** What Tools draws into autodarts' own pages. */
export default {
  /** Under the Language select on /settings/general. The site's descriptions there have no full stop. */
  languageNote: "Also changes the language of Tools for Autodarts and its features",
  /**
   * The switch Quiet Own Darts adds under Dart landed in autodarts' own sound settings (utils/quiet-own-darts-switch.ts).
   * The note under its label, "Tools for Autodarts", is a brand and stays literal.
   */
  quietOwnDarts: {
    label: "Only on others' turns",
    /** What a screen reader says for the switch: a copy of the site's, which has no name of its own. */
    ariaLabel: "Play the dart landed sound only on other players' turns",
  },
};
