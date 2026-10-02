/**
 * Board View — components/Settings/BoardView.vue. Its name is features.boardView.
 * The site's camera button has no text of its own, so the panel names it in its own words.
 */
export default {
  card: "Start every game on the camera — or the drawn board — you actually want to see.",
  intro: "Autodarts has one button for what the board shows, and it only cycles: camera 1, 2, 3, the drawn board, and round again. This presses it for you when a game starts, until the view you picked comes up.",
  sections: {
    options: "Options",
  },
  view: {
    title: "Start every game showing",
    description: "A board with fewer cameras has a shorter cycle, so asking for one it lacks leaves the view alone. While Board Skins is on, it keeps the drawn board up instead, and this stands aside.",
    options: {
      camera1: "Camera 1",
      camera2: "Camera 2",
      camera3: "Camera 3",
      image: "Board",
    },
  },
};
