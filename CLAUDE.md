# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A browser extension (Chrome, Firefox, Safari/iOS) that enhances the gaming experience on autodarts.io. Built with **Vue 3**, **TypeScript**, **TailwindCSS**, and **WXT** (Web Extension Toolkit). Distributed via Chrome Web Store, Firefox Add-ons, App Store, and AltStore.

## Commands

```bash
yarn install            # Install dependencies (runs wxt prepare via postinstall)
yarn dev                # Dev mode for Chrome (opens play.autodarts.io, Alt+T to reload)
yarn dev:firefox        # Dev mode for Firefox
yarn build              # Production build for Chrome
yarn build:firefox      # Production build for Firefox
yarn build -b safari    # Safari build
yarn zip                # Create Chrome distribution zip
yarn zip:firefox        # Create Firefox distribution zip
yarn compile            # TypeScript type-check (vue-tsc --noEmit)
```

No test framework is configured — testing is manual on autodarts.io across Chrome and Firefox.

## Architecture

### Entry Points (`entrypoints/`)

WXT uses file-based routing for extension entry points:

- **`background.ts`** — Service worker handling CORS-bypassing fetch relay and chunked downloads for content scripts
- **`content/`** — Settings popup UI (main extension settings page)
- **`match.content/`** — Match page enhancements (20+ features: Zoom, Takeout, QuickCorrection, Animations, etc.)
- **`lobby.content/`** — Lobby features (AutoStart, Discord webhooks, ShufflePlayers, RecentLocalPlayers)
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

### Auto-imports

WXT + Vite plugins auto-import:
- Vue APIs (`ref`, `computed`, `onMounted`, etc.)
- VueUse composables
- WXT APIs (`browser`, `defineContentScript`, `createShadowRootUi`, `storage`, etc.)
- Local composables from `composables/`
- Radix Vue components

Do **not** import these manually — they are globally available.

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
