/**
 * Streaming Mode — components/Settings/StreamingMode.vue, the overlay it switches on in a match
 * (entrypoints/match.content/StreamingMode.vue) and the two scoreboards that overlay draws
 * (StreamingBoardClassic.vue and StreamingBoardV2.vue). Its name is features.streamingMode.
 * What the overlay prints about the game uses the site's own words in German and Dutch: the race
 * ("First to 3 Legs") is the site's "First to" with its count, the game is named as the site's
 * game picker names it, and the short form of "average" is the one the site's own tables use.
 */
export default {
  card: "Optimizes the interface for streaming with custom backgrounds and layouts.",
  intro: "Replaces the match screen with a broadcast overlay: a chroma key or image background, the board, and a scoreboard you place where you want it. Switch it on and off from the stream icon in the match header; changes here show at once.",
  sections: {
    scoreboard: "Scoreboard",
    board: "Board",
    background: "Background",
    layout: "Layout",
  },
  design: {
    title: "Design",
    description: "Autodarts follows the site's own design: flat surfaces, and one blue for whoever is throwing.",
    /** The other skin is called Autodarts, in every language: the site's name, so it is not a message. */
    options: {
      classic: "Classic",
    },
  },
  throws: {
    title: "Throws",
    description: "The darts of the visit in progress and its total, or Bust.",
  },
  checkout: {
    title: "Checkout suggestions",
    description: "The route left for the player at the oche, moved along as each dart lands.",
  },
  averages: {
    title: "Averages",
    description: "The leg, set and match average beside each name.",
  },
  footer: {
    title: "Footer text",
    description: "Your own line along the bottom of the overlay.",
  },
  /** The line along the bottom of the overlay until the user writes their own, and the field's placeholder. The stored text stays empty. */
  footerDefault: "Game provided by Autodarts.com",
  showBoard: {
    title: "Show the board",
    description: "The dartboard beside the scoreboard.",
  },
  boardView: {
    title: "View",
    ariaLabel: "Board view",
    description: "The drawn board is a live copy that stays sharp at any size, and stands in while no camera runs. With Board Skins or Board View on, that feature decides.",
    options: {
      camera: "Camera",
      drawn: "Drawn board",
    },
  },
  background: {
    title: "Background",
    description: "A flat colour to key out in your streaming software, or a picture of your own.",
    options: {
      chromaKey: "Chroma key",
      image: "Image",
    },
  },
  colour: {
    title: "Colour",
    description: "Pick one that appears nowhere else on the overlay.",
    ariaLabel: "Chroma key colour",
  },
  image: {
    title: "Image",
    description: "Covers the whole overlay. Until there is one, the chroma key colour shows.",
    alt: "Background image",
    replace: "Replace",
    upload: "Upload image",
  },
  /** What the delete button names, which "Delete …" is spoken with. */
  backgroundImage: "background image",
  positions: {
    title: "Positions",
    description: "Puts the board and the scoreboard back where they started, at their first size. An overlay that is up follows at once.",
    reset: "Reset positions",
  },
  /** What the overlay says in the match: the scale dialog behind the gear, the footer's two tooltips and the picture of the board. */
  overlay: {
    /** `percent` is the slider's position along its range, as the overlay has always shown it. */
    boardScale: "Board Scale: ({percent} %)",
    scoreScale: "Score Scale: ({percent} %)",
    /** The spoken name of both sliders' thumbs. It has said "Volume" from the start, which is a mistake: it is kept as it is until it is fixed on its own. */
    volume: "Volume",
    /** The stand-in picture of the board, for a screen reader and for a picture that does not load. */
    dartboard: "Dartboard",
    /** The gear's tooltip in the footer of both scoreboards. */
    settings: "Streaming Mode settings",
    /** The ✕'s tooltip in the footer of both scoreboards, and the header button's while the overlay is up. */
    leave: "Leave Streaming Mode",
  },
  /** The overlay's title, "121 - First to 3 Legs - SI-DO": the race and the game. The in and out mode code (SI-DO) stays as the site abbreviates it. */
  title: {
    firstToSets: { one: "First to {count} Set", other: "First to {count} Sets" },
    firstToLegs: { one: "First to {count} Leg", other: "First to {count} Legs" },
    /**
     * The game, by the variant autodarts sends. English keeps that variant as the title always showed it
     * ("CountUp", "ATC"); German and Dutch use the site's game names (gameModes.modes.*). A game that is not
     * here is shown as autodarts sent it.
     */
    variant: {
      x01: "X01",
      cricket: "Cricket",
      countUp: "CountUp",
      atc: "ATC",
      randomCheckout: "Random Checkout",
      rtw: "RTW",
      segmentTraining: "Segment Training",
      bobs27: "Bob's 27",
      game121: "121",
      shanghai: "Shanghai",
      gotcha: "Gotcha",
      bermuda: "Bermuda",
      killer: "Killer",
      bullOff: "Bull-off",
    },
  },
  /** The two scoreboards' own words. The Autodarts one sets Bust and Avg in capitals itself. `avg` is the short form of "average", which German and Dutch take from the site's tables. */
  board: {
    bust: "Bust",
    sets: "Sets",
    legs: "Legs",
    avg: "Avg",
  },
};
