import type { WxtStorageItem } from "wxt/storage";
import { storage } from "wxt/storage";

export interface ISoundsConfig {
  bust?: string;
}

export const defaultSoundsConfig: ISoundsConfig = {
  bust: "https://www.myinstants.com/media/sounds/super-mario-dies.mp3",
};

export const AutodartsToolsSoundsConfig: WxtStorageItem<ISoundsConfig, any> = storage.defineItem(
  "local:soundsconfig",
  {
    defaultValue: defaultSoundsConfig,
  },
);
