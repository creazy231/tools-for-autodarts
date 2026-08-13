import QRCodeStyling from "qr-code-styling";

import { QR_CODE_OPTIONS } from "./qr-code-options";

import { waitForElementWithTextContent } from "@/utils";

export async function qrCodeTournament() {
  console.log("Autodarts Tools: QR Code Tournament feature initializing");

  // Find the element with "Invite friends" text
  const inviteFriendsElement = await waitForElementWithTextContent("h2", [ "Invite friends", "Nodig vrienden uit", "Freunde einladen" ]);

  if (!inviteFriendsElement) {
    return console.error("Autodarts Tools: Invite friends element not found");
  }

  // Get the parent element
  const parentElement = inviteFriendsElement.parentElement;

  if (!parentElement) {
    return console.error("Autodarts Tools: Parent element not found");
  }

  // Get the parent container
  const parentContainer = parentElement.parentElement;

  if (!parentContainer) {
    return console.error("Autodarts Tools: Parent container not found");
  }

  // Get the current URL
  const currentUrl = location.href;

  console.log("Autodarts Tools: Current URL", currentUrl);

  // Check if QR code wrapper already exists
  const existingQRCodeWrapper = parentContainer.querySelector(".ad-ext_qr-code-wrapper");
  if (existingQRCodeWrapper) {
    console.log("Autodarts Tools: Removing existing QR code");
    existingQRCodeWrapper.remove();
  }

  // Clone the parent element
  const qrCodeWrapper = parentElement.cloneNode(true) as HTMLElement;
  qrCodeWrapper.className = `${parentElement.className} ad-ext_qr-code-wrapper`;
  qrCodeWrapper.style.marginTop = "calc(1.5rem * -1)";
  qrCodeWrapper.style.marginBottom = "1.5rem";
  // Clear the content of the cloned element
  qrCodeWrapper.innerHTML = "";

  // Append the QR code wrapper to the parent container
  parentContainer.appendChild(qrCodeWrapper);

  QR_CODE_OPTIONS.data = currentUrl;
  QR_CODE_OPTIONS.width = parentContainer.clientWidth;
  QR_CODE_OPTIONS.height = parentContainer.clientWidth;
  QR_CODE_OPTIONS.margin = 20;
  const qrCode = new QRCodeStyling(QR_CODE_OPTIONS as any);

  // Append QR code as the content of the cloned element
  qrCode.append(qrCodeWrapper);

  // Add border radius to the QR code element
  const qrCodeElement = qrCodeWrapper.querySelector("canvas");
  if (qrCodeElement) {
    qrCodeElement.style.borderRadius = "20px";
  }
}

export function onRemove() {
  console.log("Autodarts Tools: QR Code Tournament feature cleanup");
}
