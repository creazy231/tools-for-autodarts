import { computed } from "vue";

import type { TriggerFeature } from "@/utils/trigger-catalog";

import { t } from "@/utils/i18n";
import { TRIGGER_HINTS } from "@/utils/trigger-catalog";

/**
 * What the trigger field suggests for a feature: each of its triggers with the
 * line on when it goes off, in the language shown, so typing searches the words
 * on screen. It takes a getter for the feature, so it follows a prop, and `t()`
 * reads the language, so it follows a switch of it too.
 *
 *   const suggestions = useTriggerSuggestions(() => props.feature);
 *
 * Auto-imported, like useI18n. TriggerField.vue and UploadDialog.vue use it.
 */
export function useTriggerSuggestions(feature: () => TriggerFeature) {
  return computed(() => TRIGGER_HINTS[feature()].map(hint => ({ trigger: hint.trigger, description: t(hint.descriptionKey) })));
}
