import type en from "../en/discordWebhooks";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Zodra een <b>privélobby</b> wordt geopend, wordt de uitnodigingslink via een webhook naar je Discord-server gestuurd.",
  intro: "Plaatst de uitnodigingslink van elke privélobby die je opent in een Discord-kanaal en markeert het bericht zodra het spel is gestart.",
  panel: {
    sections: {
      options: "Opties",
    },
    url: {
      title: "Webhook-URL",
      description: "Waar de uitnodiging wordt geplaatst. Discord maakt er een aan onder {path} van een kanaal.",
      path: "Edit Channel › Integrations › Webhooks",
      placeholder: "https://discord.com/api/webhooks/…",
      nothingPosted: "Er wordt niets geplaatst totdat hier een URL staat.",
      notWebhook: "Dit is geen webhook-URL van Discord, dus het bericht komt mogelijk nooit aan.",
    },
    send: {
      title: "Uitnodiging versturen",
      description: "Bij Automatisch wordt de uitnodiging geplaatst zodra de lobby opent. Bij Handmatig komt er een Discord-knop naast 'Volgorde willekeurig maken', zodat jij bepaalt wanneer.",
      options: {
        automatic: "Automatisch",
        manual: "Handmatig",
      },
    },
    countdown: {
      title: "Starten na een countdown",
      description: "Start het spel vanzelf, een vaste tijd na het bericht, en het bericht noemt het tijdstip.",
      minutes: {
        title: "Countdown",
        description: "Van het bericht tot de start van het spel.",
      },
    },
    liveScores: {
      title: "Live scores plaatsen",
      description: "Houdt een bericht in het kanaal bijgewerkt met de scores zolang het spel bezig is. Nog niet beschikbaar op de opnieuw opgebouwde site.",
    },
  },
} satisfies Translation<typeof en>;
