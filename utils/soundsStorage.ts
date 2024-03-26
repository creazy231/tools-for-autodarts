import type { WxtStorageItem } from "wxt/storage";
import { storage } from "wxt/storage";

export interface ISoundsConfig {
  bust: string;
  T15: string;
  T16: string;
  T17: string;
  T18: string;
  T19: string;
  T20: string;
  bull: string;
  miss: string[];
  bot: string;
  botOutside: string;
  winner: { name: string; url: string }[];
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
  miss: [
    "https://autodarts-plus.x10.mx/miss_1.mp3",
    "https://autodarts-plus.x10.mx/miss_2.mp3",
    "https://autodarts-plus.x10.mx/miss_3.mp3",
  ],
  bot: "https://autodarts-plus.x10.mx/sound_chopping-wood.mp3",
  botOutside: "https://autodarts-plus.x10.mx/sound_wood-block.mp3",
  winner: [
    { name: "Fallback", url: "https://autodarts.x10.mx/chase_the_sun/chase_the_sun.mp31" },
    { name: "sebudde", url: "https://autodarts.x10.mx/chase_the_sun/chase_the_sun.mp32" },
    { name: "jane", url: "https://autodarts.x10.mx/chase_the_sun/chase_the_sun.mp33" },
  ],
};

export const AutodartsToolsSoundsConfig: WxtStorageItem<ISoundsConfig, any> = storage.defineItem(
  "local:soundsconfig",
  {
    defaultValue: defaultSoundsConfig,
  },
);
