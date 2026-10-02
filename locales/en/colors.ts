/**
 * Colors — components/Settings/Colors.vue and its parts in components/Settings/Colors/. Its name is features.colors.
 * The colour pairs on offer are in utils/colors.ts, which Teams' drawer uses too and the service worker loads: it holds
 * the keys under `presets` and leaves the lookup to the components. qwellcode is a brand, so its name is the same in
 * every language. The sample match screen imitates the site, so `preview` uses the site's own words.
 */
export default {
  card: "Recolour the active player's card, the page behind the match and more, in colour pairs or your own.",
  intro: "Recolours the match screen: the card of the player whose turn it is, the page behind it, and the colours around them. Everything starts at autodarts' own, so nothing changes until you pick something.",
  sections: {
    playerCard: {
      title: "Player card",
      description: "The card of the player whose turn it is, in every layout. A bust and a won leg keep autodarts' own colours, and so does the winner's pattern.",
    },
    background: {
      title: "Background",
      description: "The page behind the match, and the bottom bar and its buttons with it. autodarts' mark stays on the page, tinted to go with the colours you pick.",
    },
    moreColours: "More colours",
  },
  everywhere: {
    title: "On every autodarts page",
    description: "Puts the background on the lobby, the home page and the settings as well, not only on the match screen.",
  },
  /** The flat colours under "More colours". A row's description is its `hint`, then ". ", then its `state`. */
  flat: {
    cards: {
      title: "Other cards",
      hint: "Every card but the active one, and the throw bar",
    },
    text: {
      title: "Text",
      hint: "On the cards and in the throw bar",
    },
    actionBar: {
      title: "Bottom bar",
      hint: "The bar that holds undo and Next, and its buttons with it",
    },
  },
  /** What a flat colour is while none is picked. It follows the hint and its ". ", and is left out once a colour is picked. */
  state: {
    followsBackground: "Follows the background until you pick one.",
    siteOwn: "autodarts' own until you pick one.",
  },
  /** The title and the spoken label of a flat colour's reset button. `label` is the row's title. */
  reset: {
    followBackground: "{label}: follow the background again",
    siteOwn: "{label}: back to autodarts' own",
  },
  /** One scheme: the pairs on offer, then two colours of your own. `label` is what the group is called to a screen reader. */
  scheme: {
    custom: "Custom",
    topLeft: {
      title: "Top left",
      ariaLabel: "{label}: top left colour",
    },
    bottomRight: {
      title: "Bottom right",
      ariaLabel: "{label}: bottom right colour",
    },
  },
  /**
   * The names of the colour pairs, by the id the config stores. The buttons under them are 64 px wide and cut a longer
   * name off, so the German and Dutch names stay short.
   */
  presets: {
    default: "Default",
    card: {
      blueberry: "Blueberry",
      ocean: "Ocean",
      lime: "Lime",
      petrol: "Petrol",
      orange: "Orange",
      crimson: "Crimson",
      gold: "Gold",
      slate: "Slate",
      qwellcode: "qwellcode",
    },
    page: {
      royal: "Royal",
      forest: "Forest",
      petrol: "Petrol",
      wine: "Wine",
      plum: "Plum",
      ember: "Ember",
      graphite: "Graphite",
      qwellcode: "qwellcode",
    },
  },
  preview: {
    you: "You",
    /** The seat the site gives a bot, as `lobby.addBot.botLevel` writes it. */
    botName: "Bot Level {level}",
    leg: "Leg",
    match: "Match",
    next: "Next",
  },
};
