<template>
  <div class="flex items-center justify-between">
    <h1 class="text-3xl font-bold">
      Create Tournaments
    </h1>
    <AppButton
      @click="emit('close')"
      type="danger"
      auto
    >
      Abort
    </AppButton>
  </div>
  <div class="space-y-4 rounded border border-white/10 p-4">
    <div class="grid grid-cols-4 gap-4">
      <div class="col-span-2 space-y-2">
        <p>Name of the Tournament</p>
        <input
          v-model="tournamentData.name"
          type="text"
          class="w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none"
          placeholder="My awesome tournament"
        >
      </div>
      <div class="space-y-2">
        <p>Max Participants</p>
        <input
          v-model="tournamentData.maxParticipants"
          type="number"
          min="4"
          max="64"
          class="w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none"
          placeholder="32"
        >
      </div>
    </div>
    <div class="flex items-center justify-end">
      <AppButton
        @click="handleCreateTournament"
        type="success"
        auto
        :loading="loading"
      >
        Create Tournament
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { v4 as uuidv4 } from "uuid";
import { InMemoryDatabase } from "brackets-memory-db";
import { BracketsManager } from "brackets-manager";
import AppButton from "@/components/AppButton.vue";
import { head_link } from "@/utils/external";

const props = withDefaults(defineProps<{
  sub: string;
}>(), {
  // silence is golden
});

const emit = defineEmits([ "close" ]);

const storage = new InMemoryDatabase();
const manager = new BracketsManager(storage);

const loading = ref(false);

const tournamentData = reactive({
  tournament_id: uuidv4(),
  name: "",
  maxParticipants: null,
});

onBeforeMount(() => {
  head_link(browser.runtime.getURL("/tournaments/brackets-viewer.css"));
});

onBeforeUnmount(() => {
  document.querySelector(".brackets-viewer")?.remove();
});

async function handleCreateTournament() {
  try {
    loading.value = true;
    console.log("Creating tournament", tournamentData);
    await manager.create.stage({
      type: "single_elimination",
      tournamentId: tournamentData.tournament_id,
      name: tournamentData.name,
      seeding: [ "Team 1", "Team 2", "Team 3", "Team 4" ],
      settings: {
        size: tournamentData.maxParticipants as unknown as number,
      },
    });

    const tournament = await manager.get.tournamentData(tournamentData.tournament_id);
    console.log(tournament);

    if (!document.querySelector(".brackets-viewer")) {
      const bracketsViewer = document.createElement("div");
      bracketsViewer.classList.add("brackets-viewer");
      bracketsViewer.classList.add("css-gmuwbf");
      document.querySelector("#root > div > div:nth-of-type(2)")!.appendChild(bracketsViewer);
    }

    window.bracketsViewer.render({
      stages: tournament.stage,
      matches: tournament.match,
      matchGames: tournament.match_game,
      participants: tournament.participant,
    }, {
      clear: true,
    });

    console.log(await manager.export());
  } catch (error) {
    console.error("Failed to create tournament", error);
  } finally {
    loading.value = false;
  }
}
</script>
