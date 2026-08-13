<template>
  <!--
    Design system › Forms › Switch.

    A real switch rather than a pair of On/Off buttons: 48x24 track, 18px thumb
    inset 3px, blue when on, chip-strong when off. Styling lives in
    assets/tailwind.css so the track, thumb and transitions stay in one place.
  -->
  <button
    @click="toggle"
    :class="[ 'adt-switch', className ]"
    :style="scale"
    :aria-checked="props.modelValue"
    :disabled="props.disabled"
    type="button"
    role="switch"
  />
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: boolean;
  /** Kept for call-site compatibility; scales the 48x24 spec proportionally. */
  size?: "xs" | "sm" | "md";
  disabled?: boolean;
  className?: string;
}>(), {
  size: "md",
  disabled: false,
});

const emit = defineEmits([ "update:modelValue" ]);

/** The spec is a fixed 48x24; smaller call sites scale it rather than restyle. */
const scale = computed(() => {
  if (props.size === "md") return undefined;
  const factor = props.size === "xs" ? 0.75 : 0.875;
  return { transform: `scale(${factor})`, transformOrigin: "left center" };
});

function toggle() {
  if (props.disabled) return;
  emit("update:modelValue", !props.modelValue);
}
</script>
