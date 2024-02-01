<template>
  <div class="space-y-4">
    <Radio
      v-model="enabled"
      :options="options"
    />
    <div v-if="colors" class="grid grid-cols-2 gap-4">
      <div
        @click="triggerColorPicker('background')"
        class="flex h-14 w-full cursor-pointer select-none items-center justify-center rounded-md"
        :style="{
          backgroundColor: colors.background,
        }"
      >
        <span class="rounded-md bg-[#3182ce] px-2 py-1 text-white">Score Background</span>
      </div>
      <div
        @click="triggerColorPicker('text')"
        class="flex h-14 w-full cursor-pointer select-none items-center justify-center rounded-md bg-primary"
        :style="{
          backgroundColor: colors.text,
        }"
      >
        <span class="rounded-md bg-[rgba(255,255,255,0.92)] px-2 py-1 text-black">Score Text</span>
      </div>
    </div>

    <input
      @change="onColorChange"
      ref="colorPickerElement"
      class="hidden"
      type="color"
    >
  </div>
</template>

<script setup>
const { get, set } = useLocalStorage();

const options = [
  {
    name: "Enabled",
    value: true,
  },
  {
    name: "Disabled",
    value: false,
  },
];

const colorPickerElement = ref();

const canWatch = ref(false);
const colors = ref();
const enabled = ref();
const colorPickerKey = ref("");

onMounted(async () => {
  colors.value = await get("colors");
  enabled.value = options.find(option => option.value === colors.value.enabled);

  canWatch.value = true;
});

watch(enabled, async () => {
  if (!canWatch) return;

  await set("colors", {
    ...colors.value,
    enabled: enabled.value.value,
  });
});

function triggerColorPicker(key) {
  colorPickerKey.value = key;
  colorPickerElement.value.click();
}

async function onColorChange(event) {
  const key = colorPickerKey.value;
  const color = event.target.value;
  colors.value = {
    ...colors.value,
    [key]: color,
  };
  await set("colors", colors.value);
}
</script>
