<template>
  <Transition
    enter-active-class="transition duration-100 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-100 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div v-if="show" class="fixed inset-0 z-[1400] flex items-center justify-center p-4">
      <div @click="$emit('close')" class="adt-modal-backdrop" />
      <div :class="[ 'adt-modal relative', width === 'wide' && 'adt-modal-lg', width === 'widest' && 'adt-modal-xl' ]">
        <button
          @click="$emit('close')"
          class="adt-modal-close"
          type="button"
          aria-label="Close"
        >
          <span class="icon-[pixelarticons--close] text-lg" />
        </button>
        <div class="adt-modal-header">
          <h2 class="adt-modal-title">
            {{ title }}
          </h2>
        </div>
        <div class="adt-modal-body settings-content">
          <slot />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    required: true,
  },
  /**
   * Settings panels are denser than v2's own dialogs, so they get a wider
   * shell than the base modal. `widest` is for the panels that are a grid of
   * tiles plus a column of options — Caller and Sound FX — where the base
   * width leaves the tiles two to a row with nowhere to put the controls.
   *
   * This replaces a `wide` boolean that applied `max-w-4xl`, which never took
   * effect: see the width modifiers in assets/tailwind.css.
   */
  width: {
    type: String,
    default: "wide",
    validator: (value: string) => [ "default", "wide", "widest" ].includes(value),
  },
});

defineEmits([ "close" ]);
</script>

<style scoped>
/* v2 shows a thin, low-contrast scrollbar rather than the platform default. */
.settings-content::-webkit-scrollbar {
  width: 8px;
}

.settings-content::-webkit-scrollbar-track {
  background: transparent;
}

.settings-content::-webkit-scrollbar-thumb {
  background: var(--adt-border);
  border-radius: 4px;
}

.settings-content::-webkit-scrollbar-thumb:hover {
  background: var(--adt-overlay-strong);
}
</style>
