import type { WxtStorageItem } from "wxt/storage";
import { storage } from "wxt/storage";

export interface TSoundData {
  info: string;
  data?: string;
}

export interface ISoundsConfig {
  bust: TSoundData;
  T: TSoundData;
  T15: TSoundData;
  T16: TSoundData;
  T17: TSoundData;
  T18: TSoundData;
  T19: TSoundData;
  T20: TSoundData;
  bull: TSoundData;
  miss: TSoundData[];
  bot: TSoundData;
  botOutside: TSoundData;
  cricketHit: TSoundData;
  cricketMiss: TSoundData;
  playerStart: TSoundData;
  winner: { name: string; data?: string; info: string }[];
}

export const defaultSoundsConfig: ISoundsConfig = {
  bust: { info: "https://www.myinstants.com/media/sounds/super-mario-dies.mp3" },
  T: { info: "https://autodarts-plus.x10.mx/beep_1.mp3" },
  T15: { info: "https://autodarts-plus.x10.mx/beep_1.mp3" },
  T16: { info: "https://autodarts-plus.x10.mx/beep_1.mp3" },
  T17: { info: "https://autodarts-plus.x10.mx/beep_2_17.wav" },
  T18: { info: "https://autodarts-plus.x10.mx/beep_2_18.wav" },
  T19: { info: "https://autodarts-plus.x10.mx/beep_2_19.wav" },
  T20: { info: "https://autodarts-plus.x10.mx/beep_2_20.wav" },
  bull: { info: "https://autodarts-plus.x10.mx/beep_2_bullseye.mp3" },
  miss: [
    { info: "https://autodarts-plus.x10.mx/miss_1.mp3" },
    { info: "https://autodarts-plus.x10.mx/miss_2.mp3" },
    { info: "https://autodarts-plus.x10.mx/miss_3.mp3" },
  ],
  bot: { info: "https://autodarts-plus.x10.mx/sound_chopping-wood.mp3" },
  botOutside: { info: "https://autodarts-plus.x10.mx/sound_wood-block.mp3" },
  cricketHit: { info: "https://autodarts-plus.x10.mx/bonus-points.mp3" },
  cricketMiss: { info: "https://autodarts-plus.x10.mx/sound_double_windart.wav" },
  playerStart: { info: "" },
  winner: [
    { name: "Fallback", info: "https://www.myinstants.com/media/sounds/dart-winner.mp3" },
  ],
};

export const AutodartsToolsSoundsConfig: WxtStorageItem<ISoundsConfig, any> = storage.defineItem(
  "local:soundsconfig",
  {
    defaultValue: defaultSoundsConfig,
  },
);
