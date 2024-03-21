<template>
  <Transition
    @before-leave="handleFinished"
    enter-active-class="transition-opacity duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-200 ease-in delay-1000"
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
        <div class="rounded-md bg-[var(--chakra-colors-yellow-500)] px-6 py-3 text-center text-3xl font-extrabold text-white">
          <div class="uppercase">
            Removing Darts...
          </div>
          <div
            :class="twMerge(
              'overflow-hidden text-2xl font-normal underline transition-all h-0',
              finished && 'h-8',
            )"
          >
            Finished
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { twMerge } from "tailwind-merge";
import { AutodartsToolsConfig } from "@/utils/storage";

const checkStatusInterval = ref<NodeJS.Timer>();
const takeoutInProgress = ref<boolean>(false);
const show = ref<boolean>(false);
const finished = ref<boolean>(false);

onMounted(async () => {
  console.log("timeout  onMounted");
  const config = await AutodartsToolsConfig.getValue();

  if (!config.takeout.enabled) {
    return;
  }

  checkStatus().catch(console.error);
  checkStatusInterval.value = setInterval(checkStatus, 250);
});

onBeforeUnmount(() => {
  clearInterval(checkStatusInterval.value);
});

watch(takeoutInProgress, () => {
  if (takeoutInProgress.value) {
    show.value = true;
  } else {
    finished.value = true;
    setTimeout(() => {
      show.value = false;
      setTimeout(() => {
        finished.value = false;
      }, 1000);
    }, 750);
  }
});

async function checkStatus() {
  console.log("timeout checkStatus");
  try {
    const status = document.querySelector("#root ul > div:nth-of-type(4) a")?.textContent;
    takeoutInProgress.value = status === "✊";
    // takeoutInProgress.value = status === "🔴";
  } catch (e) {
    // silence is golden
  }
}

async function handleBackdropClick() {
  clearInterval(checkStatusInterval.value);
  finished.value = true;
  await new Promise(resolve => setTimeout(resolve, 750));
  takeoutInProgress.value = false;
  await new Promise(resolve => setTimeout(resolve, 5000));
  checkStatusInterval.value = setInterval(checkStatus, 250);
}

async function handleFinished() {
  finished.value = true;
  await new Promise(resolve => setTimeout(resolve, 2000));
  finished.value = false;
}
</script>
