/** Darts Zoom — components/Settings/Zoom.vue. Its name is features.zoom. */
export default {
  card: "A close-up of where each dart landed — along the foot of the screen, under the throw display, or on the board itself.",
  intro: "A close-up of where each dart of the visit landed, one tile per dart: along the foot of the screen, under the throw display, or on the board itself.",
  sections: {
    closeUps: "Close-ups",
    whichDarts: "Which darts",
    board: "Board",
  },
  position: {
    title: "Position",
    description: "Bottom gives each dart a third of the window and moves undo and Next to the top right, where you can drag them anywhere. Top puts the strip under the throw display. On board zooms autodarts' own board in on each dart instead, and adds nothing to the screen.",
    options: {
      bottom: "Bottom",
      top: "Top",
      board: "On board",
    },
  },
  barPosition: {
    title: "Bar position",
    description: "Puts autodarts' undo and Next back in the top right corner.",
    reset: "Reset bar position",
  },
  holdFor: {
    title: "Hold for",
    description: "How long the board stays on a dart. It pulls back out as soon as the visit ends or passes on.",
  },
  zoomLevel: {
    title: "Zoom level",
    description: "How closely each tile zooms in on its dart.",
  },
  centreDot: {
    title: "Centre dot",
    description: "A dot on the exact point each dart landed.",
  },
  showDartsOf: {
    title: "Show darts of",
    description: "Everyone's darts, or only your opponents'.",
    options: {
      everyone: "Everyone",
      opponents: "Opponents",
    },
  },
  onlyOnCheckout: {
    title: "Only on a checkout",
    description: "Close-ups only on visits where a checkout is on.",
  },
  view: {
    title: "View",
    ariaLabel: "Board view",
    description: "What autodarts' board shows during a game, and so what the close-ups are cut from: a camera's own picture, or a sharp copy of the drawn board. While Board Skins or Board View is on, that feature decides.",
    options: {
      camera1: "Camera 1",
      camera2: "Camera 2",
      camera3: "Camera 3",
      image: "Board",
    },
  },
};
