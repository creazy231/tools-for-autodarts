import { WledType } from "#imports";
import { AutodartsToolsConfig, defaultConfig } from "@/utils/storage";

export async function migrationConfig() {
  const config = await AutodartsToolsConfig.getValue();
  if (!config) return;

  const currentConfigVersion = config.version;
  await migrateConfig(currentConfigVersion).catch(console.error);
}

async function migrateConfig(currentConfigVersion: number) {
  console.log("Autodarts Tools: Migrating config...");

  const config = await AutodartsToolsConfig.getValue();

  while (currentConfigVersion < defaultConfig.version) {
    switch (currentConfigVersion) {
      case 1:
        // Migration from version 1 to version 2
        config.version = 2;
        // friendsList removed
        break;
      case 2:
        // Migration from version 2 to version 3
        config.version = 3;
        if (!config.zoom || !config.zoom.position) {
          config.zoom = {
            ...defaultConfig.zoom,
          };
        }
        break;
      case 3:
        // Migration from version 3 to version 4
        config.version = 4;
        if (!config.quickCorrection) {
          config.quickCorrection = {
            ...defaultConfig.quickCorrection,
          };
        }
        break;
      case 4:
        // Migration from version 4 to version 5
        config.version = 5;
        if (config.zoom && !config.zoom.zoomOn) {
          config.zoom.zoomOn = "everyone";
        }
        break;
      case 5:
        // Migration from version 5 to version 6
        config.version = 6;
        break;
      case 6:
        // Migration from version 6 to version 7
        config.version = 7;
        if (config.discord && config.discord.autoStartAfterTimer && !config.discord.autoStartAfterTimer.stream) {
          config.discord.autoStartAfterTimer.stream = false;
          config.discord.autoStartAfterTimer.messageId = "";
          config.discord.autoStartAfterTimer.matchId = "";
        }
        break;
      case 7:
        // Migration from version 7 to version 8
        config.version = 8;
        if (!config.enhancedScoringDisplay) {
          config.enhancedScoringDisplay = {
            enabled: false,
          };
        }
        break;
      case 8:
        // Migration from version 8 to version 9
        config.version = 9;
        if (config.zoom.showMarker === undefined) {
          config.zoom.showMarker = true;
        }
        break;
      case 9:
        // Migration from version 9 to version 10
        config.version = 10;
        if (config.colors && !config.colors.matchBackground) {
          config.colors.matchBackground = defaultConfig.colors.matchBackground;
        }
        break;
      case 10:
        // Migration from version 10 to version 11
        config.version = 11;
        if (!config.qrCode) {
          config.qrCode = {
            enabled: false,
          };
        }
        break;
      case 11:
        // Migration from version 11 to version 12
        config.version = 12;
        if (!config.instantReplay) {
          config.instantReplay = {
            enabled: false,
            deviceId: "",
            duration: 10,
            delay: 5,
            viewMode: "board-only",
            zoom: 1,
            positionX: 0,
            positionY: 0,
          };
        }
        break;
      case 12:
        // Migration from version 12 to version 13
        config.version = 13;
        if (config.instantReplay && !config.instantReplay.viewMode) {
          config.instantReplay.viewMode = "board-only";
        }
        break;
      case 13:
        // Migration from version 13 to version 14
        config.version = 14;
        if (config.instantReplay) {
          (config.instantReplay as any).zoom = 1;
          (config.instantReplay as any).positionX = 0;
          (config.instantReplay as any).positionY = 0;
        } else {
          config.instantReplay = {
            ...defaultConfig.instantReplay,
          };
        }
        break;
      case 14:
        // Migration from version 14 to version 15
        config.version = 15;
        if (config.instantReplay && config.instantReplay.delay === undefined) {
          config.instantReplay.delay = 5;
        }
        break;
      case 15:
        // Migration from version 15 to version 16
        config.version = 16;
        if (config.streamingMode && config.streamingMode.checkout === undefined) {
          config.streamingMode.checkout = false;
        }
        break;
      case 16:
        // Migration from version 16 to version 17
        config.version = 17;
        if (config.zoom && config.zoom.onlyOnCheckout === undefined) {
          config.zoom.onlyOnCheckout = false;
        }
        break;
      case 17:
        // Migration from version 17 to version 18
        config.version = 18;
        if (!config.wledFx) {
          config.wledFx = {
            ...defaultConfig.wledFx,
          };
        }
        break;
      case 18:
        // Migration from version 18 to version 19
        config.version = 19;
        if (config.quickCorrection && config.quickCorrection.scale === undefined) {
          config.quickCorrection.scale = 1;
        }
        break;
      case 19:
        // Migration from version 19 to version 20
        config.version = 20;
        config.wledFx.onlyOnce = true;
        config.wledFx.effects.forEach((effect) => {
          effect.type = WledType.URL;
          effect.preset = '';
          effect.json_api = '';
        });
        break;
      case 20:
        // Migration from version 20 to version 21
        config.version = 21;
        if (!config.gotcha) {
          config.gotcha = {
            enabled: false,
          };
        }
        break;
      case 21:
        // Migration from version 21 to version 22
        config.version = 22;
        if (!config.checkoutGuide) {
          config.checkoutGuide = {
            enabled: false,
          };
        }
        break;
      case 22:
        // Migration from version 22 to version 23
        config.version = 23;
        if (!config.shortcuts) {
          config.shortcuts = {
            ...defaultConfig.shortcuts,
          };
        }
        break;
    }

    await AutodartsToolsConfig.setValue(config);
    currentConfigVersion++;
  }

  console.log("Autodarts Tools: Migration config done");
}
