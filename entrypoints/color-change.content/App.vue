<template>
  <div />
</template>

<script setup lang="ts">
import { waitForElement } from "@/utils";
import { AutodartsToolsConfig } from "@/utils/storage";

const colorChangeInterval = ref();

onMounted(async () => {
  handleChangeColor().catch(console.error);
  colorChangeInterval.value = setInterval(handleChangeColor, 500);
});

onBeforeUnmount(() => {
  clearInterval(colorChangeInterval.value);
});

async function handleChangeColor() {
  try {
    const config = await AutodartsToolsConfig.getValue();

    const elements: HTMLElement[] = [];

    const playerDisplay = await waitForElement("#ad-ext-player-display") as HTMLElement;
    const playerScores = playerDisplay.querySelectorAll(".ad-ext-player");

    playerScores.forEach(element => elements.push(element as HTMLElement));

    const playerNames = playerDisplay.querySelectorAll("a");
    playerNames.forEach(element => elements.push(element as HTMLElement));

    const turnThrows = document.querySelector("#ad-ext-turn")?.childNodes;
    if (turnThrows) turnThrows.forEach(element => elements.push(element as HTMLElement));

    // for each in elements set variable: `--chakra-colors-blue-500: red;`
    elements.forEach((element) => {
      element.style.setProperty("--chakra-colors-blue-500", config.colors.background);
      element.style.color = `${config.colors.text}`;
    });
  } catch (e) {
    // silence is golden
  }
}
</script>
