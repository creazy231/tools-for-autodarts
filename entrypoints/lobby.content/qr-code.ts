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

let ui: any = null;
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
}

export async function onRemove() {
  ui?.remove();
  ui = null;
  dismissed = false;
  lobbyId = null;
}

function dismiss() {
  dismissed = true;
  ui?.remove();
  ui = null;
  console.log("Autodarts Tools: QR Code - Hidden for this lobby");
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
