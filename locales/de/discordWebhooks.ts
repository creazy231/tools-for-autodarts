import type en from "../en/discordWebhooks";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Sobald eine <b>private</b> Lobby geöffnet wird, sendet sie den Einladungslink per Webhook an deinen Discord-Server.",
  intro: "Postet den Einladungslink jeder privaten Lobby, die du öffnest, in einen Discord-Kanal und markiert die Nachricht, sobald das Spiel gestartet wurde.",
  panel: {
    sections: {
      options: "Optionen",
    },
    url: {
      title: "Webhook-URL",
      description: "Wohin die Einladung gepostet wird. Discord erstellt die URL unter {path} eines Kanals.",
      path: "Edit Channel › Integrations › Webhooks",
      placeholder: "https://discord.com/api/webhooks/…",
      nothingPosted: "Es wird nichts gepostet, bis hier eine URL steht.",
      notWebhook: "Das ist keine Discord-Webhook-URL, sodass die Nachricht womöglich nie ankommt.",
    },
    send: {
      title: "Einladung senden",
      description: "Bei Automatisch wird sie gepostet, sobald die Lobby geöffnet wird. Bei Manuell kommt neben Shuffle ein Discord-Button dazu, damit du entscheidest, wann.",
      options: {
        automatic: "Automatisch",
        manual: "Manuell",
      },
    },
    countdown: {
      title: "Nach einem Countdown starten",
      description: "Startet das Spiel von selbst, eine festgelegte Zeit nach der Nachricht, und die Nachricht nennt den Zeitpunkt.",
      minutes: {
        title: "Countdown",
        description: "Von der Nachricht bis zum Start des Spiels.",
      },
    },
    liveScores: {
      title: "Live-Scores posten",
      description: "Hält eine Nachricht im Kanal mit den Scores aktuell, solange das Spiel läuft. Auf der neu gebauten Website noch nicht verfügbar.",
    },
  },
  button: {
    title: "Diese Lobby in Discord ankündigen",
    sent: "Gesendet",
    failed: "Fehler",
  },
  message: {
    headline: "NEUES SPIEL AUF AUTODARTS",
    embedTitle: "Einstellungen",
    host: "Host",
    autoStart: "⌛ Das Spiel startet automatisch: {time}",
    started: "🎮 Das Spiel hat begonnen!",
  },
  settings: {
    baseScore: "Basis-Punktestand",
    bullMode: "Bull-Modus",
    bullOffMode: "Bull-Off",
    inMode: "In-Modus",
    legs: "Legs",
    maxPlayers: "Max. Spieler",
    maxRounds: "Max. Runden",
    outMode: "Out-Modus",
    sets: "Sets",
    targetScore: "Zielpunktestand",
    variant: "Spielmodus",
  },
  values: {
    inOutMode: { Straight: "Straight", Double: "Double", Master: "Master" },
    bullOffMode: { Normal: "Normal", Official: "PDC", Off: "Kein Bull-Off" },
    variant: {
      x01: "X01",
      cricket: "Cricket / Taktik",
      countUp: "Count Up",
      atc: "Around The Clock",
      randomCheckout: "Zufälliges Checkout",
      rtw: "Round the World",
      segmentTraining: "Segmenttraining",
      bobs27: "Bob's 27",
      game121: "121",
      shanghai: "Shanghai",
      gotcha: "Gotcha",
      bermuda: "Bermuda",
      killer: "Killer",
      bullOff: "Bull-Off",
    },
  },
} satisfies Translation<typeof en>;
