<template>
  <AppModal @close="emit('close')" :show="show" :title="editing ? 'Edit sound' : 'Add a sound from a link'" ghost-close>
    <div class="space-y-5">
      <div v-if="hasFile" class="flex items-center gap-3 rounded-[var(--ad-radius-lg)] bg-white/[.04] p-3">
        <PlayButton @click="emit('play')" :playing="playing" label="this sound" />
        <div class="min-w-0">
          <p class="text-sm font-bold text-white">
            Uploaded file
          </p>
          <p class="text-xs text-[var(--ad-text-muted)]">
            Kept in this browser. Its name and triggers can be changed here.
          </p>
        </div>
      </div>
      <div v-else>
        <label class="adt-field-label" for="sound-url">Link to the sound</label>
        <div class="flex items-center gap-2">
          <div class="min-w-0 flex-1">
            <AppInput id="sound-url" v-model="url" placeholder="https://example.com/sound.mp3" type="url">
              <template #icon>
                <span class="icon-[material-symbols--link-rounded]" />
              </template>
            </AppInput>
          </div>
          <PlayButton @click="emit('play')" :disabled="!url" :playing="playing" label="the link" large />
        </div>
        <p v-if="urlError" class="adt-field-hint !text-[var(--ad-rose-500)]">
          {{ urlError }}
        </p>
        <p v-else class="adt-field-hint">
          An MP3, WAV or OGG file, on a link that starts with https://.
        </p>
      </div>

      <div>
        <VolumeField v-model="volume">
          <template #hint>
            100% is the file as it is. Up to 200% makes a quiet one louder.
          </template>
        </VolumeField>
        <AppAlert v-if="louderBlocked" class="mt-3" compact variant="warning">
          This link's site doesn't let the extension read the file, so it plays at 100% at most. To make it louder,
          upload the file instead.
        </AppAlert>
      </div>

      <AppInput id="sound-name" v-model="name" label="Name" placeholder="Optional: shown in the list" />

      <TriggerField id="sound-triggers" v-model="triggers" :feature="feature" />
    </div>

    <template #footer>
      <AppButton @click="emit('close')" auto>
        Cancel
      </AppButton>
      <AppButton @click="emit('save')" auto type="primary">
        {{ editing ? "Save" : "Add sound" }}
      </AppButton>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import PlayButton from "./PlayButton.vue";
import TriggerField from "./TriggerField.vue";
import VolumeField from "./VolumeField.vue";

import type { TriggerFeature } from "@/utils/trigger-catalog";

import AppAlert from "@/components/AppAlert.vue";
import AppButton from "@/components/AppButton.vue";
import AppInput from "@/components/AppInput.vue";
import AppModal from "@/components/AppModal.vue";

withDefaults(defineProps<{
  show: boolean;
  editing: boolean;
  /** An uploaded sound, whose file is kept and whose link field is hidden. */
  hasFile: boolean;
  feature: TriggerFeature;
  urlError?: string;
  playing?: boolean;
  /** Set above 100% on a link whose file the extension cannot read, which then plays at 100% at most. */
  louderBlocked?: boolean;
}>(), {
  urlError: "",
  playing: false,
  louderBlocked: false,
});
const emit = defineEmits<{ close: []; save: []; play: [] }>();
const name = defineModel<string>("name", { required: true });
const url = defineModel<string>("url", { required: true });
const triggers = defineModel<string[]>("triggers", { required: true });
const volume = defineModel<number>("volume", { required: true });
</script>
