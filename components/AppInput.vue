<template>
  <div>
    <label v-if="label" :for="id" class="adt-field-label">{{ label }}</label>
    <!--
      A leading icon goes in the `icon` slot rather than being laid over the
      field by the caller — see the group styles in assets/tailwind.css for why
      that never lined up. Keep the glyph a literal `icon-[…]` class at the call
      site: Iconify generates only the names it can find in the source.
    -->
    <div class="adt-input-group">
      <span v-if="$slots.icon" class="adt-input-icon">
        <slot name="icon" />
      </span>
      <!--
        Everything but the class reaches the field itself: `min`, `step` and
        listeners were dropped on the floor while inheritAttrs was off. `size`
        stays behind too: several callers pass `size="sm"`, which never did
        anything here, and the field's own size attribute takes a number.
      -->
      <input
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        v-bind="_.omit($attrs, 'class', 'size')"
        :id="id"
        :value="modelValue"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :class="twMerge(
          // Design system › Forms › TextField
          'adt-input placeholder:text-[var(--ad-text-muted)]',
          dense && 'adt-input-sm',
          $slots.icon && 'adt-input-has-icon',
          disabled && 'cursor-not-allowed',
          $attrs.class?.toString(),
        )"
      >
    </div>
    <p v-if="helperText" class="adt-field-hint">
      {{ helperText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { twMerge } from "tailwind-merge";
import _ from "lodash";

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(defineProps<{
  modelValue: string;
  label?: string;
  placeholder?: string;
  helperText?: string;
  id?: string;
  type?: string;
  disabled?: boolean;
  /** A denser field, for a number in a settings row, instead of the spec's 52px. */
  dense?: boolean;
}>(), {
  placeholder: "",
  id: `input-${Math.random().toString(36).substring(2, 9)}`,
  type: "text",
  disabled: false,
  dense: false,
});

defineEmits([ "update:modelValue" ]);
</script>
