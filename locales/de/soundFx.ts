import type en from "../en/soundFx";
import type { Translation } from "../../utils/i18n/types";

export default {
  // Never more lines than the English: the card's text sits in a column of two thirds of a card of fixed height.
  card: "Soundeffekte bei 180, Checkout oder Matchgewinn abspielen.",
  // The Caller is features.caller, in its genitive: "des Callers".
  intro: "Spielt Soundeffekte bei Spielereignissen ab, etwa Publikumsjubel bei einer 180 oder ein Stöhnen bei einem Bust. Jeder Sound wird bei den Triggern abgespielt, die du ihm gibst. Lass sie mit <code>{prefix}</code> beginnen, um sie von denen des Callers zu unterscheiden.",
  audioNotice: "Bitte interagiere mit der Seite (klicke, tippe oder drücke eine Taste), um den Ton für die Soundeffekte zu aktivieren.",
  sections: {
    options: "Optionen",
  },
  gameModes: {
    description: "Die Spiele, in denen Sounds abgespielt werden. Lobby- und Turniersounds werden in jedem Spiel abgespielt.",
    intro: "Sound FX spielt Sounds nur in den hier eingeschalteten Spielen ab.",
  },
  list: {
    emptyText: "Lade eigene Sounds hoch, füge einen über einen Link hinzu oder erzeuge einen aus Text.",
  },
  notifications: {
    // The site's own word for a configuration is Konfiguration (account.removeAccount.loseItems.boards).
    configNotLoaded: "Konfiguration nicht geladen",
    sorted: "Die Sounds von Sound FX wurden nach ihren Triggern sortiert",
    allDeleted: "Alle Soundeffekte wurden gelöscht",
  },
} satisfies Translation<typeof en>;
