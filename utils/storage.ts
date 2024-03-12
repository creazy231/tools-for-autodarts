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
    throws: false,
  },
  colors: {
    enabled: false,
    background: "#3182CE",
    text: "#FFFFFF",
  },
};

export const AutodartsToolsConfig = storage.defineItem(
  "local:config",
  {
    config: defaultConfig,
  },
);
