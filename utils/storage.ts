import type { BoardStatus } from "@/utils/types";

export interface IConfig {
  version: number;
  discord: {
    enabled: boolean;
    manually: boolean;
    url: string;
    autoStartAfterTimer?: {
      enabled: boolean;
      minutes: number;
      stream: boolean;
      matchId: string;
      messageId: string;
    };
  };
  autoStart: {
    enabled: boolean;
  };
  qrCode: {
    enabled: boolean;
  };
  streamingMode: {
    enabled: boolean;
    /**
     * Which skin the overlay wears. Anything that is not "v2" draws the classic
     * one, so a config stored before this existed needs no migration.
     */
    design: "classic" | "v2";
    backgroundImage: boolean;
    chromaKeyColor: string;
    image: string;
    throws: boolean;
    footerText: string;
    board: boolean;
    boardImage: boolean;
    avg: boolean; // P4394
    checkout: boolean; // Display checkout suggestions
    scoreBoardSettings: {
      scale: number;
      x: number;
      y: number;
    };
    coordsSettings: {
      scale: number;
      x: number;
      y: number;
    };
  };
  colors: {
    enabled: boolean;
    background: string;
    text: string;
    matchBackground: string;
    actionBar: string;
  };
  recentLocalPlayers: {
    enabled: boolean;
    cap: number;
    players: string[];
  };
  takeout: {
    enabled: boolean;
  };
  smallerScores: {
    enabled: boolean;
  };
  sounds: {
    enabled: boolean;
  };
  externalBoards: {
    enabled: boolean;
    boards: {
      id: string;
      name: string;
    }[];
  };
  automaticFullscreen: {
    enabled: boolean;
  };
  largerLegsSets: {
    enabled: boolean;
    value: number;
  };
  largerPlayerMatchData: {
    enabled: boolean;
    value: number;
  };
  largerPlayerNames: {
    enabled: boolean;
    value: number;
  };
  automaticNextLeg: {
    enabled: boolean;
    sec: number;
  };
  winnerAnimation: {
    enabled: boolean;
  };
  nextPlayerOnTakeOutStuck: {
    enabled: boolean;
    sec: number;
  };
  teamLobby: {
    enabled: boolean;
  };

  animations: {
    enabled: boolean;
    duration?: number;
    delayStart?: number;
    objectFit?: "cover" | "contain";
    viewMode?: "full-page" | "board-only";
    data: IAnimation[];
  };
  caller: {
    enabled: boolean;
    callEveryDart: boolean;
    callCheckout: boolean;
    preferCombinedThrows: boolean;
    sounds: ISound[];
  };
  soundFx: {
    enabled: boolean;
    sounds: ISound[];
  };
  /**
   * Autodarts' own dart-landed sound, kept for throws you cannot already hear.
   *
   * Its switch is drawn into autodarts' own sound settings rather than onto a
   * settings card of ours — see utils/quiet-own-darts-switch.ts — so this is
   * where that switch is remembered and nothing else reads it.
   *
   * Off by default: until someone asks for it, the site should sound exactly
   * the way autodarts built it to.
   */
  quietOwnDarts: {
    enabled: boolean;
  };
  boardView: {
    enabled: boolean;
    view: "image" | "camera-1" | "camera-2" | "camera-3";
  };
  zoom: {
    enabled: boolean;
    position: "top" | "bottom" | "board";
    level: number;
    /** Milliseconds the board stays zoomed on a dart, in the `board` position. */
    resetAfterMs: number;
    mode: "live" | "image";
    zoomOn: "everyone" | "opponents";
    showMarker: boolean;
    onlyOnCheckout: boolean;
  };
  quickCorrection: {
    enabled: boolean;
    scale: number;
  };
  enhancedScoringDisplay: {
    enabled: boolean;
  };
  instantReplay: {
    enabled: boolean;
    deviceId: string;
    /** Seconds of footage to play back. */
    duration: number;
    /** Seconds to wait after the leg is won before the replay covers the screen. */
    startDelay: number;
    viewMode?: "full-page" | "board-only";
    zoom: number;
    positionX: number;
    positionY: number;
  };
  wledFx: {
    enabled: boolean;
    onlyOnce: boolean;
    boardIds: string[];
    effects: IWled[];
  };
  gotcha: {
    enabled: boolean;
  };
  checkoutGuide: {
    enabled: boolean;
  };
}

export interface ISoundTTS {
  text: string;
  voiceURI: string;
  lang: string;
  rate: number;
  pitch: number;
}

export interface ISound {
  name: string;
  url: string;
  base64: string;
  enabled: boolean;
  triggers: string[];
  soundId?: string;
  tts?: ISoundTTS;
}

export interface IAnimation {
  url: string;
  triggers: string[];
  enabled: boolean;
  animationId?: string;
}

export interface IGlobalStatus {
  isFirstStart: boolean;
  user: {
    name: string;
  };
  auth?: {
    token: string;
  };
}

export interface IPlayerInfo {
  id?: string;
  index?: number;
  name: string;
  score: string;
  isActive: boolean;
  legs?: string;
  sets?: string;
  darts?: string;
  stats?: string;
  matchHasLegs?: boolean;
  matchHasSets?: boolean;
  userId?: string;
  avatarUrl?: string;
  hostId?: string;
  boardId?: string;
  cpuPPR?: number | null;
  user?: {
    id: string;
    name: string;
    avatarUrl: string;
    userSettings: {
      showCheckoutGuide: boolean;
      countEachThrow: boolean;
      showChalkboard: boolean;
      showAnimations: boolean;
      caller: string;
      callerEmotion: string;
      callerLanguage: string;
      callerVolume: number;
      callScores: boolean;
      callCheckouts: boolean;
      showSeasonalEffects: boolean;
    };
    country: string;
    legsPlayed: number;
    total180s: number;
    average: number;
    averageUntil170: number;
    first9Average: number;
    checkoutRate: number;
    tournamentsPlayed: number;
    tournamentWins: number;
    tournamentAverage: number;
    tournamentAverageUntil170: number;
    tournament180s: number;
  };
  host?: {
    id: string;
    name: string;
    avatarUrl: string;
    userSettings: {
      showCheckoutGuide: boolean;
      countEachThrow: boolean;
      showChalkboard: boolean;
      showAnimations: boolean;
      caller: string;
      callerEmotion: string;
      callerLanguage: string;
      callerVolume: number;
      callScores: boolean;
      callCheckouts: boolean;
      showSeasonalEffects: boolean;
    };
    country: string;
    legsPlayed: number;
    total180s: number;
    average: number;
    averageUntil170: number;
    first9Average: number;
    checkoutRate: number;
    tournamentsPlayed: number;
    tournamentWins: number;
    tournamentAverage: number;
    tournamentAverageUntil170: number;
    tournament180s: number;
  };
}

export interface ILobbyStatus {
  isPrivate: boolean;
  id?: string;
  createdAt?: string;
  variant?: string;
  settings?: {
    baseScore: number;
    bullMode: string;
    inMode: string;
    maxRounds: number;
    outMode: string;
  };
  bullOffMode?: string;
  host?: {
    id: string;
    name: string;
    avatarUrl: string;
    userSettings: {
      showCheckoutGuide: boolean;
      countEachThrow: boolean;
      showChalkboard: boolean;
      showAnimations: boolean;
      caller: string;
      callerEmotion: string;
      callerLanguage: string;
      callerVolume: number;
      callScores: boolean;
      callCheckouts: boolean;
      showSeasonalEffects: boolean;
    };
    country: string;
    legsPlayed: number;
    total180s: number;
    average: number;
    averageUntil170: number;
    first9Average: number;
    checkoutRate: number;
    tournamentsPlayed: number;
    tournamentWins: number;
    tournamentAverage: number;
    tournamentAverageUntil170: number;
    tournament180s: number;
  };
  players?: any | null;
  maxPlayers?: number;
}

export enum WledType {
  PRESET = "PRESET",
  URL = "URL",
  API = "API",
}

export interface IWled {
  name: string;
  type: WledType;
  url: string;
  preset: string;
  json_api: string;
  enabled: boolean;
  triggers: string|string[];
}

export type TBoardStatus = BoardStatus | undefined;

export const defaultConfig: IConfig = {
  version: 22,
  discord: {
    enabled: false,
    manually: false,
    url: "",
    autoStartAfterTimer: {
      enabled: false,
      minutes: 5,
      stream: false,
      matchId: "",
      messageId: "",
    },
  },
  autoStart: {
    enabled: false,
  },
  qrCode: {
    enabled: false,
  },
  streamingMode: {
    enabled: false,
    design: "classic",
    backgroundImage: false,
    chromaKeyColor: "#009933",
    image: "",
    throws: false,
    footerText: "",
    board: false,
    boardImage: false,
    avg: false, // P42de
    checkout: false,
    scoreBoardSettings: {
      scale: 1,
      x: 0,
      y: 0,
    },
    coordsSettings: {
      scale: 1,
      x: 0,
      y: 0,
    },
  },
  colors: {
    enabled: false,
    background: "#3182CE",
    text: "#FFFFFF",
    matchBackground: "#3c3c3c",
    // the site's own fill for that bar, so switching Colors on does not change
    // it until a colour is actually picked
    actionBar: "#042963",
  },
  recentLocalPlayers: {
    enabled: false,
    cap: 10,
    players: [],
  },
  takeout: {
    enabled: false,
  },
  smallerScores: {
    enabled: false,
  },
  caller: {
    enabled: false,
    callEveryDart: false,
    callCheckout: false,
    preferCombinedThrows: false,
    sounds: [],
  },
  sounds: {
    enabled: false,
  },
  externalBoards: {
    enabled: false,
    boards: [],
  },
  automaticFullscreen: {
    enabled: false,
  },
  largerLegsSets: {
    enabled: false,
    value: 2.5,
  },
  largerPlayerMatchData: {
    enabled: false,
    value: 2,
  },
  largerPlayerNames: {
    enabled: false,
    value: 2.5,
  },
  automaticNextLeg: {
    enabled: false,
    sec: 5,
  },
  winnerAnimation: {
    enabled: false,
  },
  nextPlayerOnTakeOutStuck: {
    enabled: false,
    sec: 10,
  },
  teamLobby: {
    enabled: false,
  },

  boardView: {
    enabled: false,
    view: "camera-1",
  },
  zoom: {
    enabled: false,
    position: "bottom",
    resetAfterMs: 1000,
    level: 3,
    mode: "live",
    zoomOn: "everyone",
    showMarker: true,
    onlyOnCheckout: false,
  },
  quickCorrection: {
    enabled: false,
    scale: 1,
  },
  enhancedScoringDisplay: {
    enabled: false,
  },
  instantReplay: {
    enabled: false,
    deviceId: "",
    duration: 10,
    startDelay: 3,
    viewMode: "board-only",
    zoom: 1,
    positionX: 0,
    positionY: 0,
  },
  animations: {
    enabled: false,
    duration: 5,
    delayStart: 1,
    objectFit: "cover",
    viewMode: "board-only",
    data: [
      {
        url: "https://media.tenor.com/G4cRydvvtU4AAAAM/ted-hankey-darts.gif",
        triggers: [ "t20_t20_bull" ],
        enabled: true,
      },
      {
        url: "https://media1.tenor.com/m/uhkDiMdcP44AAAAd/rapid-darts-darts.gif",
        triggers: [ "gameshot" ],
        enabled: true,
      },
      {
        url: "https://media1.tenor.com/m/QriSf7Rc78cAAAAd/darts-niner.gif",
        triggers: [ "gameshot" ],
        enabled: true,
      },
      {
        url: "https://media.tenor.com/VGyxDGucFyAAAAAM/dancing-bubbly.gif",
        triggers: [ "gameshot" ],
        enabled: true,
      },
      {
        url: "https://media1.tenor.com/m/2SQcMaUE_D8AAAAd/celebrate-winner.gif",
        triggers: [ "gameshot" ],
        enabled: true,
      },
      {
        url: "https://media1.tenor.com/m/HhqlzHe8tXsAAAAd/bulls-eye-anderson.gif",
        triggers: [ "bull", "s50" ],
        enabled: true,
      },
      {
        url: "https://media1.tenor.com/m/Oqlecl-G3xAAAAAd/simon-whitlock-darts-bull.gif",
        triggers: [ "bull", "s50" ],
        enabled: true,
      },
      {
        url: "https://media1.tenor.com/m/pJJbIyu-Bf0AAAAd/tony-o-shea-tony.gif",
        triggers: [ "bull", "s50" ],
        enabled: true,
      },
      {
        url: "https://media1.tenor.com/m/bYQ_X5uvRrIAAAAd/gerwyn-price-darts.gif",
        triggers: [ "180" ],
        enabled: true,
      },
      {
        url: "https://media1.tenor.com/m/lTiUQMnV_qQAAAAC/gerwynprice-darts.gif",
        triggers: [ "180" ],
        enabled: true,
      },
      {
        url: "https://media.tenor.com/xFkVft-1xMQAAAAM/gerwyn-price-darts.gif",
        triggers: [ "180" ],
        enabled: true,
      },
      {
        url: "https://media.tenor.com/uL_HJCSQfkIAAAAM/throw-toss.gif",
        triggers: [ "180" ],
        enabled: true,
      },
      {
        url: "https://media1.tenor.com/m/psyC1iEr058AAAAd/bulls-eye-animation.gif",
        triggers: [ "outside" ],
        enabled: true,
      },
      {
        url: "https://media1.tenor.com/m/x715u156Jz4AAAAd/bbc-america-darts-bbca.gif",
        triggers: [ "outside" ],
        enabled: true,
      },
      {
        url: "https://media.tenor.com/sbknQ0awa2sAAAAM/bbc-america-darts-bbca.gif",
        triggers: [ "outside" ],
        enabled: true,
      },
      {
        url: "https://media.tenor.com/kD_PH0LHaHEAAAAM/sigh-growl.gif",
        triggers: [ "outside" ],
        enabled: true,
      },
      {
        url: "https://media1.tenor.com/m/jaqTZHiIA7EAAAAd/james-wade-darts.gif",
        triggers: [ "busted" ],
        enabled: true,
      },
      {
        url: "https://media.tenor.com/LU60882wezcAAAAM/fallon-sherrock-sports.gif",
        triggers: [ "busted" ],
        enabled: true,
      },
      {
        url: "https://media.tenor.com/Rpa8qRNWZ3UAAAAM/glen-durrant-miss.gif",
        triggers: [ "busted" ],
        enabled: true,
      },
      {
        url: "https://media.tenor.com/tfkMfGGbcLoAAAAM/bbc-america-darts-bbca.gif",
        triggers: [ "busted" ],
        enabled: true,
      },
    ],
  },
  quietOwnDarts: {
    enabled: false,
  },
  soundFx: {
    enabled: false,
    sounds: [
      {
        name: "busted",
        url: "https://www.myinstants.com/media/sounds/super-mario-dies.mp3",
        base64: "",
        enabled: true,
        triggers: [ "ambient_busted" ],
      },
      {
        name: "triple",
        url: "https://autodarts.x10.mx/beep_1.mp3",
        base64: "",
        enabled: true,
        triggers: [ "ambient_triple" ],
      },
      {
        name: "t17",
        url: "https://autodarts.x10.mx/beep_2_17.wav",
        base64: "",
        enabled: true,
        triggers: [ "ambient_t17" ],
      },
      {
        name: "t18",
        url: "https://autodarts.x10.mx/beep_2_18.wav",
        base64: "",
        enabled: true,
        triggers: [ "ambient_t18" ],
      },
      {
        name: "t19",
        url: "https://autodarts.x10.mx/beep_2_19.wav",
        base64: "",
        enabled: true,
        triggers: [ "ambient_t19" ],
      },
      {
        name: "t20",
        url: "https://autodarts.x10.mx/beep_2_20.wav",
        base64: "",
        enabled: true,
        triggers: [ "ambient_t20" ],
      },
      {
        name: "bull",
        url: "https://autodarts.x10.mx/beep_2_bullseye.mp3",
        base64: "",
        enabled: true,
        triggers: [ "ambient_bull" ],
      },
      {
        name: "miss",
        url: "https://autodarts.x10.mx/miss_1.mp3",
        base64: "",
        enabled: true,
        triggers: [ "ambient_miss" ],
      },
      {
        name: "miss",
        url: "https://autodarts.x10.mx/miss_2.mp3",
        base64: "",
        enabled: true,
        triggers: [ "ambient_miss" ],
      },
      {
        name: "miss",
        url: "https://autodarts.x10.mx/miss_3.mp3",
        base64: "",
        enabled: true,
        triggers: [ "ambient_miss" ],
      },
      {
        name: "gameshot",
        url: "https://www.myinstants.com/media/sounds/dart-winner.mp3",
        base64: "",
        enabled: true,
        triggers: [ "ambient_gameshot" ],
      },
      {
        name: "cricket_miss",
        url: "https://autodarts.x10.mx/sound_double_windart.wav",
        base64: "",
        enabled: true,
        triggers: [ "cricket_miss" ],
      },
      {
        name: "cricket_hit",
        url: "https://autodarts.x10.mx/bonus-points.mp3",
        base64: "",
        enabled: true,
        triggers: [ "cricket_hit" ],
      },
    ],
  },
  wledFx: {
    enabled: false,
    onlyOnce: true,
    boardIds: [],
    effects: [
      {
        name: "gameon",
        type: WledType.URL,
        url: "http://wled-device.local/win/PL=10",
        preset: "",
        json_api: "",
        enabled: true,
        triggers: [ "gameon" ],
      },
      {
        name: "takeout",
        type: WledType.URL,
        url: "wled-device.local",
        preset: "4",
        json_api: "",
        enabled: true,
        triggers: [ "takeout" ],
      },
      {
        name: "gameshot",
        type: WledType.URL,
        url: "192.168.0.69",
        preset: "6",
        json_api: "",
        enabled: true,
        triggers: [ "gameshot" ],
      }
    ],
  },
  gotcha: {
    enabled: false,
  },
  checkoutGuide: {
    enabled: false,
  },
};

/**
 * Settings shape version. Bump this and add a migration whenever a saved config
 * would otherwise be read wrong — a removed option, a narrowed set of values, a
 * new field that has to be filled in. `defaultValue` does not help there: it is
 * only used when the whole config is missing, never merged field by field.
 *
 * Migrations run once, as soon as this item is defined, and `getValue` waits
 * for them, so no caller has to know about them.
 */
const CONFIG_VERSION = 9;

export const AutodartsToolsConfig: WxtStorageItem<IConfig, any> = storage.defineItem(
  "local:config-2-0-0",
  {
    defaultValue: defaultConfig,
    version: CONFIG_VERSION,
    /**
     * Migrations run on whatever shape was saved at the time, which is only
     * `IConfig` for the last one. A field one step writes may have been renamed
     * by a later step, and a field a later step renames does not exist in the
     * current type at all — so these are typed loosely on purpose.
     */
    migrations: {
      /**
       * Larger Player Match Data's default goes from 1.5 to 2.
       *
       * The number is a size in rem, and the rebuilt site draws the averages
       * row at about 1.4rem on its widest layout — so at 1.5 the feature was a
       * change of two pixels, and read as doing nothing. A value left at the
       * old default becomes the new one; a size someone actually chose keeps
       * the size they chose.
       */
      9: (config: any) => ({
        ...config,
        largerPlayerMatchData: {
          ...config.largerPlayerMatchData,
          value: config.largerPlayerMatchData?.value === 1.5 ? defaultConfig.largerPlayerMatchData.value : config.largerPlayerMatchData?.value,
        },
      }),

      /**
       * Streaming Mode has a second skin now, and a saved config chose neither.
       *
       * The overlay reads this as "v2 or else classic", so it would draw the
       * right thing without this — but the settings page binds a radio group to
       * it, and an unset one shows nothing selected until it is touched.
       */
      8: (config: any) => ({
        ...config,
        streamingMode: {
          ...config.streamingMode,
          design: config.streamingMode?.design ?? defaultConfig.streamingMode.design,
        },
      }),

      /** Quiet Own Darts is new, and a saved config has nothing for it. */
      7: (config: any) => ({
        ...config,
        quietOwnDarts: config.quietOwnDarts ?? defaultConfig.quietOwnDarts,
      }),

      /**
       * Instant Replay's `delay` is gone.
       *
       * It meant how far behind live the picture ran, because what v1 showed
       * was the camera feed lagging rather than a clip of anything. A clip has
       * its own length — `duration`, which already means what that was reaching
       * for — so the only wait left is the one v1 hardcoded at three seconds:
       * how long the site's own celebration gets before the replay covers it.
       *
       * A number saved against the old meaning says nothing about the new one,
       * so this starts from the default rather than carrying it across.
       */
      6: (config: any) => {
        const instantReplay = {
          ...config.instantReplay,
          startDelay: defaultConfig.instantReplay.startDelay,
        };
        delete instantReplay.delay;
        return { ...config, instantReplay };
      },

      /**
       * Darts Zoom's hold time went from seconds to milliseconds, a second
       * being long enough to look at a dart and too long to wait for the board
       * back. A number left at the old default becomes the new one; a number
       * someone actually chose keeps the duration they chose.
       */
      5: (config: any) => {
        const seconds = config.zoom?.resetAfter;
        const zoom = {
          ...config.zoom,
          resetAfterMs: seconds == null || seconds === 5 ? defaultConfig.zoom.resetAfterMs : seconds * 1000,
        };
        delete zoom.resetAfter;
        return { ...config, zoom };
      },

      /** Board View is new, and a saved config has nothing for it. */
      4: (config: any) => ({
        ...config,
        boardView: config.boardView ?? defaultConfig.boardView,
      }),

      /**
       * Darts Zoom gained a third position, which zooms the site's own board
       * and holds it there for a while before letting go. That hold was in
       * seconds at the time; v5 above converts it.
       */
      3: (config: any) => ({
        ...config,
        zoom: { ...config.zoom, resetAfter: config.zoom?.resetAfter ?? 5 },
      }),

      /**
       * Darts Zoom's four positions became two. The rebuilt match screen has no
       * free corners — the score cards reach the bottom of the window — so the
       * close-ups now take a full-width strip, either below the throw display
       * or along the bottom. Anything saved before that becomes the default.
       *
       * Colors also gained a colour for the match screen's action bar.
       */
      2: (config: any) => ({
        ...config,
        zoom: {
          ...config.zoom,
          position: config.zoom?.position === "top" ? "top" : "bottom",
        },
        colors: {
          ...config.colors,
          actionBar: config.colors?.actionBar || defaultConfig.colors.actionBar,
        },
      }),
    },
  },
);

export const defaultGlobalStatus: IGlobalStatus = {
  isFirstStart: false,
  user: {
    name: "",
  },
  auth: {
    token: "",
  },
};

export const AutodartsToolsGlobalStatus: WxtStorageItem<IGlobalStatus, any> = storage.defineItem(
  "local:globalstatus",
  {
    defaultValue: defaultGlobalStatus,
  },
);

export const AutodartsToolsBoardStatus: WxtStorageItem<TBoardStatus, any> = storage.defineItem(
  "local:boardstatus",
  {
    defaultValue: undefined,
  },
);

export const AutodartsToolsUrlStatus: WxtStorageItem<string, any> = storage.defineItem(
  "local:urlstatus",
  {
    /**
     * `window` alone is not enough of a guard. WXT pre-renders every entrypoint
     * in Node to read its config, and in that environment `window` exists while
     * `window.location` does not — so reading `.href` there takes the whole dev
     * server down with "Cannot read properties of undefined", pointing at
     * whichever module happened to pull this one in first.
     */
    defaultValue: typeof window !== "undefined" && window.location
      ? window.location.href.split("#")[0] || "undefined"
      : "undefined",
  },
);

export const AutodartsToolsStreamingModeStatus: WxtStorageItem<boolean, any> = storage.defineItem(
  "local:streamingmodestatus",
  {
    defaultValue: false,
  },
);

/**
 * The release whose notes the user has already seen.
 *
 * Compared against {@link WHATS_NEW_RELEASE}: anything else — an empty string on
 * an install that predates this, or the release before last — opens the What's
 * New dialog the next time the settings page is opened. Dismissing it writes the
 * current release here.
 *
 * Deliberately its own item rather than a field on `IConfig`. Settings are
 * exported, imported and pasted between users, and a "seen" flag is about this
 * browser and nobody else's: carried along it would either hide the notes from
 * someone who has never read them or show them again to someone who has. It also
 * means *Reset All Settings* does not bring the dialog back.
 */
export const AutodartsToolsWhatsNewSeen: WxtStorageItem<string, any> = storage.defineItem(
  "local:whats-new-seen",
  {
    defaultValue: "",
  },
);

/**
 * The release the What's New dialog is currently written for.
 *
 * The major on purpose: 3.0.4 and 3.1 are the same set of notes as 3.0, and
 * nobody wants this dialog again after a patch. Bump it — and rewrite
 * `WhatsNew.vue` — when there is a release worth stopping people for.
 */
export const WHATS_NEW_RELEASE = "3";

/**
 * Map to track locks for each config key to prevent concurrent updates
 */
const configLocks = new Map<keyof IConfig, number>();

/**
 * Utility function to check if a config section has changed
 * @param currentConfigSection The current config section from storage
 * @param newConfigSection The new config section from the component
 * @returns boolean indicating if the config sections are different
 */
export function hasConfigChanged<T>(currentConfigSection: T, newConfigSection: T): boolean {
  return JSON.stringify(currentConfigSection) !== JSON.stringify(newConfigSection);
}

/**
 * Updates the config only if the specified section has changed
 * @param currentConfig The current config from storage
 * @param newConfig The new config from the component
 * @param configKey The key of the config section to check
 * @returns Promise<void>
 */
export async function updateConfigIfChanged<K extends keyof IConfig>(
  currentConfig: IConfig,
  newConfig: IConfig | undefined,
  configKey: K,
): Promise<void> {
  if (!newConfig) return;

  /**
   * This is needed because sometimes the config is updated multiple times in a row
   * because of updated hooks from input fields getting triggered.
   */
  // Check if this config key is currently locked
  const lockTime = configLocks.get(configKey);
  if (lockTime && Date.now() - lockTime < 100) {
    // Config is locked, skip update
    return;
  }

  // Set lock for this config key
  configLocks.set(configKey, Date.now());

  if (!hasConfigChanged(currentConfig[configKey], newConfig[configKey])) return;

  console.log("Autodarts Tools: Updating config", configKey, newConfig[configKey]);

  // Get the latest config to ensure we have the most up-to-date values
  const latestConfig = await AutodartsToolsConfig.getValue();

  // Only update the specific section that changed
  // Deep clone but preserve array types
  const preserveArrays = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => preserveArrays(item));
    }

    if (typeof obj === "object") {
      const result: any = {};
      for (const key in obj) {
        result[key] = preserveArrays(obj[key]);
      }
      return result;
    }

    return obj;
  };

  const test = {
    ...latestConfig,
    [configKey]: preserveArrays(newConfig[configKey]),
  };

  await AutodartsToolsConfig.setValue(toRaw(test));
}
