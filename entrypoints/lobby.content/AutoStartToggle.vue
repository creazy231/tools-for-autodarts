<template>
  <!--
    Injected beside the lobby's own Start Game button, so it names itself
    rather than relying on a heading the way the settings cards do. `lg` is
    the 48px segment size, which is the height of Start Game.
  -->
  <AppToggle
    v-model="armed"
    off-label="Autostart Off"
    on-label="Autostart On"
    size="lg"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";

import type { Ref } from "vue";

import AppToggle from "@/components/AppToggle.vue";

/**
 * The ref belongs to auto-start.ts rather than to this component: the lobby
 * re-renders often enough that the UI gets torn down and remounted, and the
 * arming decision has to outlive that.
 */
const props = defineProps<{ armed: Ref<boolean> }>();

/** Held separately so writing to it is a write to the ref, not to a prop. */
const state = props.armed;

const armed = computed({
  get: () => state.value,
  set: (value: boolean) => { state.value = value; },
});
</script>
