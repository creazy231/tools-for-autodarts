import { mkdirSync } from "node:fs";
import { URL, fileURLToPath } from "node:url";

import { defineConfig } from "wxt";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Component from "unplugin-vue-components/vite";
import RadixVueResolver from "radix-vue/resolver";
import { ViteMcp } from "vite-plugin-mcp";

// chrome-launcher opens a log file inside the profile directory but does not
// create the directory itself, so `yarn dev` fails with a confusing ENOENT if
// it is missing. The directory is gitignored, so it is absent on fresh clones.
const CHROMIUM_PROFILE = ".chrome-profile-dev";
mkdirSync(CHROMIUM_PROFILE, { recursive: true });

// See https://wxt.dev/api/config.html
export default defineConfig({
  // runner: { // Deprecated in v0.20
  //   startUrls: [ "https://play.autodarts.com/" ],
  // },
  webExt: {
    // v2 first: it is the migration target. v1 opens alongside it for
    // side-by-side comparison. See docs/v2-migration-map.md.
    startUrls: [
      "https://play-v2.autodarts.com/",
      "https://play.autodarts.com/",
    ],
    // Persist the profile so the autodarts login survives dev-server restarts
    // instead of needing a fresh sign-in on every `yarn dev`.
    chromiumProfile: CHROMIUM_PROFILE,
    keepProfileChanges: true,
    // Expose CDP so Playwright and the MCP servers in .mcp.json can drive this
    // exact browser - the one WXT is hot-reloading. Without this you end up
    // debugging a different browser than the one your edits land in.
    chromiumArgs: [ "--remote-debugging-port=9222" ],
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
      // v2 rebuild preview — see docs/v2-migration-map.md
      "*://play-v2.autodarts.com/*",
      "*://api.autodarts.com/*",
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
    //     matches: [ "*://play.autodarts.com/*" ],
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
        matches: [ "*://play.autodarts.com/*", "*://play-v2.autodarts.com/*" ],
      },
      {
        resources: [ "websocket-capture.js", "auth-cookie.js" ],
        matches: [ "*://play.autodarts.com/*", "*://play-v2.autodarts.com/*" ],
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
