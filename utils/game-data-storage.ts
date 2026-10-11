import type { IMatch } from "./websocket-helpers";
import type { IGameEventBatch } from "./game-events/types";

export interface IGameData {
  private: boolean;
  match: IMatch | undefined;
  /**
   * The game events that came in just before `match` was stored, with an id
   * that is new for every state frame: utils/game-events/processor.ts reads
   * them, nothing else does. Missing on a state stored without them.
   */
  batch?: IGameEventBatch;
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
