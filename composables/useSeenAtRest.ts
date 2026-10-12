import { type Ref, computed, readonly, ref } from "vue";
import { tryOnScopeDispose, useIntersectionObserver } from "@vueuse/core";

/** How long a list has to stand still before what is in its view counts as seen. */
const SETTLE_MS = 200;

/** And what is only near it, that much later: a device that serves one read at a time serves the view first. */
const BEYOND_MS = 300;

/**
 * Whether `target` has been seen: in its list's view, or within `lookAhead`
 * of it (a rootMargin), while the list stood still for SETTLE_MS, BEYOND_MS
 * longer out of view. Once true, it stays true.
 *
 * For work worth doing only for what can be looked at, such as WLED's
 * previews, which read the device and decode GIFs: a list flicked through
 * starts nothing on its way, and where it stops, the rows in view start
 * first and those just below them after.
 *
 * The look-ahead reaches below the view only. A row above that changed its
 * height would push the view down where the browser doesn't hold it in place:
 * Safari has no scroll anchoring.
 */
export function useSeenAtRest(target: Ref<HTMLElement | undefined>, lookAhead = "0px 0px 50% 0px"): Readonly<Ref<boolean>> {
  const seen = ref(false);
  // The list that scrolls the target, such as a dialog's body: the root the
  // look-ahead extends. Without one, the viewport, which the list would clip.
  const list = computed(() => (target.value ? scrollingParent(target.value) : undefined));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let listening: EventTarget | undefined;

  const { stop } = useIntersectionObserver(target, (entries) => {
    if (seen.value) return;
    if (!entries[entries.length - 1]?.isIntersecting) {
      forget();
      return;
    }
    if (!listening) {
      listening = list.value ?? window;
      listening.addEventListener("scroll", settle, { passive: true });
    }
    settle();
  }, { root: list, rootMargin: lookAhead, threshold: 0 });

  tryOnScopeDispose(forget);

  /** Seen once the list has been still for SETTLE_MS, BEYOND_MS more out of view: every scroll starts the wait again. */
  function settle() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (inView()) see();
      else timer = setTimeout(see, BEYOND_MS);
    }, SETTLE_MS);
  }

  function see() {
    seen.value = true;
    forget();
    stop();
  }

  /** Whether any of the target shows in its list's view, rather than only in the look-ahead. */
  function inView(): boolean {
    if (!target.value) return false;
    const box = target.value.getBoundingClientRect();
    const view = list.value?.getBoundingClientRect() ?? { top: 0, bottom: window.innerHeight };
    return box.bottom > view.top && box.top < view.bottom;
  }

  function forget() {
    clearTimeout(timer);
    listening?.removeEventListener("scroll", settle);
    listening = undefined;
  }

  return readonly(seen);
}

/** The nearest ancestor that scrolls `element`. */
function scrollingParent(element: HTMLElement): HTMLElement | undefined {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    if (/auto|scroll|overlay/.test(getComputedStyle(parent).overflowY)) return parent;
  }
  return undefined;
}
