import type { IMatch } from "./websocket-helpers";

export enum GameMode {
  BULL_OFF = "Bull-off",

  X01 = "X01",
  CRICKET = "Cricket",

  // Training  
  COUNT_UP = "CountUp",
  ATC = "ATC",
  RANDOM_CHECKOUT = "Random Checkout",
  RTW = "RTW",
  SEGMENT_TRAINING = "Segment Training",
  BOBS_27 = "Bob's 27",
  TRAINING_121 = "121",

  // Party
  SHANGHAI = "Shanghai",
  GOTCHA = "Gotcha",
  BERMUDA = "Bermuda",
  KILLER = "Killer",
}

/**
 * The config stores the modes a feature is switched off for, so a mode added
 * to {@link GameMode} later starts out on without a migration. The settings
 * show the modes it is switched on for; these two convert between the lists.
 */
export function toEnabledGameModes(disabled: GameMode[] | undefined): GameMode[] {
  return Object.values(GameMode).filter(mode => !disabled?.includes(mode));
}

export function toDisabledGameModes(enabled: GameMode[]): GameMode[] {
  return Object.values(GameMode).filter(mode => !enabled.includes(mode));
}

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
