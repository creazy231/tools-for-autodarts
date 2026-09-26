import { type ComputedRef, computed, ref } from "vue";
import { watchDebounced } from "@vueuse/core";

import type { SoundCopies } from "@/utils/sound-copies";

import { DEFAULT_VOLUME, isLink } from "@/utils/sound-volume";

/** What the sound editor holds, as far as the check goes. */
export interface LouderDraft {
  open: boolean;
  url: string;
  volume: number;
  /** An uploaded file, which can always be copied. */
  hasFile: boolean;
}

/**
 * Whether the sound in the editor is set louder than it can play.
 *
 * Only a link above 100% can be. A louder copy needs the file, and a site
 * that neither allows reading it (CORS) nor is one of the extension's own
 * hosts cannot be read — see utils/sound-copies.ts. Each link is tried once,
 * a moment after it stops changing, so typing one does not fetch at every
 * keystroke; what is known about it answers at once from then on.
 */
export function useLouderCheck(copies: SoundCopies, draft: () => LouderDraft): ComputedRef<boolean> {
  /** A link found to be unreadable. */
  const unreadable = ref("");

  const linkAboveFull = () => {
    const { open, url, volume, hasFile } = draft();
    const link = url.trim();
    return open && !hasFile && volume > DEFAULT_VOLUME && isLink(link) ? link : "";
  };

  watchDebounced(linkAboveFull, async (link) => {
    if (link && !(await copies.readable(link))) unreadable.value = link;
  }, { debounce: 400 });

  return computed(() => {
    const link = linkAboveFull();
    return link !== "" && link === unreadable.value;
  });
}
