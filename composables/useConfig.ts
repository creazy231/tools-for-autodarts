import { ref, toRaw, watch } from "vue";

import type { IConfig } from "@/utils/storage";

import { AutodartsToolsConfig, defaultConfig } from "@/utils/storage";

/**
 * The settings page's config, as one object that everything shares.
 *
 * Every settings component used to hold a private copy of the whole config,
 * read on mount and written back whole on any change — and a feature's card and
 * its settings dialog are two instances of the same component, so they held two
 * copies that nothing kept in step. The page dealt with that by destroying and
 * rebuilding every card after every change, which is what made changing a
 * setting flash the entire grid.
 *
 * One ref instead. A toggle on a card and a slider in a dialog are edits to the
 * same object, so they are already visible everywhere: nothing to re-read, and
 * nothing to remount.
 */
const config = ref<IConfig>();

/** Resolves once the config has been read. Shared, so later callers wait on the first. */
let opened: Promise<void> | undefined;

/**
 * What storage and this ref last agreed on.
 *
 * Both directions need it. Our own write comes straight back through the
 * storage watcher, where adopting it would look like a fresh edit and write
 * again; and adopting someone else's write trips the deep watcher below, which
 * would bounce it right back at them.
 */
let settled = "";

function adopt(value: IConfig): void {
  settled = JSON.stringify(value);
  config.value = value;
}

/**
 * Fill in sections a saved config predates.
 *
 * Storage migrations cover the shapes that changed; these are the ones that were
 * simply added, where the default is the whole answer. Most are a missing
 * top-level section, which the merge covers on its own — only the two nested
 * ones need saying out loud.
 *
 * Applied before the ref is filled, so backfilling does not itself count as an
 * edit. It reaches storage with the first real change, exactly as it did when
 * every component did this for itself on mount.
 */
function withDefaults(stored: IConfig): IConfig {
  const merged: IConfig = { ...JSON.parse(JSON.stringify(defaultConfig)), ...stored };
  merged.colors = { ...merged.colors };
  merged.colors.actionBar ||= defaultConfig.colors.actionBar;
  merged.discord = { ...merged.discord };
  merged.discord.autoStartAfterTimer ??= { ...defaultConfig.discord.autoStartAfterTimer! };
  return merged;
}

/**
 * Persist edits.
 *
 * Deliberately at module scope. A watcher created inside {@link useConfig} would
 * belong to whichever component happened to call it first and would be stopped
 * when that component unmounted — saving would quietly die the first time a
 * settings dialog closed.
 */
watch(config, async () => {
  if (!config.value) return;

  const next = JSON.stringify(config.value);
  if (next === settled) return; // came from storage, not from the user

  settled = next;
  await AutodartsToolsConfig.setValue(toRaw(config.value));
}, { deep: true });

async function open(): Promise<void> {
  adopt(withDefaults(await AutodartsToolsConfig.getValue()));

  // Changes made anywhere else: a second tab with the settings page open, a
  // content script, or a storage migration finishing after this read.
  AutodartsToolsConfig.watch((value?: IConfig) => {
    if (!value || JSON.stringify(value) === settled) return;
    adopt(withDefaults(value));
  });
}

/**
 * @returns the shared config, and a promise for when it has finished loading.
 *
 * `config` is undefined until then, which is what the `v-if="config"` guard in
 * every settings template is for. Only code that must run against a loaded
 * config — an importer, an exporter — needs `ready`.
 */
export function useConfig() {
  opened ??= open();
  return { config, ready: () => opened! };
}
