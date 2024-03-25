import type { WxtStorageItem } from "wxt/storage";
import { storage } from "wxt/storage";

export interface ISoundsConfig {
  bust?: string;
  T15?: string;
  T16?: string;
  T17?: string;
  T18?: string;
  T19?: string;
  T20?: string;
  bull?: string;
}

export const defaultSoundsConfig: ISoundsConfig = {
  bust: "https://www.myinstants.com/media/sounds/super-mario-dies.mp3",
  T15: "https://autodarts-plus.x10.mx/beep_1.mp3",
  T16: "https://autodarts-plus.x10.mx/beep_1.mp3",
  T17: "https://autodarts-plus.x10.mx/beep_2_17.wav",
  T18: "https://autodarts-plus.x10.mx/beep_2_18.wav",
  T19: "https://autodarts-plus.x10.mx/beep_2_19.wav",
  T20: "https://autodarts-plus.x10.mx/beep_2_20.wav",
  bull: "https://autodarts-plus.x10.mx/beep_2_bullseye.mp3",
};

export const AutodartsToolsSoundsConfig: WxtStorageItem<ISoundsConfig, any> = storage.defineItem(
  "local:soundsconfig",
  {
    defaultValue: defaultSoundsConfig,
  },
);
