<template>
  <div>
    <div v-if="editMode">
      editMode
    </div>
  </div>
</template>

<script setup lang="ts">
import { AutodartsToolsMatchStatus, type IMatchStatus } from "@/utils/storage";

const editMode = ref(false);

AutodartsToolsMatchStatus.watch(async (matchStatus: IMatchStatus) => {
  editMode.value = matchStatus.isInEditMode;
});

onBeforeMount(async () => {
  // console.log("caller onBeforeMount");
});

onMounted(async () => {
  // console.log("caller onMounted");
});

onBeforeUnmount(() => {
  // console.log("caller onBeforeUnmount");
});
</script>
