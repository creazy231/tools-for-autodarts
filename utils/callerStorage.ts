import type { WxtStorageItem } from "wxt/storage";
import { storage } from "wxt/storage";

export interface TCaller {
  name?: string;
  url: string;
  fileExt?: string;
  isActive?: boolean;
};

export interface ICallerConfig {
  caller: TCaller[];
}
const privateCaller = import.meta.env.DEV && import.meta.env.VITE_PRIVATE_CALLER ? JSON.parse(import.meta.env.VITE_PRIVATE_CALLER).privateCaller || [] : [];
// console.log("privateCaller", privateCaller);
export const defaultCallerConfig: ICallerConfig = {
  caller: [ ...[
    {
      name: "Male eng",
      url: "https://autodarts.x10.mx/1_male_eng",
      fileExt: ".mp3",
      isActive: true,
    },
  ], ...privateCaller ],
};

export const AutodartsToolsCallerConfig: WxtStorageItem<ICallerConfig, any> = storage.defineItem(
  "local:callerconfig",
  {
    defaultValue: defaultCallerConfig,
  },
);
