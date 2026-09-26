<template>
  <!-- The site's search field, as in its friends drawer: a light pill on the dark surface. -->
  <div class="adt-search">
    <span class="adt-search-icon icon-[material-symbols--search-rounded]" />
    <input
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @keydown.esc="clear"
      ref="input"
      :aria-label="placeholder"
      :placeholder="placeholder"
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
      aria-label="Clear the search"
      class="adt-search-clear"
      title="Clear"
      type="button"
    >
      <span class="icon-[material-symbols--close-rounded]" />
    </button>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: string;
  placeholder?: string;
}>(), {
  placeholder: "Search",
});

const emit = defineEmits<{ "update:modelValue": [ value: string ] }>();

const input = ref<HTMLInputElement>();

function clear() {
  emit("update:modelValue", "");
  input.value?.focus();
}

defineExpose({ focus: () => input.value?.focus() });
</script>
