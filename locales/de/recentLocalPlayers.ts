import type en from "../en/recentLocalPlayers";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Autodarts merkt sich deine letzten 6 lokalen Spieler und vergisst den Rest für immer. Hier bleiben alle erhalten, in der Lobby nur einen Klick entfernt.",
  intro: "Speichert die lokalen Spieler, die du eingibst, nicht nur die sechs, die autodarts sich merkt, und legt sie in einer Leiste unter der Spielerliste der Lobby einen Klick entfernt bereit.",
  stripTitle: "Gespeicherte Spieler",
  sections: {
    options: "Optionen",
  },
  playersToKeep: {
    title: "Zu behaltende Spieler",
    description: "Sobald die Liste voll ist, macht der älteste Name Platz für einen neuen.",
  },
  list: {
    title: "Gespeicherte Spieler",
    emptyTitle: "Noch keine gespeicherten Spieler",
    emptyText: "Jeder lokale Spieler, den du zu einer Lobby hinzufügst, wird hier gespeichert und in einer Leiste unter der Spielerliste der Lobby angeboten.",
    noMatch: "Kein gespeicherter Spieler hat das im Namen.",
    searchPlaceholder: "Spieler suchen",
  },
  deleteAll: {
    title: { one: "Den gespeicherten Spieler löschen?", other: "Alle {count} gespeicherten Spieler löschen?" },
    body: "Sie verschwinden aus der Leiste der Lobby und aus der eigenen Liste von autodarts unter Spieler hinzufügen. Das lässt sich nicht rückgängig machen.",
  },
} satisfies Translation<typeof en>;
