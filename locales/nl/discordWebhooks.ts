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
      description: "Waar de uitnodiging wordt geplaatst. Discord maakt die URL aan onder {path} van een kanaal.",
      path: "Kanaal bewerken › Integraties › Webhooks",
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
  button: {
    title: "Deze lobby in Discord aankondigen",
    sent: "Verzonden",
    failed: "Mislukt",
  },
  message: {
    headline: "NIEUW SPEL OP AUTODARTS",
    embedTitle: "Instellingen",
    host: "Host",
    autoStart: "⌛ Het spel start automatisch: {time}",
    started: "🎮 Het spel is begonnen!",
  },
  settings: {
    baseScore: "Beginscore",
    bullMode: "Bull-modus",
    bullOffMode: "Bull-off",
    inMode: "In-modus",
    legs: "Legs",
    maxPlayers: "Max. spelers",
    maxRounds: "Max. rondes",
    outMode: "Uit-modus",
    sets: "Sets",
    targetScore: "Doelscore",
    variant: "Spelmodus",
  },
  values: {
    inOutMode: { Straight: "Straight", Double: "Dubbel", Master: "Master" },
    bullOffMode: { Normal: "Normaal", Official: "PDC", Off: "Geen bull-off" },
    variant: {
      x01: "X01",
      cricket: "Cricket / Tactics",
      countUp: "Count Up",
      atc: "Around the Clock",
      randomCheckout: "Willekeurige checkout",
      rtw: "Round the World",
      segmentTraining: "Segmenttraining",
      bobs27: "Bob's 27",
      game121: "121",
      shanghai: "Shanghai",
      gotcha: "Gotcha",
      bermuda: "Bermuda",
      killer: "Killer",
      bullOff: "Bull-off",
    },
  },
} satisfies Translation<typeof en>;
