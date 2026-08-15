<template>
  <div v-if="configVisible" id="autodarts-tools-config" class="mx-auto w-full p-4 pr-8 lg:pr-4">
    <PageConfig />
  </div>
</template>

<script setup lang="ts">
import { initV2Menu, openToolsPage } from "./v2-menu";
import { setToolsOverlayOpen } from "./tools-overlay";

import PageConfig from "@/components/PageConfig.vue";
import { waitForElement } from "@/utils";
import { SELECTORS } from "@/utils/selectors";
import { AutodartsToolsConfig, AutodartsToolsUrlStatus, defaultConfig } from "@/utils/storage";

let observer = new MutationObserver(() => {});
let teardownMenu: (() => void) | undefined;
const currentUrl = ref();
const configVisible = ref(false);
const isConfigPage = ref(true);
const lastVisitedUrl = useStorage("adt:last-visited-url", "");

watch(currentUrl, async (newURL, oldURL) => {
  lastVisitedUrl.value = newURL;

  // Only update AutodartsToolsUrlStatus if URL starts with https
  if (newURL && newURL.startsWith("https")) {
    await AutodartsToolsUrlStatus.setValue(newURL.split("#")[0] || "undefined");
  }

  if (newURL !== oldURL && oldURL) {
    useGlobalEvent("url:changed", newURL);

    if (newURL.includes("/tools") && !configVisible.value) {
      configVisible.value = true;
    } else if (!newURL.includes("/tools") && configVisible.value) {
      configVisible.value = false;
    }
  }
});

/**
 * Hide the site's own content while the settings overlay is up.
 *
 * Restoring means putting back whatever `display` the element had, which is
 * usually no inline style at all — v2's content container is a plain `block`
 * and forcing `flex` on it silently changes the page layout after the overlay
 * closes. The previous value is stashed on the element so an element that
 * genuinely carried an inline display keeps it.
 */
watch(configVisible, async () => {
  // `main` clips instead of scrolling, so the overlay carries its own scroller
  // while it is open. See tools-overlay.ts.
  setToolsOverlayOpen(configVisible.value);

  const pageContentElement = await waitForElement(SELECTORS.app.contentRoot, 15000);
  const contentElements = Array.from(pageContentElement.children).filter(el => el.tagName !== "AUTODARTS-TOOLS-WXT") as HTMLElement[];

  contentElements.forEach((el) => {
    if (configVisible.value) {
      if (el.dataset.adtPrevDisplay === undefined) el.dataset.adtPrevDisplay = el.style.display;
      el.style.display = "none";
    } else {
      const previous = el.dataset.adtPrevDisplay;
      if (previous) el.style.display = previous;
      else el.style.removeProperty("display");
      delete el.dataset.adtPrevDisplay;
    }
  });
});

onMounted(async () => {
  const url = await AutodartsToolsUrlStatus.getValue();
  const wasLastInTools = lastVisitedUrl.value.includes("/tools");

  /**
   * This is a workaround to fix the url not being set correctly
   * when the page is loaded.
   */
  AutodartsToolsUrlStatus.setValue("");
  await nextTick();
  AutodartsToolsUrlStatus.setValue(url);

  currentUrl.value = "";
  await nextTick();
  currentUrl.value = window.location.href;
  isConfigPage.value = url.includes("/tools") || wasLastInTools;

  if (isConfigPage.value) {
    window.history.pushState(null, "", "/tools");

    await nextTick();

    isConfigPage.value = false;
  }

  startObserver();

  // Adds "Tools for Autodarts" to the user drawer, and keeps adding it — the
  // drawer is rebuilt from scratch every time it opens.
  teardownMenu = initV2Menu(openTools);

  const config = await AutodartsToolsConfig.getValue();
  await AutodartsToolsConfig.setValue({
    ...JSON.parse(JSON.stringify(defaultConfig)),
    ...JSON.parse(JSON.stringify(config)),
  });
});

onBeforeUnmount(() => {
  observer.disconnect();
  window.removeEventListener("popstate", syncUrl);
  teardownMenu?.();
});

/** Opens the settings overlay from the drawer entry. */
function openTools() {
  configVisible.value = true;
  openToolsPage();
  /**
   * pushState fires no popstate and mutates no DOM, so nothing else would tell
   * `currentUrl` that we are now on /tools. Leaving it stale breaks going back:
   * the URL returns to the value the ref still holds, the watcher sees no
   * change, and the overlay stays open over a hidden page.
   */
  syncUrl();
}

function syncUrl() {
  if (window.location.href !== currentUrl.value) {
    currentUrl.value = window.location.href;
  }
}

function startObserver() {
  const targetNode = document.getElementById("root");
  if (!targetNode) {
    console.error("Target node not found");
    return;
  }
  observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") syncUrl();
    }
  });
  observer.observe(targetNode, { childList: true, subtree: true });

  /**
   * Back/forward must be observed directly.
   *
   * The overlay opens by pushState without routing, so the page underneath
   * never re-renders — and going back may not re-render it either. A DOM
   * mutation is therefore not guaranteed, and without this the URL leaves
   * /tools while the overlay stays open and the site's content stays hidden.
   */
  window.addEventListener("popstate", syncUrl);
}
</script>
