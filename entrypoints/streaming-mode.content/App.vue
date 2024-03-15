<template>
  <div
    @click="enabled = !enabled"
    v-if="enabled"
    class="fixed inset-0 z-[100] font-sans"
    :style="{
      backgroundColor: config.streamingMode.chromaKeyColor,
    }"
  >
    <div
      v-if="game?.players.length"
      class="absolute left-0 top-0 size-[35vw]"
      v-html="coords"
    />
    <div v-if="game?.players.length" class="absolute bottom-8 right-24 border-2 border-black bg-gray-800 text-2xl">
      <div
        :class="twMerge(
          'grid grid-cols-[30rem_8rem_8rem]',
          hasSets && 'grid-cols-[35rem_8rem_8rem_8rem]',
        )"
      >
        <div
          v-if="config.streamingMode.throws"
          :class="twMerge(
            'col-span-3 border-b-2 border-black',
            hasSets && 'col-span-4',
          )"
        >
          <div class="grid grid-cols-4 divide-x-2 divide-black text-center text-5xl font-bold">
            <div
              v-for="(t, index) in game.throws"
              :key="index"
              :class="twMerge(
                'relative flex items-center justify-center p-2',
                index >= 1 && 'text-black bg-gray-300',
                t.active && 'bg-cyan-600 text-white',
              )"
            >
              <template v-if="(t.value && index === 0) || t.active">
                {{ t.value }}
              </template>
              <template v-else>
                <div class="absolute inset-0 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" class="-rotate-45" viewBox="0 0 512 512"><path fill="currentColor" d="M134.745 22.098c-4.538-.146-9.08 1.43-14.893 7.243c-5.586 5.586-11.841 21.725-15.248 35.992c-.234.979-.444 1.907-.654 2.836l114.254 105.338c-7.18-28.538-17.555-59.985-29.848-86.75c-11.673-25.418-25.249-46.657-37.514-57.024c-6.132-5.183-11.56-7.488-16.097-7.635M92.528 82.122L82.124 92.526L243.58 267.651l24.072-24.072zm-24.357 21.826c-.929.21-1.857.42-2.836.654c-14.267 3.407-30.406 9.662-35.993 15.248c-5.813 5.813-7.39 10.355-7.244 14.893c.147 4.538 2.452 9.965 7.635 16.098c10.367 12.265 31.608 25.842 57.025 37.515c26.766 12.293 58.211 22.669 86.749 29.848L68.17 103.948zM280.899 255.79l-25.107 25.107l73.265 79.469l31.31-31.31zm92.715 85.476l-32.346 32.344l2.07 2.246c.061.058 4.419 4.224 10.585 6.28c6.208 2.069 12.71 2.88 21.902-6.313c9.192-9.192 8.38-15.694 6.31-21.902c-2.057-6.174-6.235-10.54-6.283-10.59zm20.172 41.059a46.23 46.23 0 0 1-5.233 6.226a46.241 46.241 0 0 1-6.226 5.235L489.91 489.91z" /></svg>
                </div>
              </template>
            </div>
          </div>
        </div>
        <div class="px-4 py-2">
          {{ game.title }}
        </div>
        <div v-if="hasSets" class="px-4 py-2 text-center">
          Sets
        </div>
        <div class="px-4 py-2 text-center">
          Legs
        </div>
        <div />
        <template v-for="(player, index) in game.players" :key="player.name">
          <div
            :class="twMerge(
              'flex w-full items-center justify-between border-y-2 border-black bg-white px-4 py-2 text-black border-r-2',
              index === 0 ? 'border-t-2' : 'border-t-0',
            )"
          >
            <div class="truncate py-2 font-bold">
              {{ player.name }}
            </div>
            <div class="whitespace-nowrap text-lg font-bold text-gray-500">
              {{ player.avg }}
            </div>
          </div>
          <div
            v-if="hasSets"
            :class="twMerge(
              'flex items-center justify-center border-y-2 border-black px-4 py-2 text-5xl font-bold border-r-2',
              index === 0 ? 'border-t-2' : 'border-t-0',
            )"
          >
            {{ player.sets }}
          </div>
          <div
            :class="twMerge(
              'flex items-center justify-center border-y-2 border-black px-4 py-2 text-5xl font-bold border-r-2',
              index === 0 ? 'border-t-2' : 'border-t-0',
            )"
          >
            {{ player.legs }}
          </div>
          <div
            :class="twMerge(
              'relative flex items-center justify-center border-y-2 border-black px-4 py-2 text-5xl font-bold',
              index === 0 ? 'border-t-2' : 'border-t-0',
            )"
          >
            {{ player.score }}
            <div v-if="player.active" class="absolute -inset-y-0.5 -right-20 flex w-20 items-center justify-center border-2 border-black bg-cyan-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 512 512"><path fill="currentColor" d="M134.745 22.098c-4.538-.146-9.08 1.43-14.893 7.243c-5.586 5.586-11.841 21.725-15.248 35.992c-.234.979-.444 1.907-.654 2.836l114.254 105.338c-7.18-28.538-17.555-59.985-29.848-86.75c-11.673-25.418-25.249-46.657-37.514-57.024c-6.132-5.183-11.56-7.488-16.097-7.635M92.528 82.122L82.124 92.526L243.58 267.651l24.072-24.072zm-24.357 21.826c-.929.21-1.857.42-2.836.654c-14.267 3.407-30.406 9.662-35.993 15.248c-5.813 5.813-7.39 10.355-7.244 14.893c.147 4.538 2.452 9.965 7.635 16.098c10.367 12.265 31.608 25.842 57.025 37.515c26.766 12.293 58.211 22.669 86.749 29.848L68.17 103.948zM280.899 255.79l-25.107 25.107l73.265 79.469l31.31-31.31zm92.715 85.476l-32.346 32.344l2.07 2.246c.061.058 4.419 4.224 10.585 6.28c6.208 2.069 12.71 2.88 21.902-6.313c9.192-9.192 8.38-15.694 6.31-21.902c-2.057-6.174-6.235-10.54-6.283-10.59zm20.172 41.059a46.23 46.23 0 0 1-5.233 6.226a46.241 46.241 0 0 1-6.226 5.235L489.91 489.91z" /></svg>
            </div>
          </div>
        </template>
        <div class="grid-cols-3 px-4 py-2 text-lg">
          {{ game.footer }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// https://cdn.discordapp.com/attachments/1204187269293019146/1214536247993962506/image.png?ex=65f97806&is=65e70306&hm=093003542526fd254295af85a5f7efc02f14390e1492567c0eec0928f41a49d7&
import { twMerge } from "tailwind-merge";
import { waitForElement } from "@/utils";
import { AutodartsToolsConfig } from "@/utils/storage";

interface Player {
  name?: string;
  score?: string | number;
  legs: string | number;
  sets: string | null | undefined;
  avg?: string;
  active: boolean;
  throws?: Throw[];
}

interface Throw {
  value: string | undefined;
  active: boolean;
}

const enabled = ref(false);
const getGameStatsInterval = ref();
const streamModeButtonInterval = ref();
const game = reactive<{
  title: string;
  players: Player[];
  footer: string;
  throws: Throw[];
}>({
  title: "",
  players: [],
  footer: "Game provided by Autodarts.io",
  throws: [],
});

const config = ref();
const coords = ref("");

onMounted(async () => {
  config.value = await AutodartsToolsConfig.getValue();
  try {
    // @ts-expect-error
    enabled.value = window.ADT_STREAMING_MODE_ACTIVE || false;

    streamModeButtonInterval.value = setInterval(initStreamModeButton, 1000);

    // enabled.value = true;
  } catch (e) {
    // silence is golden
  }
});

onBeforeUnmount(() => {
  clearInterval(getGameStatsInterval.value);
  clearInterval(streamModeButtonInterval.value);
});

watch(enabled, (value) => {
  if (value) {
    getGameStats();
    getGameStatsInterval.value = setInterval(getGameStats, 500);
    // @ts-expect-error
    window.ADT_STREAMING_MODE_ACTIVE = true;
  } else {
    clearInterval(getGameStatsInterval.value);
    game.players = [];
  }
});

const hasSets = computed(() => game.players.some(player => player.sets !== undefined && player.sets !== null));

async function initStreamModeButton() {
  if (!document.querySelector("#ad-ext-player-display") || document.querySelector("#adt-stream-mode-button")) return;
  const modeGroupElement = (await waitForElement("#ad-ext-game-variant"))?.parentElement;

  const streamModeButton = modeGroupElement?.lastElementChild?.cloneNode(true) as HTMLAnchorElement;
  streamModeButton.setAttribute("id", "adt-stream-mode-button");
  streamModeButton.removeAttribute("data-active");
  streamModeButton.setAttribute("aria-label", "Streaming Mode");
  streamModeButton.setAttribute("title", "Streaming Mode");
  streamModeButton.removeAttribute("href");
  streamModeButton.style.cursor = "pointer";
  streamModeButton.style.paddingLeft = "1rem";
  streamModeButton.style.paddingRight = "1rem";

  streamModeButton.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\"><g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M7 9h.01m9.74 3H22l-3.5 7l-3.09-4.32\"/><path d=\"m18 9.5l-4 8l-10.39-5.2a2.92 2.92 0 0 1-1.3-3.91L3.69 5.6a2.92 2.92 0 0 1 3.92-1.3ZM2 19h3.76a2 2 0 0 0 1.8-1.1L9 15m-7 6v-4\"/></g></svg>";

  streamModeButton.addEventListener("click", () => {
    enabled.value = !enabled.value;
    // @ts-expect-error
    window.ADT_STREAMING_MODE_ACTIVE = enabled.value;
    streamModeButton.setAttribute("data-active", enabled.value.toString());
  });

  modeGroupElement?.appendChild(streamModeButton);
}

async function getGameStats() {
  try {
    const players = document.querySelector("#ad-ext-player-display")?.children || [];

    const gameSettingsContainerElement = document.querySelector("#ad-ext-game-variant")?.parentElement;

    enabled.value = true;
    game.players = [];
    game.throws = [];

    if (!gameSettingsContainerElement) return;
    // set game.title to all span's textContent inside gameSettingsContainerElement joined by " - "
    game.title = Array.from(gameSettingsContainerElement?.querySelectorAll("span") || []).map(span => span.textContent).filter(span => span && !span!.includes("/") && span.trim().length >= 2).join(" - ");

    for (let i = 0; i < players.length; i++) {
      const player = players[i];

      const active = !player?.querySelector("div")?.classList.contains("ad-ext-player-inactive");

      let playerName = player?.querySelector(".ad-ext-player-name")?.textContent;
      const playerScore = player?.querySelector(".ad-ext-player-score")?.textContent;

      const playerSetsAndLegs = document.querySelector(`#ad-ext-player-display > div:nth-of-type(${i + 1}) > div:nth-of-type(2) > div > div`);

      const setsCheck = playerSetsAndLegs!.children.length >= 2;
      const playerLegs = setsCheck
        ? player?.querySelector("div:nth-of-type(2) > div > div > div:nth-of-type(2) > p")?.textContent
        : player?.querySelector("div:nth-of-type(2) > div > div > div > p")?.textContent;

      const playerSets = setsCheck
        ? player?.querySelector("div:nth-of-type(2) > div > div > div > p")?.textContent
        : undefined;

      const playerStats = player?.querySelector("div:nth-of-type(2) > div > p")?.textContent;
      const playerAVG = playerStats?.split("|")[1].trim();

      // remove all lowercase letters from playerName
      playerName = playerName?.replace(/[a-z]/g, "");

      const playerObj = {
        name: playerName,
        score: playerScore || 0,
        legs: playerLegs || 0,
        sets: playerSets,
        avg: playerAVG,
        active,
      } as Player;

      game.players.push(playerObj);
    }

    const throws = document.querySelector("#ad-ext-turn")?.childNodes as NodeListOf<HTMLElement> | undefined;

    if (throws?.length) {
      for (let j = 0; j < throws?.length || 0; j++) {
        const playerThrow = throws[j];

        const playerThrowObj = {
          value: playerThrow?.textContent || undefined,
          active: playerThrow?.classList.contains("ad-ext-turn-throw"),
        } as Throw;

        game.throws!.push(playerThrowObj);
      }
    }

    config.value = await AutodartsToolsConfig.getValue();
    if (config.value.streamingMode.footerText) {
      game.footer = config.value.streamingMode.footerText;
    }

    if (config.value.streamingMode.board) {
      // find button with aria-label="Coords mode" and no "data-active" attribute
      const coordsModeButton = config.value.streamingMode.boardImage ? document.querySelector("button[aria-label='Live mode']:not([data-active])") as HTMLButtonElement | null : document.querySelector("button[aria-label='Coords mode']:not([data-active])") as HTMLButtonElement | null;
      coordsModeButton?.click();

      try {
        // find svg with `viewBox="0 0 1000 1000"` attribute and its html
        const coordsSvg = document.querySelector("svg[viewBox='0 0 1000 1000']") as SVGSVGElement | null;
        coords.value = coordsSvg?.outerHTML || "";
        console.log(coords.value);
      } catch (e) {
        console.error(e);
      }
    }
  } catch (e) {
    console.error(e);
  }
}
</script>
