import i18next from "i18next";

const defaultLang = localStorage.getItem("i18nextLng") || "en";

i18next.init({
  lng: defaultLang,
  fallbackLng: "en",
  resources: {
    en: {
      translation: {
        board_no_match: "Board has no active match",
        lobby: "Lobby",
        my_boards: "My Boards",
        next_leg: "Next Leg",
        next: "Next",
        private: "Private",
        public: "Public",
        reset: "Reset",
        share_link: "or share link:",
        live_mode: "Live mode",
        time_to_ready_up: "Time to ready up",
      },
    },
    de: {
      translation: {
        board_no_match: "Board hat kein aktives Spiel",
        my_boards: "Meine Boards",
        next_leg: "Nächstes Leg",
        private: "Privat",
        public: "Öffentlich",
        reset: "Zurücksetzen",
        share_link: "Link teilen:",
        live_mode: "Live-Modus",
        time_to_ready_up: "Zeit zum bereitmachen",
      },
    },
    nl: {
      translation: {
        board_no_match: "Bord heeft geen actieve wedstrijd",
        my_boards: "Mijn borden",
        next_leg: "Volgende leg",
        share_link: "Deel link:",
        live_mode: "Live modus",
        time_to_ready_up: "Tijd om klaar te zijn",
      },
    },
  },
});

export default i18next;
