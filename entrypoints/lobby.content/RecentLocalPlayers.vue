<template>
  <div v-if="players.length" class="mt-4 border-t border-white/10 pt-4">
    <p class="mb-2 text-xs font-bold uppercase tracking-wide text-white/50">
      Saved players
    </p>
    <div class="flex flex-wrap gap-2">
      <AppButton
        @click="onAdd(name)"
        v-for="name in players"
        :key="name"
        :loading="pending === name"
        :disabled="pending !== null"
        size="sm"
        auto
      >
        {{ name }}
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

import type { Ref } from "vue";

import AppButton from "@/components/AppButton.vue";

/**
 * The list lives in recent-local-players.ts, which keeps it in sync with the
 * site's own store. Passing the ref rather than a copy means the strip follows
 * along when a name is added through the site's own dialog.
 */
const props = defineProps<{
  names: Ref<string[]>;
  add: (name: string) => Promise<boolean>;
}>();

const state = props.names;
const players = computed(() => state.value);

/** Which chip is mid-request; also blocks the rest, since adds are ordered. */
const pending = ref<string | null>(null);

async function onAdd(name: string) {
  if (pending.value !== null) return;
  pending.value = name;
  try {
    await props.add(name);
  } finally {
    pending.value = null;
  }
}
</script>
