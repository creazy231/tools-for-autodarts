<template>
  <!-- A sound's volume in its row, after where it comes from, when it is not the file's own. -->
  <template v-if="volume !== DEFAULT_VOLUME">
    <span aria-hidden="true" class="shrink-0">·</span>
    <span class="flex shrink-0 items-center gap-1 tabular-nums" :title="t('library.volume.playsAt', { volume })">
      <span aria-hidden="true" class="text-sm" :class="[icon]" />
      <span class="sr-only">{{ t("library.volume.label") }}</span>
      {{ volume }}%
    </span>
  </template>
</template>

<script setup lang="ts">
import type { ISound } from "@/utils/storage";

import { DEFAULT_VOLUME, soundVolume } from "@/utils/sound-volume";

const props = defineProps<{ sound: ISound }>();

const { t } = useI18n();

const volume = computed(() => soundVolume(props.sound));
const icon = computed(() => {
  if (volume.value === 0) return "icon-[material-symbols--volume-off-outline-rounded]";
  return volume.value > DEFAULT_VOLUME
    ? "icon-[material-symbols--volume-up-outline-rounded]"
    : "icon-[material-symbols--volume-down-outline-rounded]";
});
</script>
