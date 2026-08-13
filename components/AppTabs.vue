<template>
  <!--
    Design system › Tabs › NavTabs — "underline tabs for switching views inside
    a page". The four Tools tabs do exactly that, so they use this rather than
    PillTabs, which the system reserves for filtering within a single view.

    No pill background: the active tab is bold and full-contrast with a 2px
    white rule, matching the site's own "Upcoming / Running / Finished".
  -->
  <nav class="adt-tabs w-full overflow-x-auto">
    <button
      @click="updateActiveTab(index)"
      v-for="(tab, index) in tabs"
      :key="index"
      :class="[ 'adt-tab whitespace-nowrap', { 'is-active': activeTab === index } ]"
      :aria-selected="activeTab === index"
      type="button"
      role="tab"
    >
      {{ tab }}
    </button>
  </nav>
</template>

<script setup lang="ts">
const props = defineProps<{
  tabs: string[];
  modelValue: number;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: number): void;
}>();

const activeTab = computed(() => props.modelValue);

function updateActiveTab(index: number) {
  emit("update:modelValue", index);
}
</script>
