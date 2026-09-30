<template>
  <!--
    Delete in two clicks: the bin turns into a red "Delete" laid over its
    neighbours for four seconds. No dialog to get through, but no loss from a
    stray click either. A delete also takes the stored file with it.

    Pressing the red button keeps focus where it is. Safari and Firefox on
    macOS take focus off a clicked button on mousedown, and that blur would
    disarm it before the click landed. Escape disarms it and goes no further:
    the dialog round it stays open.
  -->
  <span class="relative inline-flex">
    <button
      @click="arm"
      :aria-label="`Delete ${label}`"
      :class="glass ? 'adt-glass-btn' : 'adt-icon-btn is-danger'"
      title="Delete"
      type="button"
    >
      <span class="icon-[material-symbols--delete-outline-rounded]" />
    </button>
    <button
      @blur="disarm"
      @click="confirm"
      @keydown.esc.stop="disarm"
      @mousedown.prevent
      v-if="armed"
      ref="confirmButton"
      class="adt-confirm-delete"
      :class="[{ '!h-7': glass }]"
      type="button"
    >
      Delete
    </button>
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  /** What is deleted, for screen readers. */
  label: string;
  /** Over a picture. */
  glass?: boolean;
}>(), {
  glass: false,
});

const emit = defineEmits<{ confirm: [] }>();

const armed = ref(false);
const confirmButton = ref<HTMLButtonElement>();
let timer: ReturnType<typeof setTimeout> | undefined;

onBeforeUnmount(() => clearTimeout(timer));

async function arm() {
  armed.value = true;
  clearTimeout(timer);
  timer = setTimeout(disarm, 4000);
  await nextTick();
  confirmButton.value?.focus();
}

function disarm() {
  armed.value = false;
  clearTimeout(timer);
}

function confirm() {
  disarm();
  emit("confirm");
}
</script>
