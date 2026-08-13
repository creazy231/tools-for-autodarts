/**
 * Injects the "Tools for Autodarts" entry into the autodarts user drawer.
 *
 * The drawer is the panel behind the avatar in the header. It is created fresh
 * every time it opens and destroyed on close, so this watches for it rather
 * than running once.
 *
 * Selector policy
 * ---------------
 * Everything here anchors on things autodarts is unlikely to change, in
 * descending order of durability:
 *
 *   [data-slot="..."]   the site is built on shadcn/ui, which stamps a data-slot
 *                       on every primitive. These are semantic and survive class
 *                       and layout churn.
 *   a[href="/legal"]    a route. Renaming it would break the site's own links.
 *   ordering            "after the last link, before the buttons" — a structural
 *                       fact about the menu, not a fixed index.
 *
 * Deliberately NOT used: `nth-child`/`nth-of-type` indexes (adding one drawer
 * item shifts every index and silently retargets us), class names (Tailwind
 * utilities churn constantly), and visible text (the site has a language
 * switcher, so "Legal" is not stable).
 *
 * The item is CLONED from a real drawer entry rather than written by hand, so it
 * inherits whatever classes autodarts currently uses. If they restyle the
 * drawer, our entry restyles with it for free.
 */

import { SELECTORS, qs, qsa } from "@/utils/selectors";

export const MENU_ITEM_ID = "autodarts-tools-menu-item";

const MENU_ICON_VIEWBOX = "0 0 24 24";
const MENU_ICON_PATH = "M8.8 21H5q-.825 0-1.412-.587T3 19v-3.8q1.2 0 2.1-.762T6 12.5q0-1.175-.9-1.937T3 9.8V6q0-.825.588-1.412T5 4h4q0-1.05.725-1.775T11.5 1.5q1.05 0 1.775.725T14 4h4q.825 0 1.413.588T20 6v4q1.05 0 1.775.725T22.5 12.5q0 1.05-.725 1.775T20 15v4q0 .825-.587 1.413T18 21h-3.8q0-1.25-.787-2.125T11.5 18q-1.125 0-1.912.875T8.8 21";

/**
 * The drawer entry to insert ourselves after.
 *
 * Prefers the Legal link by route. Falls back to the last link in the group,
 * because the drawer is ordered links-then-buttons (Switch to classic design,
 * Logout, language) and we belong with the links.
 */
function findAnchorItem(group: ParentNode): HTMLElement | null {
  const byRoute = qs(SELECTORS.drawer.legalItem, group);
  if (byRoute) return byRoute;

  const links = qsa(SELECTORS.drawer.linkItems, group);
  return links.at(-1) ?? null;
}

/** Swap a cloned item's icon for ours, keeping the site's own sizing classes. */
function replaceIcon(item: HTMLElement) {
  const media = qs(SELECTORS.drawer.itemMedia, item);
  const svg = media?.querySelector("svg");
  if (!svg) return;

  // Keep the element (and therefore its classes) and replace only its contents,
  // so size/colour utilities like `size-5 text-foreground` still apply.
  svg.setAttribute("viewBox", MENU_ICON_VIEWBOX);
  svg.removeAttribute("data-icon");
  svg.removeAttribute("data-prefix");
  svg.innerHTML = `<path fill="currentColor" d="${MENU_ICON_PATH}"></path>`;
}

/** Build our drawer entry by cloning a real one. */
function buildMenuItem(template: HTMLElement, label: string, onActivate: () => void): HTMLElement {
  const item = template.cloneNode(true) as HTMLElement;

  item.id = MENU_ITEM_ID;
  // Not a navigation: it opens the settings overlay in place.
  item.removeAttribute("href");
  item.style.cursor = "pointer";

  replaceIcon(item);

  const title = qs(SELECTORS.drawer.itemTitle, item);
  if (title) title.textContent = label;
  // Cloned entries may carry a subtitle (the Upgrade row has one); ours has none.
  qs(SELECTORS.drawer.itemDescription, item)?.remove();

  item.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    onActivate();
  });

  return item;
}

/**
 * Add the entry to a drawer that is currently open. Safe to call repeatedly.
 * Returns true when the drawer was found and now contains the entry.
 */
function injectInto(group: HTMLElement, onActivate: () => void): boolean {
  if (group.querySelector(`#${MENU_ITEM_ID}`)) return true;

  const anchor = findAnchorItem(group);
  if (!anchor) return false;

  const item = buildMenuItem(anchor, "Tools for Autodarts", onActivate);
  anchor.after(item);
  return true;
}

/**
 * Watch for the drawer opening and inject the entry each time.
 *
 * @param onActivate Called when the entry is clicked.
 * @returns teardown function.
 */
export function initV2Menu(onActivate: () => void): () => void {
  const tryInject = () => {
    for (const group of qsa(SELECTORS.drawer.itemGroup)) {
      injectInto(group, onActivate);
    }
  };

  // The drawer mounts into a portal at the end of <body>, not inside #root.
  const observer = new MutationObserver(tryInject);
  observer.observe(document.body, { childList: true, subtree: true });

  // Cover the case where it is already open.
  tryInject();

  return () => observer.disconnect();
}

/**
 * Close whichever drawer is currently open.
 *
 * Identified by `aria-expanded`, not by label, so it keeps working if the
 * button is renamed or another drawer is added. Clicking the real trigger is
 * preferred over a synthetic Escape: a dispatched KeyboardEvent has
 * `isTrusted: false`, which some component libraries ignore.
 */
function closeDrawer() {
  const open = qsa(SELECTORS.drawer.trigger).find(t => t.getAttribute("aria-expanded") === "true");
  if (open) {
    open.click();
    return;
  }
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
}

/**
 * Open the settings overlay from the drawer.
 *
 * Only closes the drawer and rewrites the URL — it deliberately does NOT
 * navigate the SPA first. Sending it to /settings looks tempting (that is what
 * the old implementation did) but the site redirects /settings to
 * /settings/general asynchronously, which lands *after* this pushState and
 * overwrites it. The URL watcher then sees a path without /tools and closes the
 * overlay again.
 *
 * pushState does not fire popstate, so the router never re-renders: whatever
 * page was underneath stays mounted and is hidden by the overlay.
 */
export function openToolsPage() {
  closeDrawer();
  window.history.pushState(null, "", "/tools");
}
