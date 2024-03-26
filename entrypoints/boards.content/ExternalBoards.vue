<template>
  <div class="mt-16 space-y-6">
    <h2 class="text-4xl font-bold">
      External Boards
    </h2>
    <div v-if="config" class="grid grid-cols-2 gap-4">
      <div
        v-for="board in config.externalBoards.boards"
        :key="board.id"
        class="flex flex-col justify-between space-y-4 rounded-md bg-[#90cdf4]/10 p-5 shadow"
      >
        <h3 class="mb-4 truncate text-xl font-bold">
          {{ board.name }}
        </h3>
        <div class="flex items-center justify-between gap-1">
          <div>
            <AppButton
              @click="handleRemoveBoard(board.id)"
              auto
              class="aspect-square p-3"
              type="danger"
            >
              <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" aria-hidden="true" focusable="false" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0z" /><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
            </AppButton>
          </div>
          <div class="flex items-center gap-1">
            <AppButton
              @click="handleBoardStats(board.id)"
              auto
              class="aspect-square p-3"
            >
              <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" aria-hidden="true" focusable="false" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0z" /><path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z" /></svg>
            </AppButton>
            <AppButton
              @click="handleBoardFollow(board.id)"
              auto
              class="aspect-square p-3"
            >
              <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" aria-hidden="true" focusable="false" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0z" /><path fill-rule="evenodd" d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" /></svg>
            </AppButton>
          </div>
        </div>
      </div>

      <div class="space-y-4 rounded-md bg-[#90cdf4]/10 p-5 shadow">
        <div class="space-y-2">
          <input
            v-model="newBoard.name"
            type="text"
            placeholder="External Board Name"
            class="w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none"
          >
          <input
            v-model="newBoard.id"
            type="text"
            placeholder="External Board ID"
            class="w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none"
          >
        </div>
        <div class="flex items-center justify-between gap-1">
          <div />
          <div class="flex items-center gap-1">
            <AppButton
              @click="handleAddBoard"
              auto
              class="aspect-square p-2"
              type="success"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="m10 16.4l-4-4L7.4 11l2.6 2.6L16.6 7L18 8.4z" /></svg>
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppButton from "@/components/AppButton.vue";
import { AutodartsToolsConfig, defaultConfig } from "@/utils/storage";

const config = ref();

const newBoard = reactive({
  id: "",
  name: "",
});

watch(config, async () => {
  await AutodartsToolsConfig.setValue({
    ...JSON.parse(JSON.stringify(defaultConfig)),
    ...JSON.parse(JSON.stringify(config.value)),
  });
}, { deep: true });

onBeforeMount(async () => {
  config.value = await AutodartsToolsConfig.getValue();
});

async function handleAddBoard() {
  config.value.externalBoards.boards.push({
    id: newBoard.id,
    name: newBoard.name,
  });
}

function handleRemoveBoard(id: string) {
  config.value.externalBoards.boards = config.value.externalBoards.boards.filter(board => board.id !== id);
}

function handleBoardStats(id: string) {
  window.location.href = `/boards/${id}/stats`;
}

function handleBoardFollow(id: string) {
  window.location.href = `/boards/${id}/follow`;
}
</script>
