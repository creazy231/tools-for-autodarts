<template>
  <div class="mb-16 space-y-8">
    <div class="space-y-4">
      <h1 class="text-3xl font-bold">
        Autodarts Tools
      </h1>

      <template v-if="config">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="space-y-4 rounded border border-white/10 p-4">
            <div>
              <h2 class="text-lg font-semibold">
                Discord Webhooks
              </h2>
              <p class="max-w-2xl text-white/40">
                Whenever a <b>private</b> lobby opens, it sends the invitation link to your discord server using a webhook.
              </p>
            </div>
            <div class="grid grid-cols-[5rem_auto] items-center gap-4">
              <AppToggle v-model="config.discord.enabled" />
              <input
                v-model="config.discord.url"
                type="text"
                class="w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none"
              >
            </div>
          </div>

          <div class="space-y-4 rounded border border-white/10 p-4">
            <div>
              <h2 class="text-lg font-semibold">
                Autostart
              </h2>
              <p class="max-w-2xl text-white/40">
                Displays a button to enable autostart on the lobby page. If autostart is enabled, it will automatically start the game after <b>3 seconds</b> once a player joins the lobby.
              </p>
            </div>
            <div class="grid grid-cols-[5rem_auto] items-center gap-4">
              <AppToggle v-model="config.autoStart.enabled" />
            </div>
          </div>

          <div class="space-y-4 rounded border border-white/10 p-4">
            <div>
              <h2 class="text-lg font-semibold">
                Colors
              </h2>
              <p class="max-w-2xl text-white/40">
                Changes the colors of dart throws and scores.
              </p>
            </div>
            <div class="grid grid-cols-[5rem_auto] items-center gap-4">
              <AppToggle v-model="config.colors.enabled" />
            </div>
            <div v-if="config.colors.enabled" class="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div class="relative min-h-14 w-full">
                <input
                  v-model="config.colors.background"
                  type="color"
                  class="size-full overflow-hidden rounded-md border-none border-transparent p-0 outline-none"
                >
                <span class="pointer-events-none absolute inset-0 flex items-center justify-center p-2 text-center text-xs drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">Click here to change color</span>
              </div>
              <div class="relative min-h-14 w-full">
                <input
                  v-model="config.colors.text"
                  type="color"
                  class="size-full overflow-hidden rounded-md border-none border-transparent p-0 outline-none"
                >
                <span class="pointer-events-none absolute inset-0 flex items-center justify-center p-2 text-center text-xs drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">Click here to change color</span>
              </div>
              <div
                class="col-span-2 flex h-14 w-full items-center justify-center rounded-md text-5xl font-bold"
                :style="{
                  backgroundColor: config.colors.background,
                  color: config.colors.text,
                }"
              >
                501
              </div>
            </div>
          </div>

          <div class="space-y-4 rounded border border-white/10 p-4">
            <div>
              <h2 class="text-lg font-semibold">
                Extend recent Local Players
              </h2>
              <p class="max-w-2xl text-white/40">
                Default recent local players capped at 5, this will extend it to infinite.
              </p>
            </div>
            <div class="grid grid-cols-[5rem_auto] items-center gap-4">
              <AppToggle v-model="config.recentLocalPlayers.enabled" />
            </div>
            <div v-if="config.recentLocalPlayers.enabled" class="grid grid-cols-[5rem_auto] items-center gap-4">
              <input
                v-model="config.recentLocalPlayers.cap"
                placeholder="10"
                type="number"
                class="w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none placeholder:opacity-50"
              >
              <p>Maximum recent players you want to store</p>
            </div>
          </div>

          <div class="space-y-4 rounded border border-white/10 p-4">
            <div>
              <h2 class="text-lg font-semibold">
                Takeout Notification
              </h2>
              <p class="max-w-2xl text-white/40">
                Displays a notification when ever takeout of darts is in progress.
              </p>
            </div>
            <div class="grid grid-cols-[5rem_auto] items-center gap-4">
              <AppToggle v-model="config.takeout.enabled" />
            </div>
          </div>

          <div class="space-y-4 rounded border border-white/10 p-4">
            <div>
              <h2 class="text-lg font-semibold">
                Smaller Scores
              </h2>
              <p class="max-w-2xl text-white/40">
                Reduces the font-size of the score of inactive players.
              </p>
            </div>
            <div class="grid grid-cols-[5rem_auto] items-center gap-4">
              <AppToggle v-model="config.inactiveSmall.enabled" />
            </div>
          </div>

          <div class="space-y-4 rounded border border-white/10 p-4">
            <div>
              <h2 class="text-lg font-semibold">
                Shuffle Players
              </h2>
              <p class="max-w-2xl text-white/40">
                Adds a button to the lobby page to shuffle the players in the lobby.
              </p>
            </div>
            <div class="grid grid-cols-[5rem_auto] items-center gap-4">
              <AppToggle v-model="config.shufflePlayers.enabled" />
            </div>
          </div>

          <div class="space-y-4 rounded border border-white/10 p-4">
            <div>
              <h2 class="text-lg font-semibold">
                Streaming Mode
              </h2>
              <p class="max-w-2xl text-white/40">
                Adds a button to the game page to enable streaming mode. If streaming mode is enabled, it will displays a green overlay with stats and scores which then can be captured by OBS or any other streaming software.
              </p>
            </div>
            <div class="grid grid-cols-[5rem_auto] items-center gap-4">
              <AppToggle v-model="config.streamingMode.enabled" />
            </div>
            <div class="grid grid-cols-[5rem_auto] items-center gap-4">
              <input
                v-model="config.streamingMode.chromaKeyColor"
                type="color"
                class="size-full overflow-hidden rounded border-none border-transparent p-0 outline-none"
              >
              <p>Chroma Key Color</p>
            </div>
            <div v-if="config.streamingMode.enabled" class="grid grid-cols-[5rem_auto] items-center gap-4">
              <AppToggle v-model="config.streamingMode.throws" />
              <p>Display Throws</p>
            </div>
            <div v-if="config.streamingMode.enabled" class="grid grid-cols-[5rem_auto] items-center gap-4">
              <AppToggle v-model="config.streamingMode.board" />
              <p>Display the Board</p>
            </div>
            <div v-if="config.streamingMode.enabled && config.streamingMode.board" class="grid grid-cols-[5rem_auto] items-center gap-4">
              <AppToggle v-model="config.streamingMode.boardImage" text-on="IMG" text-off="SVG" />
              <p>Toggles the Board between Image and SVG mode</p>
            </div>
            <input
              v-model="config.streamingMode.footerText"
              placeholder="Bottom text of the streaming overlay"
              class="col-span-2 w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none placeholder:opacity-50"
            >
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppToggle from "@/components/AppToggle.vue";
import type { IConfig } from "@/utils/storage";
import { AutodartsToolsConfig, defaultConfig } from "@/utils/storage";
import type { ICallerConfig } from "@/utils/callerStorage";
import { AutodartsToolsCallerConfig, defaultCallerConfig } from "@/utils/callerStorage";

const config = ref<IConfig>();
const callerConfig = ref<ICallerConfig>();

function setActive(index: number) {
  callerConfig?.value?.caller.forEach((caller, i) => {
    caller.isActive = i === index;
  });
}

onMounted(async () => {
  config.value = await AutodartsToolsConfig.getValue();
  callerConfig.value = await AutodartsToolsCallerConfig.getValue();
});

watch(config, async () => {
  await AutodartsToolsConfig.setValue({
    ...JSON.parse(JSON.stringify(defaultConfig)),
    ...JSON.parse(JSON.stringify(config.value)),
  });
}, { deep: true });

watch(callerConfig, async () => {
  await AutodartsToolsCallerConfig.setValue({
    ...JSON.parse(JSON.stringify(defaultCallerConfig)),
    ...JSON.parse(JSON.stringify(callerConfig.value)),
  });
}, { deep: true });
</script>

<style>
input[type="color"] {
  -webkit-appearance: none;
  border: none;
}
input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 0;
}
input[type="color"]::-webkit-color-swatch {
  border: none;
}
</style>
