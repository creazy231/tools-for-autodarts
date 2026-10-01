# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A browser extension (Chrome, Firefox, Safari/iOS) that enhances the gaming experience on autodarts.com. Built with **Vue 3**, **TypeScript**, **TailwindCSS**, and **WXT** (Web Extension Toolkit). Distributed via Chrome Web Store, Firefox Add-ons, App Store, and AltStore.

## Commands

```bash
yarn install            # Install dependencies (runs wxt prepare via postinstall)
yarn dev                # Dev mode for Chrome (opens play.autodarts.com, Alt+T to reload)
yarn dev:firefox        # Dev mode for Firefox
yarn build              # Production build for Chrome
yarn build:firefox      # Production build for Firefox
yarn build -b safari    # Safari build
yarn zip                # Create Chrome distribution zip
yarn zip:firefox        # Create Firefox distribution zip
yarn compile            # TypeScript type-check (vue-tsc --noEmit)
```

No test framework is configured — testing is manual on autodarts.com across Chrome and Firefox.

## Architecture

### Entry Points (`entrypoints/`)

WXT uses file-based routing for extension entry points:

- **`background.ts`** — Service worker handling CORS-bypassing fetch relay and chunked downloads for content scripts
- **`content/`** — Settings popup UI (main extension settings page)
- **`match.content/`** — Match page enhancements (20+ features: Zoom, Takeout, QuickCorrection, Animations, etc.)
- **`lobby.content/`** — Lobby features (AutoStart, Discord webhooks, RecentLocalPlayers)
- **`lobbynew.content/`** — New lobby UI features (QR codes)
- **`boards.content/`** — External boards support
- **`websocket-monitor.content.ts`** — WebSocket connection monitoring
- **`websocket-capture.ts`** / **`auth-cookie.ts`** — Injected page scripts for WebSocket interception and auth

Content script directories each have an `index.ts` that mounts Vue via `createShadowRootUi()` for DOM isolation.

### Feature Settings Pattern

Every feature lives in `components/Settings/` as a single Vue component with a two-part template:

```vue
<template v-if="!$attrs['data-feature-index']">
  <!-- Settings Panel (shown when feature is selected) -->
</template>
<template v-else>
  <!-- Feature Card (shown in the grid) -->
</template>
```

Features are organized into four tabs in `components/PageConfig.vue`: Lobbies, Matches, Boards, Sounds & Animations.

### Storage

- **Config** — `AutodartsToolsConfig` class in `utils/storage.ts` wraps `browser.storage.local` with a single `IConfig` interface
- **Large data** — IndexedDB via `idb` library for game data, board images, sounds, etc. (separate `*-storage.ts` files in `utils/`)

### Communication

- **Background ↔ Content scripts** — `browser.runtime.sendMessage` / `browser.runtime.onMessage`
- **Cross-component** — Event bus via `mitt` (see `composables/useEventBus.ts`)
- **WebSocket capture** — Script injection into page context to intercept autodarts game events, which drive sounds, animations, and WLED effects

### Game Modes

Read the current game mode from `gameData.match?.variant`, the site's own name for the game (`"X01"`, `"Cricket"`, `"Bull-off"`, …). `utils/game-modes.ts` holds the `GameMode` enum (the site's variant names), the site's labels and groups, and the gate. The Caller, Sound FX, WLED and Animations each store an optional `disabledGameModes` list and check `playsIn(config.<feature>, variant)` before acting on game data. Board events use `pageVariant(storedMatch, location.href)`, because Sound FX and WLED also run in lobbies, where the stored match is the last one played. Lobby and tournament triggers ignore the game mode. A missing list, or a variant not in it, plays, so nothing needs migrating when the site adds a game. The settings edit the list with `GameModesField` in `components/Settings/Library/`.

### Auto-imports

WXT + Vite plugins auto-import:
- Vue APIs (`ref`, `computed`, `onMounted`, etc.)
- VueUse composables
- WXT APIs (`browser`, `defineContentScript`, `createShadowRootUi`, `storage`, etc.)
- Local composables from `composables/`
- Radix Vue components

Do **not** import these manually — they are globally available.

### Build Notes

- Path aliases `@`, `~`, and `src` all resolve to the repo root (set in `wxt.config.ts`)
- Store builds (`yarn build`) strip `console.*` and `debugger` through esbuild's `drop`, so nothing the extension logs reaches published users. `yarn dev` and `yarn build:devtools` keep their logging — the latter exists to be debugged in a real browser. Log freely, but assume nobody in the stores can read it
- `esbuild` is a **top-level** Vite option, not a `build.*` one. Nesting it under `build` is accepted silently and does nothing at all — that is how the `drop` above went missing for several releases

### Companion Services (separate sub-projects, not part of the extension build)

- **`socket/`** — Socket.io server (Bun) deployed at `adt-socket.tobias-thiele.de`; tracks online friends/presence data shared between extension users
- **`proxy/`** — Express server (Docker) that forwards Discord webhook requests via an `x-target-url` header
- **`scripts/`** — Release automation (Safari/Xcode builds, the Firefox for Android XPI, App Store submission, AltStore source updates — see `scripts/README.md`)

## Code Conventions

### Vue Component Order

Template-first SFCs (`<template>`, `<script setup lang="ts">`, `<style>`). Inside `<script setup>`:

1. Imports (external, then internal)
2. Constants
3. Refs
4. Computed
5. Lifecycle hooks (`onBeforeMount` → `onMounted` → `watch` → `onBeforeUnmount`)
6. Methods & event handlers

### Styling

- Dark theme throughout — `bg-black/50`, `text-white/70`, `border-white/20`
- Container class: `adt-container` (`relative overflow-hidden rounded-md bg-black/50 p-6 shadow-lg`)
- Feature card images use `gradient-mask-left` CSS mask
- Icons: Iconify CSS mode — `<span class="icon-[pixelarticons--name]" />` or `icon-[material-symbols--name]`
- Reusable UI components use `App` prefix: `AppButton`, `AppInput`, `AppToggle`, `AppModal`, `AppSelect`, `AppRadioGroup`, `AppSlider`, `AppTabs`, `AppNotification`
- **Text:** never literal. Every string a person reads comes from `t()`. See "Translations".

### Config Persistence Pattern

```ts
const config = ref<IConfig>();
onMounted(async () => { config.value = await AutodartsToolsConfig.getValue(); });
watch(config, async (_, old) => {
  if (!old) return;
  await AutodartsToolsConfig.setValue(toRaw(config.value!));
}, { deep: true });
```

### ESLint

Uses `@creazy231/eslint-config` with enforced Vue component ordering and import grouping. Run linting implicitly via the editor — no standalone lint script is defined.

## Release Process

Version bump in `package.json` triggers the CI pipeline (`.github/workflows/release.yml`):
1. Builds Chrome + Firefox zips → GitHub release
2. Builds Safari extension → IPA uploaded to release
3. Signs and submits to App Store (main branch only)
4. Auto-updates AltStore source JSON

Update `CHANGELOG.md` alongside the version bump.

## Key Files

- `wxt.config.ts` — Extension manifest, permissions, host permissions, Vite plugins
- `utils/storage.ts` — `IConfig` interface (the single source of truth for all feature settings)
- `utils/types.ts` — Game data types
- `components/PageConfig.vue` — Main settings UI with tab navigation
- `entrypoints/background.ts` — Fetch relay and download chunking
- `README.md` — User-facing documentation of all features, installation, and configuration

## README Maintenance

When adding, changing, or removing a feature, **always update `README.md`** to reflect the change. The README is the primary user-facing documentation and must stay in sync with the codebase.

- **New feature** — Add it to the relevant section (Lobby, Match, Gameplay, Audio, WLED, Animations, Utility) with a description, configuration options, and supported triggers if applicable
- **Changed feature** — Update the existing description, options, or trigger list
- **Removed feature** — Remove the section entirely
- **New triggers** — Add them to the trigger list in the relevant feature section

## Translations (English, German, Dutch)

Tools speaks the language picked on autodarts — `localStorage["autodarts.settings.language"]`, set on /settings/general or in the user menu — in English, German and Dutch. It has no language setting of its own. See `utils/i18n/` and `docs/superpowers/specs/2026-10-01-i18n-design.md`.

**Every new or changed text ships in all three languages, in the same change.** New features, settings rows, notifications, tooltips and aria-labels, text drawn into the site's pages, the Discord message and What's New all count.

- No literal text in a template or a DOM write:
  - In components, `const { t } = useI18n()` and `{{ t("zoom.position.title") }}`.
  - In scripts, `import { t, onLanguageChange } from "@/utils/i18n"`. Text that is built once is rebuilt through `onLanguageChange`.
  - A sentence with bold text or a link goes through `<AppTrans path="…">`, with a named slot per `{marker}`.
- The English goes in `locales/en/<feature>.ts`, and the German and Dutch in the files of the same name in `locales/de/` and `locales/nl/`. A new file is registered in all three `index.ts`. Feature names live in `locales/*/features.ts`.
- Modules the service worker loads (`utils/storage.ts` and what it imports) hold message keys and never import `@/utils/i18n`.
- Use the site's own words for its buttons, settings and darts terms. `yarn i18n:site "next leg"` prints them, and `locales/GLOSSARY.md` has the agreed names. German says *du*, Dutch *je*.
- What may stay literal (brand names, units) is listed in `locales/untranslated.json`, and nothing else may.
- `yarn i18n:check` must pass on the files you change (`yarn i18n:check utils/language-note.ts`, which also checks the catalogs); on the whole tree it passes once the extraction is finished. It fails on a missing or extra key, on mismatched placeholders or tags, on an untranslated sentence, and on literal text left in templates and DOM writes. To find text it can't see, set `sessionStorage["autodarts.i18n.debug"] = "true"` and reload. The site and Tools then render keys, so whatever is still in English bypasses the catalogs.
