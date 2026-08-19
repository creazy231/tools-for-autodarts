import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
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

/**
 * Reference build: the stable extension restricted to v1, built so it can sit
 * next to the v2-only dev build in the same browser during the migration.
 * `yarn dev` loads it automatically (see webExt.chromiumArgs below), giving one
 * browser where v1 behaves normally and v2 is whatever you are working on.
 *
 * It carries the DOM picker too, since capturing the v1 side of a feature is
 * half the porting workflow.
 */
const REFERENCE = process.env.ADT_REFERENCE === "1";

/**
 * `ADT_FAKE_CAMERA=1 yarn dev` hands the dev browser a synthetic webcam.
 *
 * Instant Replay records whatever camera you point at your board, and there is
 * no way to exercise it without one — worse, macOS refuses Chrome the camera
 * outright unless it has been granted in System Settings, which no amount of
 * granting inside the browser can get around. Chrome will generate a stream
 * instead, which is enough to drive the whole feature: it records, it plays,
 * and the picture is a rolling test pattern rather than a dartboard.
 *
 * Off by default, and dev only — `yarn build` never sees it.
 */
const FAKE_CAMERA = process.env.ADT_FAKE_CAMERA === "1";

/** Both extra build targets ship the picker. */
const WITH_PICKER = DEVTOOLS || REFERENCE;

/**
 * Whether this build has its logging stripped.
 *
 * Only what the stores get. `yarn dev` obviously needs its console, and so do
 * the devtools and reference builds — they are production builds that exist to
 * be debugged in a real browser against a real board, which is exactly the
 * situation where the log is the only thing you have.
 */
const stripLogging = (mode: string) => mode !== "development" && !WITH_PICKER;

const HOSTS: "v1" | "v2" | "both" = REFERENCE ? "v1" : "both";

const REFERENCE_OUT = resolve(".output-reference", "chrome-mv3");

if (!REFERENCE && !existsSync(REFERENCE_OUT)) {
  console.warn(
    "\n  No v1 reference build found — `yarn dev` will open with v2 only.\n"
    + "  Run `yarn build:reference` once to also get v1 working in that browser.\n",
  );
}

// See https://wxt.dev/api/config.html
export default defineConfig({
  // Each target gets its own output directory so a store build, a local
  // devtools build and the v1 reference build never overwrite each other.
  outDir: REFERENCE ? ".output-reference" : DEVTOOLS ? ".output-devtools" : ".output",
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
    //
    // The v1 reference build is side-loaded over CDP instead — see
    // scripts/load-reference-extension.mjs. Chrome 137+ ignores
    // --load-extension, and web-ext already passes its own --disable-features
    // list, so overriding that from here would fight with it.
    chromiumArgs: [
      "--remote-debugging-port=9222",
      ...(FAKE_CAMERA ? [ "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream" ] : []),
    ],
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
      ...(WITH_PICKER ? [ "clipboardWrite" ] : []),
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
    ...(WITH_PICKER ? { version_name: `${version}+${REFERENCE ? "reference" : "devtools"}` } : {}),
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
     * Two jobs.
     *
     * 1. Host scoping. Content-script `matches` come from
     *    utils/content-script-matches.ts, but host_permissions and
     *    web_accessible_resources are declared here, so they need the same
     *    treatment: `yarn dev` drops v1, the reference build drops v2. Without
     *    this a build holds permissions for a site the other build owns.
     *
     * 2. Removing the picker from store builds. Its body is already stripped by
     *    Vite, but WXT still emits and registers the entrypoint — ~14KB of inert
     *    boilerplate injected on every page load, and an oddly-named content
     *    script for store reviewers to wonder about.
     */
    "build:manifestGenerated": (wxt, manifest) => {
      const dropHost = wxt.config.mode === "development"
        ? "//play.autodarts.com"
        : REFERENCE ? "//play-v2.autodarts.com" : null;

      if (dropHost) {
        const keep = (h: string) => !h.includes(dropHost);
        manifest.host_permissions = manifest.host_permissions?.filter(keep);
        for (const war of manifest.web_accessible_resources ?? []) {
          if (typeof war === "object" && "matches" in war && Array.isArray(war.matches)) {
            war.matches = war.matches.filter(keep);
          }
        }
      }

      // Builds that ship the picker keep it; only store builds strip it.
      if (wxt.config.mode === "development" || WITH_PICKER) return;

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
      if (wxt.config.mode === "development" || WITH_PICKER) return;
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
  vite: env => ({
    /*
     * Strip `console.*` and `debugger` from store builds.
     *
     * `esbuild` is a TOP-LEVEL Vite option, not a `build.*` one. It used to sit
     * nested inside `build`, where nothing reads it, so the drop never happened
     * and every published build shipped its logging whole — 416 `console.log`
     * calls in the 3.0.1 Chrome build, some of them naming lobby and match ids.
     * Nesting it fails silently, which is why it went unnoticed for so long.
     */
    ...(stripLogging(env.mode) ? { esbuild: { drop: [ "console", "debugger" ] } } : {}),
    define: {
      // Gates the DOM picker. In `yarn dev` the picker's own
      // `import.meta.env.DEV` check covers it; this flag is what lets a
      // PRODUCTION build (yarn build:devtools) include it as well.
      __ADT_PICKER__: JSON.stringify(WITH_PICKER),
      // Which autodarts hosts this build claims — see utils/content-script-matches.ts
      __ADT_HOSTS__: JSON.stringify(HOSTS),
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
    },
  }),
});
