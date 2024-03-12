<template>
  <div v-if="configVisible" id="autodarts-tools-config" class="mx-auto w-full max-w-[1366px] p-4">
    <PageConfig />
  </div>
</template>

<script setup lang="ts">
import PageConfig from "@/components/PageConfig.vue";
import { waitForElement } from "@/utils";
import { AutodartsToolsConfig, defaultConfig } from "@/utils/storage";

let observer = new MutationObserver(() => {});
const currentUrl = ref();
const configVisible = ref(false);
const isConfigPage = ref(true);

watch(currentUrl, async (newURL, oldURL) => {
  const config = await AutodartsToolsConfig.getValue();
  await AutodartsToolsConfig.setValue({
    ...defaultConfig,
    ...config,
    url: newURL,
  });

  if (newURL !== oldURL && oldURL) {
    console.log("URL changed", newURL);
    useGlobalEvent("url:changed", newURL);

    if (newURL.includes("/tools") && !configVisible.value) {
      configVisible.value = true;
    } else if (!newURL.includes("/tools") && configVisible.value) {
      configVisible.value = false;
    }
  }
});

watch(configVisible, async () => {
  const pageContentElement = await waitForElement("#root > div > div:nth-of-type(2)");
  const contentElements = Array.from(pageContentElement.children).filter(el => el.tagName !== "AUTODARTS-TOOLS-WXT") as HTMLElement[];

  if (configVisible.value) {
    contentElements.forEach((el) => {
      el.style.display = "none";
    });
  } else {
    contentElements.forEach((el) => {
      el.style.display = "flex";
    });
  }
});

onMounted(async () => {
  await nextTick();
  currentUrl.value = window.location.href;
  isConfigPage.value = window.location.href.includes("/tools");

  if (isConfigPage.value) {
    const settingsButton = document.querySelector("a[href='/settings']") as HTMLAnchorElement | null;
    settingsButton?.click();

    window.history.pushState(null, "", "/tools");

    await nextTick();

    isConfigPage.value = false;
  }

  startObserver();

  const menu = await waitForElement("#root > div > div > .chakra-stack");
  // get last element of the menu
  const menuItemTemplate = menu.lastElementChild;
  if (!menuItemTemplate) return;

  const menuItem = menuItemTemplate.cloneNode(true) as HTMLElement;
  menuItem.removeAttribute("href");
  const withText = menuItem.innerText.length > 0;
  menuItem.innerHTML = "";
  menuItem.style.cursor = "pointer";

  menuItem.innerHTML += "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M8.8 21H5q-.825 0-1.412-.587T3 19v-3.8q1.2 0 2.1-.762T6 12.5q0-1.175-.9-1.937T3 9.8V6q0-.825.588-1.412T5 4h4q0-1.05.725-1.775T11.5 1.5q1.05 0 1.775.725T14 4h4q.825 0 1.413.588T20 6v4q1.05 0 1.775.725T22.5 12.5q0 1.05-.725 1.775T20 15v4q0 .825-.587 1.413T18 21h-3.8q0-1.25-.787-2.125T11.5 18q-1.125 0-1.912.875T8.8 21\"/></svg>";

  if (withText) {
    menuItem.innerHTML += "Tools";
    menuItem.querySelector("svg")!.style.marginRight = "0.5rem";
  }

  menuItem.addEventListener("click", () => {
    configVisible.value = true;

    const settingsButton = document.querySelector("a[href='/settings']") as HTMLAnchorElement | null;
    settingsButton?.click();

    window.history.pushState(null, "", "/tools");
  });

  menu.appendChild(menuItem);
});

function startObserver() {
  console.log("Observer started");
  const targetNode = document.getElementById("root");
  if (!targetNode) {
    console.error("Target node not found");
    return;
  }
  observer = new MutationObserver((mutationsList, observer2) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        if (window.location.href !== currentUrl.value) {
          currentUrl.value = window.location.href;
        }
      }
    }
  });
  observer.observe(targetNode, { childList: true, subtree: true });
}
</script>
