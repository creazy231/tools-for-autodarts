import type { IMatch } from "./websocket-helpers";

export interface IGameData {
  private: boolean;
  match: IMatch | undefined;
}

export const defaultGameData: IGameData = {
  private: false,
  match: undefined,
};

export const AutodartsToolsGameData: WxtStorageItem<IGameData, any> = storage.defineItem(
  "local:game-data",
  {
    defaultValue: defaultGameData,
  },
);
