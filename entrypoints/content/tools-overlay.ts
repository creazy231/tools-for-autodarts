/**
 * Making the settings overlay scroll.
 *
 * The rebuilt site lays its shell out as `h-screen flex flex-col`, and `<main>`
 * is `flex-1 min-h-0 overflow-hidden` — a clip box of exactly the height left
 * over, which never scrolls. Each of the site's own routes brings its own
 * scrolling container inside it.
 *
 * The overlay mounts into `<main>` as well, so it has to do the same or
 * anything taller than the viewport is simply cut off. The Matches tab is
 * nearly three times that height; Lobbies overflowed too, by little enough that
 * it read as a page that just ended.
 *
 * The host cannot be styled from the outside — WXT resets it with
 * `:host { all: initial !important }`, and an important declaration from a
 * shadow tree beats an important inline style set on the host from the document
 * — so the rule lives inside the shadow root and is switched by an attribute,
 * which is not a style and so can be set from out here.
 *
 * Only while the overlay is open: on every other page the host stays a
 * zero-size inline element that takes part in no layout at all.
 */

export const TOOLS_OVERLAY_OPEN_ATTR = "data-autodarts-tools-open";

export const TOOLS_OVERLAY_CSS = `
:host([${TOOLS_OVERLAY_OPEN_ATTR}]) {
  display: block !important;
  height: 100% !important;
  overflow-y: auto !important;
}
`;

/** Host element name; must match the `name` given to createShadowRootUi. */
const HOST = "autodarts-tools-wxt";

export function setToolsOverlayOpen(open: boolean) {
  const host = document.querySelector(HOST);
  if (!host) return;

  if (open) host.setAttribute(TOOLS_OVERLAY_OPEN_ATTR, "true");
  else host.removeAttribute(TOOLS_OVERLAY_OPEN_ATTR);
}
