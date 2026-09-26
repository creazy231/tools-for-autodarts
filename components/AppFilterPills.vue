<template>
  <!-- Tabs › PillTabs, as the site's Stats page draws them: filtering within one view. -->
  <div :aria-label="label" class="adt-pills" role="group">
    <button
      @click="emit('update:modelValue', option.value)"
      v-for="option in options"
      :key="option.value"
      :aria-pressed="modelValue === option.value"
      class="adt-pill"
      :class="[{ 'is-active': modelValue === option.value, 'is-empty': option.count === 0 }]"
      type="button"
    >
      {{ option.label }}
      <span v-if="option.count !== undefined" class="adt-pill-count">{{ option.count }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: string;
  options: { value: string; label: string; count?: number }[];
  label?: string;
}>(), {
  label: undefined,
});

const emit = defineEmits<{ "update:modelValue": [ value: string ] }>();
</script>
