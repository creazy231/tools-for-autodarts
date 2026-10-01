<template>
  <span class="shrink-0 text-sm" :class="[icon]" />
  <span class="truncate">{{ text }}</span>
</template>

<script setup lang="ts">
import type { ISound } from "@/utils/storage";

const props = defineProps<{
  sound: ISound;
  voices: { value: string; label: string }[];
}>();

const { t } = useI18n();

const icon = computed(() => {
  if (props.sound.tts) return "icon-[material-symbols--record-voice-over-outline-rounded]";
  if (props.sound.soundId || props.sound.base64) return "icon-[material-symbols--audio-file-outline-rounded]";
  return "icon-[material-symbols--link-rounded]";
});

const text = computed(() => {
  const { tts, soundId, base64, url } = props.sound;
  if (tts) {
    const voice = props.voices.find(option => option.value === tts.voiceURI)?.label;
    return t("library.source.tts", { voice: voice ?? t("library.source.defaultVoice") });
  }
  if (soundId || base64) return t("library.source.uploaded");
  return url.replace(/^https?:\/\//, "") || t("library.source.none");
});
</script>
