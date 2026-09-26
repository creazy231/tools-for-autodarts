<template>
  <!--
    Laid out by named grid areas (.adt-row in assets/tailwind.css): one line
    when there is room, and on a phone the name with its switch, the source
    under it, then the triggers with the actions, so nothing is squeezed to a
    few letters. A plain row is the name and its delete on one line.
  -->
  <div class="adt-row" :class="[{ 'is-off': !enabled, 'is-plain': plain }]">
    <span v-if="!plain" class="adt-drag-handle [grid-area:handle]" :class="[{ invisible: !draggable }]" aria-hidden="true" title="Drag to reorder">
      <span class="icon-[material-symbols--drag-indicator]" />
    </span>
    <div class="adt-row-dim [grid-area:lead]">
      <slot name="lead" />
    </div>
    <p :title="title" class="adt-row-dim truncate text-sm font-bold text-[var(--ad-text-primary)] [grid-area:title]">
      <template v-for="(part, index) in highlight(title, query)" :key="index">
        <mark v-if="part.match" class="adt-mark">{{ part.text }}</mark>
        <template v-else>
          {{ part.text }}
        </template>
      </template>
    </p>
    <p v-if="$slots.meta && !plain" class="adt-row-dim flex min-w-0 items-center gap-1.5 text-xs text-[var(--ad-text-muted)] [grid-area:meta]">
      <slot name="meta" />
    </p>
    <template v-if="!plain">
      <TriggerChips :query="query" :triggers="triggers" class="adt-row-dim [grid-area:chips]" />
      <AppSwitch
        @update:model-value="emit('toggle', $event)"
        :label="`${title}: ${enabled ? 'on' : 'off'}`"
        :model-value="enabled"
        class="justify-self-end [grid-area:switch]"
      />
    </template>
    <div class="flex items-center gap-0.5 justify-self-end [grid-area:actions]">
      <button @click="emit('edit')" v-if="!plain" :aria-label="`Edit ${title}`" class="adt-icon-btn" title="Edit" type="button">
        <span class="icon-[material-symbols--edit-outline-rounded]" />
      </button>
      <ConfirmDeleteButton @confirm="emit('delete')" :label="title" />
    </div>
  </div>
</template>

<script setup lang="ts">
import ConfirmDeleteButton from "./ConfirmDeleteButton.vue";
import TriggerChips from "./TriggerChips.vue";

import AppSwitch from "@/components/AppSwitch.vue";
import { highlight } from "@/utils/library-search";

withDefaults(defineProps<{
  title: string;
  triggers?: string[];
  enabled?: boolean;
  /** Whether the handle shows: not while a search narrows the list. */
  draggable?: boolean;
  query?: string;
  /**
   * Only the name and its delete, for a list with nothing to switch, edit or
   * reorder: the saved players. No handle, chips, switch, edit or meta line.
   */
  plain?: boolean;
}>(), {
  triggers: () => [],
  enabled: true,
  draggable: false,
  query: "",
  plain: false,
});

const emit = defineEmits<{ toggle: [ value: boolean ]; edit: []; delete: [] }>();
</script>
