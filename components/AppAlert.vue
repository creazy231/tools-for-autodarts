<template>
  <!--
    Design system › Feedback › Alert. Four semantic tones, each filled with its
    own colour at 14% over the card surface plus a 1px ring at 30%.

    Body copy stays neutral: the tone is carried by the icon, fill and ring,
    never by the text. `title` + body for anything the user must act on;
    `compact` (single line, no title) for status inside a card or a form row.
  -->
  <div
    :class="[
      'adt-alert',
      `adt-alert-${variant}`,
      { 'is-compact': compact, 'is-untitled': !title },
    ]"
    :role="variant === 'error' ? 'alert' : 'status'"
  >
    <span v-if="glyph" :class="[ 'adt-alert-icon', glyph ]" />
    <div class="adt-alert-body">
      <span v-if="title" class="adt-alert-title">{{ title }}</span>
      <span v-if="$slots.default" class="adt-alert-text">
        <slot />
      </span>
    </div>
    <span v-if="$slots.action" class="adt-alert-action">
      <slot name="action" />
    </span>
  </div>
</template>

<script setup lang="ts">
/**
 * The system's icons are FontAwesome solid; these are the Iconify equivalents
 * the extension already ships. They always inherit the tone colour.
 */
const TONE_ICONS = {
  success: "icon-[material-symbols--check-circle-rounded]",
  error: "icon-[material-symbols--error-rounded]",
  warning: "icon-[material-symbols--warning-rounded]",
  info: "icon-[material-symbols--info-rounded]",
} as const;

const props = withDefaults(defineProps<{
  variant?: keyof typeof TONE_ICONS;
  title?: string;
  /** An Iconify class to override the tone's icon, or `null` for none. */
  icon?: string | null;
  compact?: boolean;
}>(), {
  variant: "info",
  compact: false,
});

const glyph = computed(() => (props.icon === undefined ? TONE_ICONS[props.variant] : props.icon));
</script>
