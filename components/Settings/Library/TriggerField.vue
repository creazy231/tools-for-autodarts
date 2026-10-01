<template>
  <div>
    <div class="adt-field-label justify-between">
      <label :for="id">{{ label ?? t("library.triggers.label") }}</label>
      <a
        :href="TRIGGER_DOCS[feature]"
        class="text-xs font-semibold text-[var(--ad-blue-300)] hover:text-white"
        rel="noopener noreferrer"
        target="_blank"
      >
        {{ t("triggers.allTriggers") }}
      </a>
    </div>
    <AppTokenInput
      :id="id"
      v-model="triggers"
      :placeholder="t('library.triggers.placeholder')"
      :suggestions="suggestions"
      :validate="validate"
    />
    <p v-if="error" class="adt-field-hint !text-[var(--ad-rose-500)]" role="alert">
      {{ error }}
    </p>
    <p class="adt-field-hint">
      {{ patternLine }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { TriggerFeature } from "@/utils/trigger-catalog";

import AppTokenInput from "@/components/AppTokenInput.vue";
import { TRIGGER_DOCS, TRIGGER_HINTS, TRIGGER_PATTERN_KEYS } from "@/utils/trigger-catalog";

const props = withDefaults(defineProps<{
  feature: TriggerFeature;
  id: string;
  /** Left out, the field says "Triggers" in the current language. */
  label?: string;
  validate?: (trigger: string) => string;
  /** Said under the field, in red, when saving finds something missing. */
  error?: string;
}>(), {
  label: undefined,
  validate: undefined,
  error: "",
});

const triggers = defineModel<string[]>({ required: true });

const { t } = useI18n();

/** The feature's trigger hints with their lines in the language shown, so typing searches the words on screen. */
const suggestions = computed(() => TRIGGER_HINTS[props.feature].map(hint => ({ trigger: hint.trigger, description: t(hint.descriptionKey) })));
const patternLine = computed(() => t(TRIGGER_PATTERN_KEYS[props.feature]));
</script>
