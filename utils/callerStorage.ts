import type { WxtStorageItem } from "wxt/storage";
import { storage } from "wxt/storage";

interface TCaller {
  name?: string;
  folder: string;
  url: string;
  fileExt?: string;
  isActive?: boolean;
};

export interface ICallerConfig {
  caller: TCaller[];
}

export const defaultCallerConfig: ICallerConfig = {
  caller: [
    {
      name: "Male eng",
      folder: "1_male_eng",
      url: "https://autodarts.x10.mx",
      fileExt: ".mp3",
      isActive: true,
    },
    {
      name: "Google eng",
      folder: "google_eng",
      url: "",
    },
    {
      name: "Google de",
      folder: "google_de",
      url: "",
    },
  ],
};

export const AutodartsToolsCallerConfig: WxtStorageItem<ICallerConfig, any> = storage.defineItem(
  "local:callerconfig",
  {
    defaultValue: defaultCallerConfig,
  },
);
