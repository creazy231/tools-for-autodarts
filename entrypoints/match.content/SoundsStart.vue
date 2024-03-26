<template>
  <Transition
    enter-active-class="transition-opacity duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div @click="handleBackdropClick" v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center font-system">
      <div class="absolute inset-0 bg-black/50" />
      <div
        v-if="show"
        :class="twMerge(
          'z-10',
        )"
      >
        <div class="cursor-pointer rounded-md bg-[var(--chakra-colors-yellow-500)] px-6 py-3 text-3xl font-extrabold uppercase text-white">
          Start game
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { twMerge } from "tailwind-merge";
import "./styles.css";
import {
  AutodartsToolsSoundAutoplayStatus,
} from "@/utils/storage";
import { allowAudioAutoPlay } from "@/utils/helpers";

const show = ref<boolean>(false);

AutodartsToolsSoundAutoplayStatus.watch(() => {
  checkStatus().catch(console.error);
});

onMounted(async () => {
  checkStatus().catch(console.error);
});

async function checkStatus() {
  console.log("checkStsus");
  show.value = !await AutodartsToolsSoundAutoplayStatus.getValue();
}

async function handleBackdropClick() {
  await allowAudioAutoPlay();
  show.value = false;
}
</script>
