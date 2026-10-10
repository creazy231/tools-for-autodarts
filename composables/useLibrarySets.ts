import { computed, ref, toRaw, watch } from "vue";

import type { LibrarySetView, SetFeature, SetSection } from "@/utils/library-sets";
import type { IAnimation, ISound, IWled } from "@/utils/storage";

import { useConfig } from "@/composables/useConfig";
import { t } from "@/utils/i18n";
import {
  LIBRARY_SET_LISTS,
  activateLibrarySet,
  addLibrarySet,
  deleteLibrarySet,
  libraryFileUses,
  librarySetLabel,
  listLibrarySets,
  renameLibrarySet,
  unusedLibraryFiles,
} from "@/utils/library-sets";

/** What each feature's list holds. */
interface SetItems {
  wledFx: IWled;
  animations: IAnimation;
  caller: ISound;
  soundFx: ISound;
}

interface Options<T> {
  /** Says something in the panel, as its own notifications do. */
  notify: (message: string, type?: "success" | "error") => void;
  /** The id of an item's stored file, for a feature whose items keep one. */
  fileOf?: (item: T) => string | undefined;
  /** Deletes a stored file that no list keeps any more. */
  deleteFile?: (id: string) => Promise<unknown>;
  /**
   * Closes the panel's dialogs, and says whether one was open. Called when the
   * set they were open on is deleted elsewhere (another tab), so they don't act
   * on the set shown in its place, which is the one in use.
   */
  closeDialogs?: () => boolean;
}

/**
 * A settings panel's sets (utils/library-sets.ts), for LibrarySets.vue and the
 * panel's own library: the set being viewed, the list the library edits in
 * place, using, making, renaming and deleting a set, adding an upload to the set
 * it started in, and the stored files that items share between sets. A file is
 * deleted only when no list keeps it.
 */
export function useLibrarySets<F extends SetFeature>(feature: F, options: Options<SetItems[F]>) {
  type T = SetItems[F];
  // Read as text: the sections are typed by it below, whatever the feature's list is called.
  const key: string = LIBRARY_SET_LISTS[feature];
  const { config } = useConfig();

  /** The set the library shows, by id: "" or an id that has gone is the set in use. */
  const viewedId = ref("");

  const sets = computed<LibrarySetView<T>[]>(() => {
    const fx = section();
    return fx ? listLibrarySets(fx, key) : [];
  });
  const several = computed(() => sets.value.length > 1);
  const viewed = computed(() => sets.value.find(set => set.id === viewedId.value) ?? sets.value.find(set => set.active));
  /**
   * The list the library edits, in place: the stored list of the set being
   * viewed, which for the set in use is the section's own.
   */
  const items = computed<T[]>(() => viewed.value?.items ?? []);
  const viewedLabel = computed(() => (viewed.value ? labelOf(viewed.value.id) : ""));
  const inUseLabel = computed(() => {
    const set = sets.value.find(candidate => candidate.active);
    return set ? labelOf(set.id) : "";
  });

  watch(() => viewed.value?.id, () => {
    if (options.closeDialogs?.()) options.notify(t("library.sets.notifications.goneElsewhere"), "error");
  });

  function section(): SetSection<string, T> | undefined {
    return config.value?.[feature] as unknown as SetSection<string, T> | undefined;
  }

  /**
   * The section as stored. The set functions build plain objects from what they
   * are given, so they get the raw section: a reactive proxy kept inside one
   * would reach chrome.storage.
   */
  function raw(): SetSection<string, T> | undefined {
    const fx = section();
    return fx ? toRaw(fx) : undefined;
  }

  function write(next: SetSection<string, T>) {
    if (config.value) (config.value as unknown as Record<string, unknown>)[feature] = next;
  }

  function labelOf(id: string): string {
    const set = sets.value.find(candidate => candidate.id === id);
    return set ? librarySetLabel(set, t("library.sets.defaultName")) : "";
  }

  /** Makes the set the one that plays. */
  function useSet(id: string) {
    const fx = raw();
    if (!fx) return;
    const name = labelOf(id);
    write(activateLibrarySet(fx, key, id));
    options.notify(t("library.sets.notifications.inUse", { set: name }), "success");
  }

  /** A new set, a copy of the set being viewed or empty, shown and not used. */
  function createSet(name: string, copy: boolean) {
    const fx = raw();
    if (!fx) return;
    const added = addLibrarySet(fx, key, name, copy ? items.value : []);
    write(added.section);
    viewedId.value = added.id;
    options.notify(t("library.sets.notifications.created", { set: name }), "success");
  }

  function renameSet(id: string, name: string) {
    const fx = raw();
    if (!fx) return;
    write(renameLibrarySet(fx, key, id, name));
    options.notify(t("library.sets.notifications.renamed"), "success");
  }

  /** Deletes a set that isn't in use, and then the files of its items that no other list keeps. */
  async function deleteSet(id: string) {
    const fx = raw();
    if (!fx) return;
    const name = labelOf(id);
    const removed = sets.value.find(candidate => candidate.id === id)?.items ?? [];
    const next = deleteLibrarySet(fx, key, id);
    if (next === fx) return;
    write(next);
    options.notify(t("library.sets.notifications.deleted", { set: name }), "success");
    await releaseFiles(removed);
  }

  /** Deletes the files of `candidates`, items already taken out of their list, that no list keeps any more. */
  async function releaseFiles(candidates: readonly T[]) {
    const { fileOf, deleteFile } = options;
    const fx = raw();
    if (!fileOf || !deleteFile || !fx || !candidates.length) return;
    for (const id of unusedLibraryFiles(fx, key, fileOf, candidates)) {
      try {
        await deleteFile(id);
      } catch (error) {
        console.error("Autodarts Tools: couldn't delete a stored file", id, error);
      }
    }
  }

  /**
   * Puts `added` at the top of set `id`'s list as it is stored now. An upload or
   * import holds the id of the set it started in, never its list: a write from
   * another tab replaces the whole config, and a list held from before that is
   * stored no more. If the set was deleted meanwhile, `added` goes, with the
   * files no list keeps.
   */
  async function addToSet(id: string, added: T[]) {
    const list = sets.value.find(set => set.id === id)?.items;
    if (list) list.unshift(...added);
    else await releaseFiles(added);
  }

  /** Whether another item, in any list, keeps the same file: an editor replacing it writes a new one. */
  function fileShared(item: T): boolean {
    const fx = raw();
    return Boolean(options.fileOf && fx && libraryFileUses(fx, key, options.fileOf, options.fileOf(item)) > 1);
  }

  return { viewedId, sets, several, viewed, items, viewedLabel, inUseLabel, useSet, createSet, renameSet, deleteSet, addToSet, releaseFiles, fileShared };
}
