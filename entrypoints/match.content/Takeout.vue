<template>
  <div>
    <div v-if="takeout">
      {{ takeout }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { AutodartsToolsBoardStatus, type TBoardStatus } from "@/utils/storage";

const takeout = ref<TBoardStatus>(undefined);

AutodartsToolsBoardStatus.watch(async (boardstatus: TBoardStatus) => {
  takeout.value = boardstatus;
});

onBeforeMount(async () => {
  console.log("takeout onBeforeMount");
});

onMounted(async () => {
  console.log("takeout onMounted");
});

onBeforeUnmount(() => {
  console.log("takeout onBeforeUnmount");
});
</script>
