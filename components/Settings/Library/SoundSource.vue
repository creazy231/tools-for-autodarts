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

const icon = computed(() => {
  if (props.sound.tts) return "icon-[material-symbols--record-voice-over-outline-rounded]";
  if (props.sound.soundId || props.sound.base64) return "icon-[material-symbols--audio-file-outline-rounded]";
  return "icon-[material-symbols--link-rounded]";
});

const text = computed(() => {
  const { tts, soundId, base64, url } = props.sound;
  if (tts) {
    const voice = props.voices.find(option => option.value === tts.voiceURI)?.label;
    return `Text to speech · ${voice ?? "default voice"}`;
  }
  if (soundId || base64) return "Uploaded file";
  return url.replace(/^https?:\/\//, "") || "No source";
});
</script>
