import type en from "../en/colors";
import type { Translation } from "../../utils/i18n/types";

export default {
  card: "Ändere die Farben der aktiven Spielerkarte, des Hintergrunds und mehr — mit Farbpaaren oder eigenen Farben.",
  intro: "Färbt den Match-Bildschirm um: die Karte des Spielers, der dran ist, die Seite dahinter und die Farben drumherum. Alles beginnt bei den eigenen Farben von autodarts, daher ändert sich nichts, bis du etwas auswählst.",
  sections: {
    playerCard: {
      title: "Spielerkarte",
      description: "Die Karte des Spielers, der dran ist, in jedem Layout. Ein Bust und ein gewonnenes Leg behalten die eigenen Farben von autodarts, ebenso das Muster des Gewinners.",
    },
    background: {
      title: "Hintergrund",
      description: "Die Seite hinter dem Match und mit ihr die untere Leiste samt ihren Buttons. Das Logo von autodarts bleibt auf der Seite und wird passend zu den gewählten Farben getönt.",
    },
    moreColours: "Weitere Farben",
  },
  everywhere: {
    title: "Auf jeder autodarts-Seite",
    description: "Legt den Hintergrund auch auf die Lobby, die Startseite und die Einstellungen, nicht nur auf den Match-Bildschirm.",
  },
  flat: {
    cards: {
      title: "Übrige Karten",
      hint: "Alle Karten außer der aktiven, dazu die Punkteleiste",
    },
    text: {
      title: "Text",
      hint: "Auf den Karten und in der Punkteleiste",
    },
    actionBar: {
      title: "Untere Leiste",
      hint: "Die Leiste mit Rückgängig und Weiter, samt ihren Buttons",
    },
  },
  state: {
    followsBackground: "Folgt dem Hintergrund, bis du eine Farbe wählst.",
    siteOwn: "Bleibt wie bei autodarts, bis du eine Farbe wählst.",
  },
  reset: {
    followBackground: "{label}: wieder dem Hintergrund folgen",
    siteOwn: "{label}: zurück zur Farbe von autodarts",
  },
  scheme: {
    custom: "Eigene",
    topLeft: {
      title: "Oben links",
      ariaLabel: "{label}: Farbe oben links",
    },
    bottomRight: {
      title: "Unten rechts",
      ariaLabel: "{label}: Farbe unten rechts",
    },
  },
  presets: {
    default: "Standard",
    card: {
      blueberry: "Blaubeere",
      ocean: "Ozean",
      lime: "Limette",
      petrol: "Petrol",
      orange: "Orange",
      crimson: "Karmin",
      gold: "Gold",
      slate: "Schiefer",
      qwellcode: "qwellcode",
    },
    page: {
      royal: "Royal",
      forest: "Wald",
      petrol: "Petrol",
      wine: "Wein",
      plum: "Pflaume",
      ember: "Glut",
      graphite: "Graphit",
      qwellcode: "qwellcode",
    },
  },
  preview: {
    you: "Du",
    botName: "Bot-Level {level}",
    leg: "Leg",
    match: "Match",
    next: "Weiter",
  },
} satisfies Translation<typeof en>;
