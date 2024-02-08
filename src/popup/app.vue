<template>
  <div class="p-4 text-white">
    <TabGroup @change="onChange">
      <div class="space-y-4">
        <TabList class="flex space-x-4">
          <Tab v-for="page in pages" :key="page.path" v-slot="{ selected }" as="div" class="outline-none">
            <Button
              :icon-left="page.icon"
              :class="twMerge(
                selected && '!bg-primary !border-primary',
              )"
            >
              {{ page.name }}
            </Button>
          </Tab>
        </TabList>
        <RouterView />
      </div>
    </TabGroup>
  </div>
</template>

<script setup lang="ts">
import { Tab, TabGroup, TabList } from "@headlessui/vue";
import { twMerge } from "tailwind-merge";
import Button from "@/components/App/Button.vue";

const pages = [
  {
    name: "General",
    icon: "material-symbols:settings",
    path: "/",
  },
  {
    name: "Colors",
    icon: "material-symbols:colors",
    path: "/colors",
  },
];

const router = useRouter();

onMounted(() => {
  document.body.style.width = "480px";
  document.getElementsByTagName("html")[0].style.width = "480px";
});

function onChange(index: number) {
  router.push(pages[index].path);
}
</script>

<style>
html, body {
  width: 480px;
  margin: 0 auto;
}

html {
  background: #1A202C;
}

body {
  background: linear-gradient(217deg, rgba(32, 48, 81, 0.2), rgba(32, 48, 81, 0) 70.71%) fixed, linear-gradient(127deg, rgba(29, 113, 184, 0.2), rgba(29, 113, 184, 0) 70.71%), linear-gradient(336deg, rgba(46, 235, 248, 0.2), rgba(46, 235, 248, 0) 70.71%);
}
</style>
