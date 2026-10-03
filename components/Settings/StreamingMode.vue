<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div v-if="config" class="adt-container">
      <div class="relative z-10 pr-2 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          {{ t("streamingMode.intro") }}
        </p>

        <section class="mb-10">
          <h3 class="adt-section-title">
            {{ t("streamingMode.sections.scoreboard") }}
          </h3>
          <OptionRow :description="t('streamingMode.design.description')" :title="t('streamingMode.design.title')">
            <AppRadioGroup v-model="config.streamingMode.design" :aria-label="t('streamingMode.design.title')" :options="DESIGNS" button-size="sm" />
          </OptionRow>
          <OptionRow :description="t('streamingMode.throws.description')" :title="t('streamingMode.throws.title')">
            <AppToggle v-model="config.streamingMode.throws" :aria-label="t('streamingMode.throws.title')" size="sm" />
          </OptionRow>
          <OptionRow :description="t('streamingMode.checkout.description')" :title="t('streamingMode.checkout.title')">
            <AppToggle v-model="config.streamingMode.checkout" :aria-label="t('streamingMode.checkout.title')" size="sm" />
          </OptionRow>
          <OptionRow :description="t('streamingMode.averages.description')" :title="t('streamingMode.averages.title')">
            <AppToggle v-model="config.streamingMode.avg" :aria-label="t('streamingMode.averages.title')" size="sm" />
          </OptionRow>
          <OptionRow :description="t('streamingMode.footer.description')" :title="t('streamingMode.footer.title')" stacked>
            <AppInput
              id="streaming-footer"
              v-model="config.streamingMode.footerText"
              :aria-label="t('streamingMode.footer.title')"
              :placeholder="t('streamingMode.footerDefault')"
            />
          </OptionRow>
        </section>

        <section class="mb-10">
          <h3 class="adt-section-title">
            {{ t("streamingMode.sections.board") }}
          </h3>
          <OptionRow :description="t('streamingMode.showBoard.description')" :title="t('streamingMode.showBoard.title')">
            <AppToggle v-model="config.streamingMode.board" :aria-label="t('streamingMode.showBoard.title')" size="sm" />
          </OptionRow>
          <OptionRow
            v-if="config.streamingMode.board"
            :description="t('streamingMode.boardView.description')"
            :title="t('streamingMode.boardView.title')"
          >
            <AppRadioGroup v-model="config.streamingMode.boardImage" :aria-label="t('streamingMode.boardView.ariaLabel')" :options="BOARD_VIEWS" button-size="sm" />
          </OptionRow>
        </section>

        <section class="mb-10">
          <h3 class="adt-section-title">
            {{ t("streamingMode.sections.background") }}
          </h3>
          <OptionRow :description="t('streamingMode.background.description')" :title="t('streamingMode.background.title')">
            <AppRadioGroup v-model="config.streamingMode.backgroundImage" :aria-label="t('streamingMode.background.title')" :options="BACKGROUNDS" button-size="sm" />
          </OptionRow>
          <OptionRow v-if="!config.streamingMode.backgroundImage" :description="t('streamingMode.colour.description')" :title="t('streamingMode.colour.title')">
            <div class="flex items-center gap-3">
              <span class="text-sm uppercase tabular-nums text-[var(--ad-text-muted)]">{{ config.streamingMode.chromaKeyColor }}</span>
              <input
                v-model="config.streamingMode.chromaKeyColor"
                :aria-label="t('streamingMode.colour.ariaLabel')"
                class="adt-color-input size-9 shrink-0"
                type="color"
              >
            </div>
          </OptionRow>
          <OptionRow v-else :description="t('streamingMode.image.description')" :title="t('streamingMode.image.title')">
            <div class="flex items-center gap-2">
              <img
                v-if="config.streamingMode.image"
                :alt="t('streamingMode.image.alt')"
                :src="config.streamingMode.image"
                class="h-12 w-20 rounded-[var(--ad-radius-sm)] object-cover ring-1 ring-inset ring-[var(--ad-border-strong)]"
              >
              <AppButton @click="streamingModeBackgroundFileSelect.click()" auto size="sm">
                <span class="flex items-center gap-1.5">
                  <span class="icon-[material-symbols--upload-rounded] text-base" />
                  {{ config.streamingMode.image ? t("streamingMode.image.replace") : t("streamingMode.image.upload") }}
                </span>
              </AppButton>
              <ConfirmDeleteButton @confirm="config.streamingMode.image = ''" v-if="config.streamingMode.image" :label="t('streamingMode.backgroundImage')" />
            </div>
            <input @change="handleStreamingModeBackgroundFileSelected" ref="streamingModeBackgroundFileSelect" accept="image/*" class="hidden" type="file">
          </OptionRow>
        </section>

        <section>
          <h3 class="adt-section-title">
            {{ t("streamingMode.sections.layout") }}
          </h3>
          <OptionRow
            :description="t('streamingMode.positions.description')"
            :title="t('streamingMode.positions.title')"
          >
            <AppButton @click="handleResetPositions" auto size="sm">
              {{ t("streamingMode.positions.reset") }}
            </AppButton>
          </OptionRow>
        </section>
      </div>
    </div>
  </template>

  <template v-else>
    <!-- Feature Card -->
    <div
      v-if="config"
      class="adt-container adt-interactive h-full min-h-56"
    >
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <h3 class="mb-1 flex items-center adt-card-title">
            {{ t("features.streamingMode") }}
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>

          <p class="w-2/3 text-white/70">
            {{ t("streamingMode.card") }}
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'streaming-mode')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle
            @update:model-value="toggleFeature"
            v-model="config.streamingMode.enabled"
          />
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" :alt="t('features.streamingMode')" class="size-full object-cover">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppButton from "../AppButton.vue";
import AppInput from "../AppInput.vue";
import AppRadioGroup from "../AppRadioGroup.vue";
import AppToggle from "../AppToggle.vue";

import ConfirmDeleteButton from "./Library/ConfirmDeleteButton.vue";
import OptionRow from "./Library/OptionRow.vue";

const emit = defineEmits([ "toggle" ]);

const { t } = useI18n();

// The other skin is called Autodarts, which is the site's name in every language.
const DESIGNS = computed(() => [
  { label: t("streamingMode.design.options.classic"), value: "classic" },
  { label: "Autodarts", value: "v2" },
]);
/** `boardImage` is the camera's picture when true, autodarts' drawn board when false. */
const BOARD_VIEWS = computed(() => [
  { label: t("streamingMode.boardView.options.camera"), value: true },
  { label: t("streamingMode.boardView.options.drawn"), value: false },
]);
const BACKGROUNDS = computed(() => [
  { label: t("streamingMode.background.options.chromaKey"), value: false },
  { label: t("streamingMode.background.options.image"), value: true },
]);

const { config } = useConfig();
const streamingModeBackgroundFileSelect = ref() as Ref<HTMLInputElement>;
const imageUrl = browser.runtime.getURL("/images/streaming-mode.png");

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.streamingMode.enabled;
  config.value.streamingMode.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "streaming-mode");
  }
}

function handleStreamingModeBackgroundFileSelected() {
  const file = streamingModeBackgroundFileSelect.value.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    if (config.value) {
      config.value.streamingMode.image = reader.result as string;
    }
  };
  reader.readAsDataURL(file);

  streamingModeBackgroundFileSelect.value.value = "";
}

async function handleResetPositions() {
  if (!config.value) return;

  // Reset coordinates and scoreboard positions and scales to default values
  config.value.streamingMode.coordsSettings = {
    scale: 1,
    x: 0,
    y: 0,
  };

  config.value.streamingMode.scoreBoardSettings = {
    scale: 1,
    x: 0,
    y: 0,
  };
}
</script>
