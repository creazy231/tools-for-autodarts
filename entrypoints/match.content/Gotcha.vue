<template>
  <span class="gotcha" v-if="show">{{ distance }}</span>
</template>

<script setup lang="ts">
import type { IGameData } from "@/utils/game-data-storage";
import { AutodartsToolsGameData } from "@/utils/game-data-storage";

const props = defineProps<{
  playerIndex: number;
}>();

const distance = ref<number | string | null>('BULL')
const show = ref<boolean>(false)

onMounted(async () => {
  console.log("Autodarts Tools: Gotcha: mounted");

  const unwatch = AutodartsToolsGameData.watch(async (gameData: IGameData, _previousGameData: IGameData) => {
    const match = gameData.match;
    if (!match || !match.gameScores) {
      show.value = false;
      return;
    }
    const d = match.gameScores[props.playerIndex] - match.gameScores[match.player];
    if (match.variant !== 'Gotcha' || d <= 0) {
      show.value = false;
      return;
    }
    distance.value = calculateDartThrow(d);
    show.value = true;
  });
  onUnmounted(() => {
    if (typeof unwatch === 'function') {
      unwatch();
    }
  });
});

function calculateDartThrow(targetScore: number): number | string {
  if (targetScore === 50) {
    return 'BULL';
  }
  if (targetScore <= 20 || targetScore === 25) {
    return `+${targetScore}`;
  }

  if (targetScore <= 40 && targetScore % 2 === 0) {
    return `D${targetScore / 2}`;
  }

  if (targetScore <= 60 && targetScore % 3 === 0) {
    return `T${targetScore / 3}`;
  }

  // Score is impossible with a single dart
  return `+${targetScore}`;
}
</script>

<style>
.gotcha {
  font-size: 3em;
  font-weight: 600;
  margin-top: 0;
}
</style>
