/**
 * Discord Webhooks — components/Settings/DiscordWebhooks.vue. Its name is features.discordWebhooks.
 * The panel's keys are under `panel`. The lobby's Discord button and the post it sends are
 * entrypoints/lobby.content/discord-webhooks.ts, and have keys of their own beside these:
 * `button`, `message`, and the words for the lobby's settings, `settings` and `values`.
 */
export default {
  card: "Whenever a <b>private</b> lobby opens, it sends the invitation link to your discord server using a webhook.",
  intro: "Posts the invitation link of every private lobby you open to a Discord channel, and marks the post once the game has started.",
  panel: {
    sections: {
      options: "Options",
    },
    url: {
      title: "Webhook URL",
      /** `path` is url.path: Discord's own menu path, which no language translates. */
      description: "Where the invitation is posted. Discord makes one under a channel's {path}.",
      /** Where Discord makes a webhook, as Discord's own menus read. The same in every language. */
      path: "Edit Channel › Integrations › Webhooks",
      /** An example address: the same in every language. */
      placeholder: "https://discord.com/api/webhooks/…",
      /** Said under the field when it is empty. */
      nothingPosted: "Nothing is posted until there is a URL here.",
      /** Said under the field when what is in it is not one of Discord's webhook addresses. */
      notWebhook: "This isn't a Discord webhook URL, so the post may never arrive.",
    },
    send: {
      title: "Send the invitation",
      /** Names the two options below by their labels, and the lobby's Shuffle button by the site's label. */
      description: "Automatic posts it as soon as the lobby opens. Manual adds a Discord button beside Shuffle, so you decide when.",
      options: {
        automatic: "Automatic",
        manual: "Manual",
      },
    },
    countdown: {
      title: "Start after a countdown",
      description: "Starts the game by itself a set time after the post, and the post says when.",
      minutes: {
        title: "Countdown",
        description: "From the post to the start of the game.",
      },
    },
    liveScores: {
      title: "Post live scores",
      description: "Keeps a post in the channel updated with the scores while the game is on. Not available on the rebuilt site yet.",
    },
  },
  /** The button the lobby gets beside Shuffle when the post is sent by hand. Its label, "Discord", is the brand and stays as it is. */
  button: {
    title: "Announce this lobby in Discord",
    sent: "Sent",
    failed: "Failed",
  },
  /**
   * What the post says besides the lobby's settings. The headline is only its words: the
   * emoji and the bold around it are in entrypoints/lobby.content/discord-webhooks.ts. The
   * auto-start and started lines carry their own emoji.
   */
  message: {
    headline: "NEW GAME ON AUTODARTS",
    embedTitle: "Settings",
    host: "Host",
    /** `time` is a Discord timestamp (`<t:…:R>`), which each reader's Discord shows as "in 5 minutes" in their own language. */
    autoStart: "⌛ Game will auto-start: {time}",
    started: "🎮 Game has started!",
  },
  /**
   * The names of the lobby's settings in the post: the site's own words in German and Dutch
   * (lobby.gameSettings.*). English is what the post always said, the setting's key with its
   * words capitalised ("maxRounds" → "Max Rounds"), and so is the name of a setting the site
   * adds later, in every language (utils/discord-announcement.ts).
   */
  settings: {
    baseScore: "Base Score",
    bullMode: "Bull Mode",
    bullOffMode: "Bull Off Mode",
    inMode: "In Mode",
    legs: "Legs",
    maxPlayers: "Max Players",
    maxRounds: "Max Rounds",
    outMode: "Out Mode",
    sets: "Sets",
    targetScore: "Target Score",
    variant: "Variant",
  },
  /**
   * The values of those settings. English is what autodarts sends, as the post always showed it
   * ("Official", "Off", "CountUp"), and German and Dutch use the site's labels. A value that isn't
   * here is shown as autodarts sent it.
   */
  values: {
    inOutMode: { Straight: "Straight", Double: "Double", Master: "Master" },
    bullOffMode: { Normal: "Normal", Official: "Official", Off: "Off" },
    /** The game, by the variant autodarts sends. German and Dutch name it as the game picker does (gameModes.modes.*). */
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
};
