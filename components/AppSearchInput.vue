<template>
  <!-- The site's search field, as in its friends drawer: a light pill on the dark surface. -->
  <div class="adt-search">
    <span class="adt-search-icon icon-[material-symbols--search-rounded]" />
    <input
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @keydown.esc="clear"
      ref="input"
      :aria-label="shown"
      :placeholder="shown"
      :value="modelValue"
      autocapitalize="off"
      autocomplete="off"
      class="adt-search-input"
      spellcheck="false"
      type="search"
    >
    <button
      @click="clear"
      v-if="modelValue"
      :aria-label="t('common.clearSearch')"
      class="adt-search-clear"
      :title="t('common.clear')"
      type="button"
    >
      <span class="icon-[material-symbols--close-rounded]" />
    </button>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string;
  /** What the field is for. Left out, it says "Search" in the current language. */
  placeholder?: string;
}>(), {
  placeholder: undefined,
});

const emit = defineEmits<{ "update:modelValue": [ value: string ] }>();

const { t } = useI18n();

const input = ref<HTMLInputElement>();

const shown = computed(() => props.placeholder ?? t("common.search"));

function clear() {
  emit("update:modelValue", "");
  input.value?.focus();
}

defineExpose({ focus: () => input.value?.focus() });
</script>
