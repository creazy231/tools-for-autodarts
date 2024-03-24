import type { WxtStorageItem } from "wxt/storage";
import { storage } from "wxt/storage";
import type { BoardStatus } from "@/utils/types";

export interface IConfig {
  url: string;
  discord: {
    enabled: boolean;
    url: string;
  };
  autoStart: {
    enabled: boolean;
  };
  streamingMode: {
    enabled: boolean;
    chromaKeyColor: string;
    throws: boolean;
    footerText: string;
    board: boolean;
    boardImage: boolean;
  };
  colors: {
    enabled: boolean;
    background: string;
    text: string;
  };
  recentLocalPlayers: {
    enabled: boolean;
    cap: number;
    players: string[];
  };
  takeout: {
    enabled: boolean;
  };
  inactiveSmall: {
    enabled: boolean;
  };
  shufflePlayers: {
    enabled: boolean;
  };
  caller: {
    enabled: boolean;
  };
  // TODO: implement to PageConfig
  soundAfterBotThrow: {
    enabled: boolean;
  };
}

export interface IMatchStatus {
  throws: string[];
  turnPoints: string | null ;
  isInEditMode: boolean;
  hasWinner: boolean;
}

export type TBoardStatus = BoardStatus | undefined;

export const defaultConfig: IConfig = {
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
    chromaKeyColor: "#009933",
    throws: false,
    footerText: "",
    board: false,
    boardImage: false,
  },
  colors: {
    enabled: false,
    background: "#3182CE",
    text: "#FFFFFF",
  },
  recentLocalPlayers: {
    enabled: false,
    cap: 10,
    players: [],
  },
  takeout: {
    enabled: false,
  },
  inactiveSmall: {
    enabled: false,
  },
  shufflePlayers: {
    enabled: false,
  },
  caller: {
    enabled: true,
  },
  soundAfterBotThrow: {
    enabled: true,
  },
};

export const AutodartsToolsConfig: WxtStorageItem<IConfig, any> = storage.defineItem(
  "local:config",
  {
    defaultValue: defaultConfig,
  },
);

export const defaultMatchStatus: IMatchStatus = {
  throws: [],
  turnPoints: null,
  isInEditMode: false,
  hasWinner: false,
};

export const AutodartsToolsMatchStatus: WxtStorageItem<IMatchStatus, any> = storage.defineItem(
  "local:matchstatus",
  {
    defaultValue: defaultMatchStatus,
  },
);

export const AutodartsToolsBoardStatus: WxtStorageItem<TBoardStatus, any> = storage.defineItem(
  "local:boardstatus",
  {
    defaultValue: undefined,
  },
);
