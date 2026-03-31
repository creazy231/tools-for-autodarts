import { ref, onMounted, onBeforeUnmount } from "vue";
import { useStorage } from "@vueuse/core";

export interface TTSVoiceOption {
  value: string;
  label: string;
  lang: string;
}

const STORAGE_KEY_VOICE = "adt:tts-voice";
const STORAGE_KEY_RATE = "adt:tts-rate";
const STORAGE_KEY_PITCH = "adt:tts-pitch";

export function useTTS() {
  const voices = ref<TTSVoiceOption[]>([]);
  const isTTSAvailable = ref(false);
  const isSpeaking = ref(false);

  // Persist last-used TTS settings across sessions
  const lastVoiceURI = useStorage(STORAGE_KEY_VOICE, "");
  const lastRate = useStorage(STORAGE_KEY_RATE, 1);
  const lastPitch = useStorage(STORAGE_KEY_PITCH, 1);

  function loadVoices() {
    if (!window.speechSynthesis) return;
    const rawVoices = speechSynthesis.getVoices();
    voices.value = rawVoices.map(v => ({
      value: v.voiceURI,
      label: `${v.name} (${v.lang})`,
      lang: v.lang,
    }));
    isTTSAvailable.value = voices.value.length > 0;
  }

  onMounted(() => {
    if (!window.speechSynthesis) {
      isTTSAvailable.value = false;
      return;
    }
    loadVoices();
    speechSynthesis.addEventListener("voiceschanged", loadVoices);
  });

  onBeforeUnmount(() => {
    stopPreview();
    if (window.speechSynthesis) {
      speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    }
  });

  function preview(text: string, voiceURI: string, rate: number, pitch: number) {
    if (!window.speechSynthesis || !text) return;

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    // Chrome bug: calling speak() immediately after cancel() can cause the
    // voice to be ignored and the default voice used instead. A small delay
    // between cancel() and speak() avoids this.
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = speechSynthesis.getVoices().find(v => v.voiceURI === voiceURI);
      if (voice) utterance.voice = voice;
      utterance.rate = rate;
      utterance.pitch = pitch;

      utterance.onend = () => { isSpeaking.value = false; };
      utterance.onerror = () => { isSpeaking.value = false; };

      isSpeaking.value = true;
      speechSynthesis.speak(utterance);
    }, 50);
  }

  function stopPreview() {
    if (window.speechSynthesis) {
      speechSynthesis.cancel();
    }
    isSpeaking.value = false;
  }

  function saveDefaults(voiceURI: string, rate: number, pitch: number) {
    lastVoiceURI.value = voiceURI;
    lastRate.value = rate;
    lastPitch.value = pitch;
  }

  return {
    voices,
    isTTSAvailable,
    isSpeaking,
    lastVoiceURI,
    lastRate,
    lastPitch,
    preview,
    stopPreview,
    saveDefaults,
  };
}
