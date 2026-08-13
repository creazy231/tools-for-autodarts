import { URL, fileURLToPath } from "node:url";

import { defineConfig } from "wxt";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Component from "unplugin-vue-components/vite";
import RadixVueResolver from "radix-vue/resolver";
import { ViteMcp } from "vite-plugin-mcp";

// See https://wxt.dev/api/config.html
export default defineConfig({
  // runner: { // Deprecated in v0.20
  //   startUrls: [ "https://play.autodarts.io/" ],
  // },
  webExt: {
    startUrls: [ "https://play.autodarts.com/", "https://play.autodarts.io/" ],
  },
  modules: [ "@wxt-dev/webextension-polyfill" ],
  imports: {
    presets: [ "vue" ],
    addons: {
      vueTemplate: true,
    },
  },
  manifest: {
    host_permissions: [
      "*://play.autodarts.com/*",
      "*://play.autodarts.io/*",
      "*://api.autodarts.com/*",
      "*://api.autodarts.io/*",
      "*://login.autodarts.com/*",
      "*://login.autodarts.io/*",
      "*://boards.ws.autodarts.com/*",
      "*://boards.ws.autodarts.io/*",
      "*://darts-downloads.peschi.org/*",
      "*://autodarts.x10.mx/*",
      "*://adt-socket.tobias-thiele.de/*",
      "*://discord.com/api/webhooks/*",
    ],
    permissions: [
      "storage",
      // "background",
    ],
    background: {
      service_worker: "background.js",
      type: "module",
      persistent: false,
    },
    name: "Tools for Autodarts",
    description: "Tools for Autodarts enhances the gaming experience on autodarts.com",
    // content_scripts: [
    //   {
    //     matches: [ "*://play.autodarts.io/*" ],
    //     js: [ "dart-zoom.js" ],
    //   },
    // ],
    // web_accessible_resources: [ {
    //   resources: [ "dart-zoom.js" ],
    //   matches: [ "<all_urls>" ],
    // } ],
    web_accessible_resources: [
      {
        resources: [ "images/*" ],
        matches: [ "*://play.autodarts.io/*", "*://play.autodarts.com/*" ],
      },
      {
        resources: [ "websocket-capture.js", "auth-cookie.js" ],
        matches: [ "*://play.autodarts.io/*", "*://play.autodarts.com/*" ],
      },
    ],
  },
  dev: {
    reloadCommand: "Alt+T",
  },
  vite: () => ({
    server: {
      watch: {
        usePolling: true,
      },
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./", import.meta.url)),
        "~": fileURLToPath(new URL("./", import.meta.url)),
        "src": fileURLToPath(new URL("./", import.meta.url)),
      },
    },
    plugins: [
      vue(),
      ViteMcp(),

      AutoImport({
        imports: [
          "vue",
          "vue-router",
          "vue/macros",
          "@vueuse/core",
          {
            "#imports": [
              "browser",
              "defineBackground",
              "defineContentScript",
              "createShadowRootUi",
              "defineUnlistedScript",
              "storage",
              "injectScript",
              "defineUnlistedScript",
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
    build: {
      minify: "esbuild",
      target: "esnext",
      esbuild: {
        drop: [ "console", "debugger" ],
      },
    },
  }),
});
