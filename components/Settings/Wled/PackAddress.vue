<template>
  <div>
    <AppInput id="wled-pack-address" v-model="address" :label="t('wled.packs.device.label')" :placeholder="ADDRESS_EXAMPLE">
      <template #icon>
        <span class="icon-[material-symbols--router-outline-rounded]" />
      </template>
    </AppInput>
    <p aria-live="polite" class="adt-field-hint flex items-center gap-1.5" :class="[warns ? '!text-[var(--ad-warning)]' : '']">
      <span v-if="reading" aria-hidden="true" class="icon-[material-symbols--progress-activity] shrink-0 motion-safe:animate-spin" />
      {{ text }}
    </p>
  </div>
</template>

<script setup lang="ts">
import AppInput from "../../AppInput.vue";

defineProps<{
  /** The line under the field: what answered at the address, or how to start. */
  text: string;
  reading: boolean;
  /** Said as a warning: nothing answered there, or not a matrix. */
  warns: boolean;
}>();

/** An example address: the same in every language. */
const ADDRESS_EXAMPLE = "192.168.0.69";

/** The WLED's address as typed, which the packs dialog reads and tries. */
const address = defineModel<string>({ required: true });

const { t } = useI18n();
</script>
