<template>
  <div class="flex min-w-0 gap-1.5" :class="[wrap ? 'flex-wrap' : 'flex-nowrap overflow-hidden']">
    <span
      v-for="(trigger, index) in visible"
      :key="`${index}-${trigger}`"
      class="adt-chip"
      :class="[{ 'is-match': isMatch(trigger) }]"
      :title="trigger"
    >
      <span class="truncate">{{ trigger }}</span>
    </span>
    <span v-if="hidden.length" :title="hidden.join(', ')" class="adt-chip is-more">+{{ hidden.length }}</span>
    <span v-if="!triggers.length" class="adt-chip is-warning" title="Without a trigger it never plays">No trigger</span>
  </div>
</template>

<script setup lang="ts">
import { triggerMatches } from "@/utils/library-search";

const props = withDefaults(defineProps<{
  triggers: string[];
  query?: string;
  /** Chips shown before the rest fold into "+n". */
  max?: number;
  wrap?: boolean;
}>(), {
  query: "",
  max: 4,
  wrap: true,
});

/** While searching, what the search found goes first, so it is never folded away. */
const ordered = computed(() => {
  if (!props.query.trim()) return props.triggers;
  return [ ...props.triggers ].sort((a, b) => Number(isMatch(b)) - Number(isMatch(a)));
});
const visible = computed(() => ordered.value.slice(0, props.max));
const hidden = computed(() => ordered.value.slice(props.max));

function isMatch(trigger: string): boolean {
  return triggerMatches(trigger, props.query);
}
</script>
