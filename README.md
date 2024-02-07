# Autodarts Tools

[![build](https://github.com/creazy231/autodarts-tools/actions/workflows/build.yml/badge.svg)](https://github.com/mubaidr/vite-vue3-chrome-extension-v3/actions/workflows/build.yml)

A [Vite](https://vitejs.dev/) powered WebExtension ([Chrome](https://developer.chrome.com/docs/extensions/reference/), [FireFox](https://addons.mozilla.org/en-US/developers/), etc.) for [Autodarts](https://autodarts.io).

## Features

- Simple color customization
- Extended Lobby and Game information
- Auto-Start feature inside Lobby [v0.0.2]
- Stream-Mode with green screen [v0.0.4]

_Please create an issue if you feel some feature is missing or could be improved._

## Usage

### Folders

- `src` - main source.
  - `content-script` - scripts and components to be injected as `content_script`
    - `iframe` content script iframe vue3 app which will be injected into page
  - `background` - scripts for background.
  - `popup` - popup vuejs application root
    - `pages` - popup pages
  - `options` - options vuejs application root
    - `pages` - options pages
  - `install` - Extension install success page
  - `update` - Extension update success page
  - `offscreen` - Chrome extension offscreen pages, can be used for audio, screen recording
  - `pages` - application pages, common to all views (About, Contact, Authentication etc)
  - `components` - auto-imported Vue components that are shared in popup and options page.
  - `assets` - assets used in Vue components
- `dist` - built files, also serve stub entry for Vite on development.

### Development

```bash
yarn dev
```

Then **load extension in browser with the `dist/` folder**.

### Build

To build the extension, run

```bash
yarn build
```

And then pack files under `dist`, you can upload `dist.crx` or `dist.xpi` to appropriate extension store.

## Credits

Template: [vite-vue3-browser-extension-v3
](https://github.com/mubaidr/vite-vue3-chrome-extension-v3)

Autodarts: [Autodarts](https://autodarts.io)
