import { storage } from "wxt/storage";

export const defaultConfig = {
  url: window.location.href,
  discord: {
    enabled: false,
    url: "",
  },
  autoStart: {
    enabled: false,
  },
  streamingMode: {
    enabled: false,
    chromaKeyColor: "#009933",
    throws: false,
    footerText: "",
    board: false,
    boardImage: false,
  },
  colors: {
    enabled: false,
    background: "#3182CE",
    text: "#FFFFFF",
  },
  recentLocalPlayers: {
    enabled: false,
    cap: 10,
    players: [],
  },
  takeout: {
    enabled: false,
  },
  shufflePlayers: {
    enabled: false,
  },
};

export const AutodartsToolsConfig = storage.defineItem(
  "local:config",
  {
    defaultValue: defaultConfig,
  },
);
