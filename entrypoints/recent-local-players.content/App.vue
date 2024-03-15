<template>
  <div v-if="config?.recentLocalPlayers?.players?.length">
    <div class="flex gap-2">
      <div
        @click="addUserToLobby(player)"
        v-for="player in config.recentLocalPlayers.players"
        :key="player"
        :class="twMerge(
          'uppercase cursor-pointer rounded-md bg-white/10 px-3 py-1 text-sm font-bold transition-colors hover:bg-white/15 flex justify-center items-center',
        )"
      >
        {{ player }}
      </div>
      <div
        @click="handleClearAll"
        :class="twMerge(
          'cursor-pointer rounded-md px-3 py-1 text-sm font-bold transition-colors hover:bg-white/15 flex justify-center items-center',
        )"
        v-html="clearAllSVG"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { twMerge } from "tailwind-merge";
import { waitForElement } from "@/utils";
import { AutodartsToolsConfig, defaultConfig } from "@/utils/storage";

const clearAllSVG = "<svg stroke=\"currentColor\" fill=\"currentColor\" stroke-width=\"0\" viewBox=\"0 0 24 24\" aria-hidden=\"true\" focusable=\"false\" height=\"1.3em\" width=\"1.3em\" xmlns=\"http://www.w3.org/2000/svg\"><path fill=\"none\" d=\"M0 0h24v24H0z\"></path><path d=\"M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z\"></path></svg>";

const config = ref();
const addUserInput = ref() as Ref<HTMLInputElement>;
const addUserButton = ref() as Ref<HTMLButtonElement>;
const recentUsersDiv = ref() as Ref<HTMLDivElement>;

watch(config, async () => {
  await AutodartsToolsConfig.setValue({
    ...JSON.parse(JSON.stringify(defaultConfig)),
    ...JSON.parse(JSON.stringify(config.value)),
  });
}, { deep: true });

onBeforeMount(async () => {
  config.value = await AutodartsToolsConfig.getValue();

  if (config.value.recentLocalPlayers.players.length > config.value.recentLocalPlayers.cap) {
    config.value.recentLocalPlayers.players = config.value.recentLocalPlayers.players.slice(0, config.value.recentLocalPlayers.cap);
  }
});

onMounted(async () => {
  try {
    // querySelector for `placeholder="Enter name for local player"`
    addUserInput.value = await waitForElement("input[placeholder=\"Enter name for local player\"]") as HTMLInputElement;
    if (!addUserInput.value) return;

    // get div that comes right after lobbyUserInput
    const lobbyUserInputParent = addUserInput.value.parentElement;
    if (!lobbyUserInputParent) return;

    // get first button in lobbyUserInputParent
    addUserButton.value = lobbyUserInputParent.querySelector("button") as HTMLButtonElement;
    if (!addUserButton.value) return;

    addUserButton.value.addEventListener("click", addUserToRecentPlayers);

    recentUsersDiv.value = lobbyUserInputParent.nextElementSibling as HTMLDivElement;

    // if recentUsersDiv and recentUsersDiv has more than one child -> for each button in recentUsersDiv log its textContent
    if (recentUsersDiv.value && recentUsersDiv.value.children.length > 1) {
      for (let i = 0; i < recentUsersDiv.value.children.length; i++) {
        const username = recentUsersDiv.value.children[i].textContent?.trim()?.toUpperCase();
        if (username) {
          // check if username is already in config.recentLocalPlayers, otherwise prepend it
          if (!config.value.recentLocalPlayers.players.includes(username)) {
            config.value.recentLocalPlayers.players.unshift(username);
          }
        }
      }
    }

    // hide recentUsersDiv
    recentUsersDiv.value.style.display = "none";
  } catch (e) {
    // silence is golden
  }
});

onBeforeUnmount(() => {
  if (addUserButton.value) {
    addUserButton.value.removeEventListener("click", addUserToRecentPlayers);
  }
});

function addUserToRecentPlayers(event: Event) {
  if (addUserInput.value && addUserInput.value.value) {
    const username = addUserInput.value.value.toUpperCase();
    if (!config.value.recentLocalPlayers.players.includes(username)) {
      config.value.recentLocalPlayers.players.unshift(username);
    }
  }
}

async function addUserToLobby(player: string) {
  if (addUserInput.value) {
    // simulate type into addUserInput
    addUserInput.value.value = player;
    addUserInput.value.dispatchEvent(new Event("input", { bubbles: true }));
    if (addUserButton.value) {
      addUserButton.value.removeAttribute("disabled");
      await nextTick();
      addUserButton.value.click();
    }
  }
}

function handleClearAll() {
  config.value.recentLocalPlayers.players = [];
  if (recentUsersDiv.value) {
    const clearAllButton = recentUsersDiv.value.lastElementChild as HTMLDivElement;
    clearAllButton.click();
  }
}
</script>
