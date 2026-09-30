<template>
  <!--
    A name to tap, and when it can go, its ✕. Deleting takes two clicks, the
    second on the red "Delete" the chip turns into for four seconds, as the
    settings' deletes do (components/Settings/Library/ConfirmDeleteButton.vue).
    The red button keeps focus where it is: Safari and Firefox on macOS take
    focus off a clicked button on mousedown, which would disarm it first.
  -->
  <span class="adt-name-chip">
    <button
      @blur="disarm"
      @click="confirm"
      @keydown.esc="disarm"
      @mousedown.prevent
      v-if="armed"
      ref="confirmButton"
      class="adt-name-chip-confirm"
      type="button"
    >
      Delete {{ name }}
    </button>
    <template v-else>
      <button @click="emit('add')" :class="[{ 'has-forget': forgettable }]" :disabled="disabled" :title="team ? `On ${team}` : `Add ${name}`" class="adt-name-chip-add" type="button">
        {{ name }}<small v-if="team">{{ team }}</small>
      </button>
      <button @click="arm" v-if="forgettable" :aria-label="`Delete ${name}`" class="adt-name-chip-forget" title="Delete this name" type="button">
        <span class="icon-[material-symbols--close-rounded] size-4" aria-hidden="true" />
      </button>
    </template>
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  name: string;
  /** The other team the player is on, which greys the chip out. */
  team?: string;
  disabled?: boolean;
  /** Whether the name can be deleted: not while a saved team has it. */
  forgettable?: boolean;
}>(), {
  team: "",
  disabled: false,
  forgettable: false,
});

const emit = defineEmits<{ add: []; forget: [] }>();

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
  emit("forget");
}
</script>

<style scoped>
.adt-name-chip { position: relative; display: inline-flex; }
/* the saved-player chips, like the Saved players strip */
.adt-name-chip-add {
  display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px;
  border-radius: 10px; background: var(--ad-ink-750); color: var(--ad-text-primary);
  font-size: 13px; font-weight: 700;
}
.adt-name-chip-add.has-forget { padding-right: 32px; }
.adt-name-chip-add:hover:not(:disabled) { background: var(--ad-ink-700); }
.adt-name-chip-add:disabled { opacity: .4; cursor: not-allowed; }
.adt-name-chip-add small { font-size: 11px; font-weight: 600; color: var(--ad-text-muted); }
.adt-name-chip-forget {
  position: absolute; top: 4px; right: 4px; display: grid; place-items: center; width: 22px; height: 22px;
  border-radius: 7px; color: var(--ad-text-muted);
}
.adt-name-chip-forget:hover { color: var(--ad-rose-500); background: color-mix(in srgb, var(--ad-rose-500) 14%, transparent); }
.adt-name-chip-confirm {
  height: 30px; padding: 0 12px; border-radius: 10px; background: var(--ad-danger); color: var(--ad-white);
  font-size: 13px; font-weight: 700; white-space: nowrap;
}
.adt-name-chip-add:focus-visible, .adt-name-chip-forget:focus-visible, .adt-name-chip-confirm:focus-visible { outline: none; box-shadow: var(--ad-focus-ring); }
</style>
