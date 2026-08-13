import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { URL, fileURLToPath } from "node:url";

import { defineConfig } from "wxt";

const { version } = JSON.parse(readFileSync("./package.json", "utf8")) as { version: string };
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

/**
 * Devtools build: a normal production build that ALSO ships the DOM picker,
 * for installing locally in a real browser (`yarn build:devtools`).
 *
 * It is deliberately a separate target from `yarn build`, which is what CI
 * publishes to the stores. The picker must never reach store users, but it is
 * useless if it only exists in `yarn dev` — capturing the in-match DOM needs a
 * real browser, a real board and a real match.
 */
const DEVTOOLS = process.env.ADT_DEVTOOLS === "1";

// See https://wxt.dev/api/config.html
export default defineConfig({
  // Keep devtools builds out of .output/, so a store build and a local
  // devtools build can coexist and never overwrite each other.
  outDir: DEVTOOLS ? ".output-devtools" : ".output",
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
      // Only the DOM picker needs this, so store builds must not request it —
      // an unused permission is a needless prompt and a review flag.
      ...(DEVTOOLS ? [ "clipboardWrite" ] : []),
      // "background",
    ],
    background: {
      service_worker: "background.js",
      type: "module",
      persistent: false,
    },
    name: "Tools for Autodarts",
    description: "Tools for Autodarts enhances the gaming experience on autodarts.com",
    // Chrome surfaces version_name in chrome://extensions, so it is obvious at a
    // glance whether the installed copy is the store build or the devtools one.
    ...(DEVTOOLS ? { version_name: `${version}+devtools` } : {}),
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
  hooks: {
    /**
     * The DOM picker is a development tool. Its body is behind
     * `import.meta.env.DEV` so Vite strips the logic from production, but WXT
     * still emits the entrypoint and registers it — leaving ~14KB of inert
     * boilerplate injected into every page load, and an oddly-named content
     * script for store reviewers to wonder about. Drop it entirely instead.
     *
     * Keyed on the entrypoint name rather than an allow-list of the others, so
     * adding a new entrypoint never silently excludes it.
     */
    "build:manifestGenerated": (wxt, manifest) => {
      if (wxt.config.mode === "development" || DEVTOOLS) return;

      // WXT groups content scripts that share the same matches + runAt into a
      // single manifest entry, so the picker sits in the same entry as the real
      // content scripts. Strip only its path — dropping the whole entry would
      // silently unregister boards/content/lobby/lobbynew/match.
      for (const cs of manifest.content_scripts ?? []) {
        cs.js = cs.js?.filter(path => !path.includes("picker"));
      }
      manifest.content_scripts = manifest.content_scripts?.filter(cs => cs.js?.length);
      if (!manifest.content_scripts?.length) delete manifest.content_scripts;
    },
    "build:done": (wxt, output) => {
      if (wxt.config.mode === "development" || DEVTOOLS) return;
      const isPicker = (name: string) => name.includes("picker");

      // Drop the emitted file, and drop it from the build output too — WXT
      // stats every listed chunk when printing the build summary, so deleting
      // the file without this crashes the build with ENOENT.
      for (const step of output.steps) {
        for (const chunk of step.chunks.filter(c => isPicker(c.fileName))) {
          rmSync(join(wxt.config.outDir, chunk.fileName), { force: true });
        }
        // `output` is only shallowly readonly, so a step's chunk list can still
        // be replaced. Empty steps are harmless — the summary just skips them.
        step.chunks = step.chunks.filter(c => !isPicker(c.fileName));
      }
    },
  },
  vite: () => ({
    define: {
      // Gates the DOM picker. In `yarn dev` the picker's own
      // `import.meta.env.DEV` check covers it; this flag is what lets a
      // PRODUCTION build (yarn build:devtools) include it as well.
      __ADT_PICKER__: JSON.stringify(DEVTOOLS),
    },
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
