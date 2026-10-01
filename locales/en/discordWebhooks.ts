/**
 * Discord Webhooks — components/Settings/DiscordWebhooks.vue. Its name is features.discordWebhooks.
 * The panel's keys are under `panel`. The lobby's Discord button and the post it sends are
 * entrypoints/lobby.content/discord-webhooks.ts, and have keys of their own beside these.
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
};
