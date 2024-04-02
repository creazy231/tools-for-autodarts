import { URL, fileURLToPath } from "node:url";
import { defineConfig } from "wxt";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Component from "unplugin-vue-components/vite";
import RadixVueResolver from "radix-vue/resolver";

// See https://wxt.dev/api/config.html
export default defineConfig({
  runner: {
    startUrls: [ "https://play.autodarts.io/" ],
  },
  imports: {
    presets: [ "vue" ],
    addons: {
      vueTemplate: true,
    },
  },
  manifest: {
    host_permissions: [ "*://play.autodarts.io/*" ],
    permissions: [ "storage", "cookies" ],
    name: "Autodarts Tools",
    description: "Autodarts Tools enhances the gaming experience on autodarts.io",
    web_accessible_resources: [
      {
        matches: [ "*://play.autodarts.io/*" ],
        resources: [ "tournaments/*.js", "tournaments/*.css" ],
      },
    ],
  },
  dev: {
    reloadCommand: "Alt+T",
  },
  vite: () => ({
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./", import.meta.url)),
        "~": fileURLToPath(new URL("./", import.meta.url)),
        "src": fileURLToPath(new URL("./", import.meta.url)),
      },
    },
    plugins: [
      vue(),

      AutoImport({
        imports: [
          "vue",
          "vue-router",
          "vue/macros",
          "@vueuse/core",
          {
            wxt: [
              "browser",
              "defineBackground",
              "defineContentScript",
              "createShadowRootUi",
              "createIntegratedUi",
            ],
          },
        ],
        dts: "auto-imports.d.ts",
        dirs: [ "composables/" ],
      }),

      Component({
        dts: true,
        resolvers: [
          RadixVueResolver(),
        ],
      }),
    ],
  }),
});
