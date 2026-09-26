<template>
  <!-- A settings row as the site's own settings pages draw them: what it is on the left, the control on the right. -->
  <div class="flex flex-col gap-3 border-b border-[var(--ad-border-subtle)] py-4 last:border-b-0" :class="[{ 'sm:flex-row sm:items-center sm:justify-between sm:gap-8': !stacked }]">
    <div class="min-w-0">
      <p class="text-sm font-bold text-[var(--ad-text-primary)]">
        {{ title }}
      </p>
      <p v-if="description || $slots.description" class="mt-1 max-w-2xl text-sm text-[var(--ad-text-muted)]">
        <slot name="description">
          {{ description }}
        </slot>
      </p>
    </div>
    <div :class="stacked ? 'w-full' : 'shrink-0'">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title: string;
  description?: string;
  /** The control under the text, at full width: for a field rather than a switch. */
  stacked?: boolean;
}>(), {
  description: undefined,
  stacked: false,
});
</script>
