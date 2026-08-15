/**
 * QR Code — keep the lobby's join code on screen.
 *
 * The site has a QR button of its own in the top right corner, which opens a
 * dialog you have to reopen for every person who walks up to the board. This
 * pins the code just below that button instead, so anyone arriving can scan it
 * without the host touching anything.
 *
 * The ✕ underneath takes it away, and nothing brings it back for this lobby —
 * deliberately, because the site's own button is right there above it.
 *
 * v1 drew its QR code inside the lobby's share-link row, reading the URL out of
 * an `input[placeholder="Lobby invite url"]`. The rebuilt lobby has neither.
 */

import { createApp } from "vue";

import QrCodeOverlay from "./QrCodeOverlay.vue";

import { SELECTORS, qs } from "@/utils/selectors";

/** Marks the site's button as hidden by us, so only we put it back. */
const HIDDEN_FLAG = "data-autodarts-tools-qr-hidden";

let ui: any = null;
/** Watches for the button being re-created. */
let buttonObserver: MutationObserver | null = null;
/** Watches the button we hid for having its style put back. */
let styleObserver: MutationObserver | null = null;
/** Set by the ✕, and only cleared by opening a different lobby. */
let dismissed = false;
let lobbyId: string | null = null;

export async function qrCode(ctx: any) {
  const current = lobbyIdFromUrl();

  // A different lobby is a different code, so the dismissal does not carry over.
  if (current !== lobbyId) {
    lobbyId = current;
    dismissed = false;
  }

  if (dismissed || ui || !current) return;

  console.log("Autodarts Tools: QR Code - Showing the lobby code");

  ui = await createShadowRootUi(ctx, {
    name: "autodarts-tools-qr-code",
    position: "inline",
    anchor: "body",
    append: "last",
    // The card pins itself — see QrCodeOverlay.vue for why the host cannot.
    onMount: (container: HTMLElement) => {
      const app = createApp(QrCodeOverlay, { link: lobbyLink(), dismiss });
      app.mount(container);
      return app;
    },
    onRemove: (app: any) => app?.unmount(),
  });

  ui.mount();
  hideSiteButton();
  watchSiteButton();
}

export async function onRemove() {
  teardown();
  dismissed = false;
  lobbyId = null;
}

function dismiss() {
  dismissed = true;
  teardown();
  console.log("Autodarts Tools: QR Code - Hidden for this lobby, the site's button is back");
}

function teardown() {
  buttonObserver?.disconnect();
  buttonObserver = null;
  styleObserver?.disconnect();
  styleObserver = null;

  ui?.remove();
  ui = null;

  showSiteButton();
}

// ------------------------------------------------------- the site's button

/**
 * Take the site's QR button out while ours is up.
 *
 * The two land on top of each other in the same corner, and ours already shows
 * what that button opens. Closing ours hands it straight back, which is what
 * makes the ✕ a one-way door rather than a dead end.
 */
function hideSiteButton() {
  const button = qs<HTMLElement>(SELECTORS.lobby.siteQrButton);
  if (!button) return;
  if (button.hasAttribute(HIDDEN_FLAG) && button.style.display === "none") return;

  button.setAttribute(HIDDEN_FLAG, "true");
  button.style.display = "none";

  // Setting the style is itself a mutation, but the check above makes the next
  // pass a no-op, so this settles rather than looping.
  styleObserver?.disconnect();
  styleObserver = new MutationObserver(() => hideSiteButton());
  styleObserver.observe(button, { attributes: true, attributeFilter: [ "style" ] });
}

function showSiteButton() {
  for (const button of document.querySelectorAll<HTMLElement>(`[${HIDDEN_FLAG}]`)) {
    button.style.display = "";
    button.removeAttribute(HIDDEN_FLAG);
  }
}

/**
 * Two ways the button comes back, so two observers: the site re-creating it,
 * and the site re-rendering the one we hid with its own style attribute.
 */
function watchSiteButton() {
  buttonObserver = new MutationObserver(() => hideSiteButton());
  buttonObserver.observe(document.body, { childList: true, subtree: true });
}

function lobbyIdFromUrl(): string | null {
  return window.location.pathname.match(/\/lobby\/([0-9a-f-]+)/i)?.[1] ?? null;
}

/** The lobby URL is the join link; a query string or hash is not part of it. */
function lobbyLink(): string {
  const url = new URL(window.location.href);
  url.hash = "";
  url.search = "";
  return url.toString();
}
