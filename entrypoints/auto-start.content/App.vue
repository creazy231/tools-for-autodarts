<template>
  <div />
</template>

<script setup lang="ts">
import { waitForElement } from "@/utils";

const autostartEnabled = ref(false);
const checkAutoStartInterval = ref();

onMounted(async () => {
  try {
    const buttonsContainer = await waitForElement("#root > div > div:nth-of-type(2) > div > div > div:nth-of-type(3) > div") as HTMLDivElement;
    const button = buttonsContainer.children[0].cloneNode(true) as HTMLButtonElement;

    if (button.innerText !== "Start") return;

    button.innerText = "Autostart OFF";
    button.style.color = "var(--chakra-colors-green-500)";
    button.style.color = "var(--chakra-colors-red-500)";

    button.addEventListener("click", () => {
      button.textContent = button.textContent === "Autostart ON" ? "Autostart OFF" : "Autostart ON";
      button.style.color = button.textContent === "Autostart ON" ? "var(--chakra-colors-green-500)" : "var(--chakra-colors-red-500)";
      autostartEnabled.value = !autostartEnabled.value;

      if (autostartEnabled.value) {
        checkAutoStartInterval.value = setInterval(checkAutoStart, 1000);
      } else {
        clearInterval(checkAutoStartInterval.value);
      }
    });

    buttonsContainer.appendChild(button);
  } catch (e) {
    // silence is golden
  }
});

onBeforeUnmount(() => {
  clearInterval(checkAutoStartInterval.value);
});

async function checkAutoStart() {
  const rows = document.querySelectorAll("#root > div > div:nth-of-type(2) > div > div > div:nth-of-type(2) > div > table > tbody > tr");
  if (rows.length > 1) {
    await new Promise(resolve => setTimeout(resolve, 3000));

    const buttons = document.querySelectorAll("button") as NodeList;
    const startButton = Array.from(buttons).find(button => button.textContent === "Start");
    startButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    clearInterval(checkAutoStartInterval.value);
  }
}
</script>
