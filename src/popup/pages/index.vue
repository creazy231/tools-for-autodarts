<template>
  <div v-if="settings">
    <Radio
      v-model="extendLobbies"
      :options="extendLobbiesOptions"
    />
    <p class="mt-2 opacity-50">
      Enabling this feature will enable debug mode for this browser. An info bar will may be displayed at the top of the page. This is used to reduce the amount of requests sent to the server.
    </p>
  </div>
</template>

<script setup>
const { get, set } = useLocalStorage();

const extendLobbiesOptions = [
  {
    name: "Enabled",
    value: true,
  },
  {
    name: "Disabled",
    value: false,
  },
];

const canWatch = ref(false);
const settings = ref();
const extendLobbies = ref();

onMounted(async () => {
  settings.value = await get("settings");
  extendLobbies.value = extendLobbiesOptions.find(option => option.value === settings.value.extendLobbies);

  canWatch.value = true;
});

watch(extendLobbies, async () => {
  if (!canWatch) return;

  await set("settings", {
    ...settings.value,
    extendLobbies: extendLobbies.value.value,
  });
});
</script>
