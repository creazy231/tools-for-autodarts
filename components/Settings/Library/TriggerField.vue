<template>
  <div>
    <div class="adt-field-label justify-between">
      <label :for="id">{{ label }}</label>
      <a
        :href="TRIGGER_DOCS[feature]"
        class="text-xs font-semibold text-[var(--ad-blue-300)] hover:text-white"
        rel="noopener noreferrer"
        target="_blank"
      >
        All triggers
      </a>
    </div>
    <AppTokenInput
      :id="id"
      v-model="triggers"
      :suggestions="TRIGGER_HINTS[feature]"
      :validate="validate"
      placeholder="Type a trigger and press Enter"
    />
    <p v-if="error" class="adt-field-hint !text-[var(--ad-rose-500)]" role="alert">
      {{ error }}
    </p>
    <p class="adt-field-hint">
      {{ TRIGGER_PATTERNS[feature] }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { TriggerFeature } from "@/utils/trigger-catalog";

import AppTokenInput from "@/components/AppTokenInput.vue";
import { TRIGGER_DOCS, TRIGGER_HINTS, TRIGGER_PATTERNS } from "@/utils/trigger-catalog";

withDefaults(defineProps<{
  feature: TriggerFeature;
  id: string;
  label?: string;
  validate?: (trigger: string) => string;
  /** Said under the field, in red, when saving finds something missing. */
  error?: string;
}>(), {
  label: "Triggers",
  validate: undefined,
  error: "",
});

const triggers = defineModel<string[]>({ required: true });
</script>
