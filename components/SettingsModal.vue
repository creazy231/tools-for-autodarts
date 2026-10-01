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
      <div :class="[ 'adt-modal relative', width === 'wide' && 'adt-modal-lg', width === 'widest' && 'adt-modal-xl', fill && 'adt-modal-fill' ]">
        <button
          @click="$emit('close')"
          class="adt-modal-close"
          type="button"
          :aria-label="t('common.close')"
        >
          <span class="icon-[pixelarticons--close] text-lg" />
        </button>
        <div class="adt-modal-header">
          <h2 class="adt-modal-title">
            {{ title }}
          </h2>
        </div>
        <div class="adt-modal-body">
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
   * shell than the base modal. `widest` is for the panels that need the room:
   * Colors, with its preview beside the controls, and the libraries of
   * Animations, Caller, Sound FX and WLED, whose rows or tiles and options
   * would otherwise be squeezed.
   *
   * This replaces a `wide` boolean that applied `max-w-4xl`, which never took
   * effect: see the width modifiers in assets/tailwind.css.
   */
  width: {
    type: String,
    default: "wide",
    validator: (value: string) => [ "default", "wide", "widest" ].includes(value),
  },
  /**
   * Take the full height the dialog may have, whatever the content. For the
   * panels with a searchable list: a search that narrowed the list shrank a
   * content-sized dialog, which is centred, so it jumped with every key.
   */
  fill: {
    type: Boolean,
    default: false,
  },
});

defineEmits([ "close" ]);

const { t } = useI18n();
</script>

<!--
  The thin scrollbar this used to declare for itself now lives on
  `.adt-modal-body` in assets/tailwind.css, so every dialog gets it rather than
  only this one.
-->
