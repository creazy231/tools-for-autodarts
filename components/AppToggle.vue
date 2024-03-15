<template>
  <Switch
    v-model="enabled"
    :class="enabled ? 'h-8 bg-cyan-600 border border-cyan-600' : 'h-8 bg-white/5 border border-white/10'"
    class="relative inline-flex size-full w-20 items-center rounded"
  >
    <span
      :class="enabled ? 'translate-x-12' : 'translate-x-1.5'"
      class="inline-block size-6 rounded bg-white transition"
    />
    <span
      :class="enabled ? 'text-sm -translate-x-4' : 'text-sm translate-x-5'"
    >
      {{ enabled ? textOn : textOff }}
    </span>
  </Switch>
</template>

<script setup lang="ts">
import { Switch } from "@headlessui/vue";

const props = withDefaults(defineProps<{
  modelValue?: boolean;
  textOn?: string;
  textOff?: string;
}>(), {
  modelValue: false,
  textOn: "ON",
  textOff: "OFF",
});

const emit = defineEmits([ "update:modelValue" ]);

const enabled = ref(props.modelValue);

watch(enabled, (value) => {
  emit("update:modelValue", value);
});
</script>
