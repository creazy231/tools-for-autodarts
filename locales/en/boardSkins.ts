/**
 * Board Skins — components/Settings/BoardSkins.vue. Its name is features.boardSkins.
 * The skins themselves are in utils/board-skins.ts, which holds the keys under `skins` and leaves
 * the lookup to the component. qwellcode is a brand: its label is the same in every language.
 */
export default {
  card: "Play on autodarts' board in another design — the classic one, qwellcode, Opal, Marble or Sorbet.",
  intro: "Draws autodarts' board in the design you pick, for everyone who throws on it, bots included. A camera's picture has no board to redraw, so this also keeps the drawn board up while a game is on.",
  sections: {
    skin: "Skin",
  },
  /** The picture of a skin in the grid. `skin` is the skin's label. */
  skinAlt: "{skin} board",
  skins: {
    default: {
      label: "Default",
      description: "The board autodarts draws today.",
    },
    v1: {
      label: "Classic",
      description: "The board autodarts drew before its rebuild.",
    },
    qwellcode: {
      label: "qwellcode",
      description: "The qwellcode board in black and white, ringed in dark green and lime.",
    },
    opal: {
      label: "Opal",
      description: "Mother-of-pearl segments on plum, ringed in copper.",
    },
    marble: {
      label: "Marble",
      description: "Black and white marble veined with gold, in a gilded rim.",
    },
    sorbet: {
      label: "Sorbet",
      description: "Lemon, coral and mint pastels on a lavender ring.",
    },
  },
  /**
   * The line under the grid: the skin picked in bold, what it looks like, and what it does.
   * `label` and `description` are that skin's own, from `skins`.
   */
  selected: {
    /** A skin that is drawn over autodarts' board. */
    redrawn: "<b>{label}:</b> {description} The darts, the yellow of a hit and aiming by hand work as on autodarts' own board, and Darts Zoom's close-ups and Streaming Mode's board wear it too.",
    /** Default, which leaves the board as autodarts draws it. */
    kept: "<b>{label}:</b> {description} Nothing about the board changes; it is only kept on the drawn board.",
  },
  note: "Pressing the camera button yourself, or autodarts' own 1, 2 and 3 keys, leaves the view to you until the next leg. While this is on, Board View stands aside, and Darts Zoom and Streaming Mode no longer switch the board.",
};
