/**
 * QR Code (tournaments) — put the tournament's link in the invite dialog as a
 * code, so a friend standing next to you joins by pointing a phone at the
 * screen rather than by being sent a link.
 *
 * On the rebuilt site the invitation lives in a dialog behind the participants
 * card's Invite button, and nothing in that dialog says what it is except its
 * title, which the language switcher rewrites. So the button is the anchor:
 * FontAwesome stamps `data-icon="plus"` on its glyph, and a press on it arms
 * this for the next dialog to open. The title is kept as a second way in, for
 * a dialog that opens without the press being seen — a keyboard user, or a
 * page restored with it already up — in the wordings we know.
 *
 * v1 waited three seconds for an `h2` reading "Invite friends" as the page
 * loaded and gave up. The dialog is never open that early, so on the rebuilt
 * site the code was never drawn at all.
 */

import QRCodeStyling from "qr-code-styling";

import { QR_CODE_OPTIONS } from "@/utils/qr-code-options";
import { SELECTORS, qs, qsText, qsa } from "@/utils/selectors";

/** Marks our block inside the dialog. */
const WRAPPER_CLASS = "ad-ext_qr-code-wrapper";

/** How long after the Invite button is pressed the next dialog counts as its dialog. */
const ARM_WINDOW_MS = 3000;

let observer: MutationObserver | null = null;
let onClick: ((event: Event) => void) | null = null;
let armedUntil = 0;

export async function qrCodeTournament() {
  console.log("Autodarts Tools: QR Code Tournament - watching for the invite dialog");

  // Capturing, so a press is seen before the site re-renders the button away.
  if (onClick) document.removeEventListener("click", onClick, true);
  onClick = (event: Event) => {
    const target = event.target as Element | null;
    if (target?.closest?.(SELECTORS.tournament.inviteButton.join(","))) armedUntil = Date.now() + ARM_WINDOW_MS;
  };
  document.addEventListener("click", onClick, true);

  // The site's dialogs are portalled to the end of <body>, so that is what is
  // watched — `main` never sees them.
  observer?.disconnect();
  observer = new MutationObserver(inject);
  observer.observe(document.body, { childList: true, subtree: true });
  inject();
}

export function onRemove() {
  observer?.disconnect();
  observer = null;
  if (onClick) document.removeEventListener("click", onClick, true);
  onClick = null;
  armedUntil = 0;
  document.querySelectorAll(`.${WRAPPER_CLASS}`).forEach(el => el.remove());
}

/**
 * The invite dialog, if one is open: whichever dialog is up while the button
 * was just pressed, otherwise one whose title is a wording we know.
 */
function inviteDialog(): HTMLElement | null {
  const dialogs = qsa<HTMLElement>(SELECTORS.tournament.dialog);
  if (!dialogs.length) return null;

  if (Date.now() < armedUntil) return dialogs[dialogs.length - 1];

  return dialogs.find(dialog =>
    qsText(SELECTORS.tournament.dialogTitle, SELECTORS.tournament.inviteDialogTitleText, dialog) !== null) ?? null;
}

function inject(): void {
  const dialog = inviteDialog();
  if (!dialog || dialog.querySelector(`.${WRAPPER_CLASS}`)) return;

  const header = qs<HTMLElement>(SELECTORS.tournament.dialogHeader, dialog)
    ?? qs<HTMLElement>(SELECTORS.tournament.dialogTitle, dialog)?.parentElement
    ?? null;
  if (!header) return;

  // The press that armed this has been used up.
  armedUntil = 0;

  const wrapper = document.createElement("div");
  wrapper.className = WRAPPER_CLASS;
  wrapper.style.display = "flex";
  wrapper.style.justifyContent = "center";

  // Half the dialog, within reason: legible from a phone held up to the screen
  // without pushing the friends list below the fold.
  const size = Math.min(240, Math.max(160, Math.floor(dialog.clientWidth * 0.5)));
  const code = new QRCodeStyling({ ...QR_CODE_OPTIONS, data: tournamentLink(), width: size, height: size, margin: 12 } as any);
  code.append(wrapper);

  const canvas = wrapper.querySelector("canvas");
  if (canvas) canvas.style.borderRadius = "16px";

  header.after(wrapper);
  console.log("Autodarts Tools: QR Code Tournament - code drawn into the invite dialog");
}

/** The tournament page is the link; the tab in the path and any query are not part of it. */
function tournamentLink(): string {
  const url = new URL(window.location.href);
  url.hash = "";
  url.search = "";
  url.pathname = url.pathname.replace(/^(\/tournaments\/[0-9a-f-]+).*$/i, "$1");
  return url.toString();
}
