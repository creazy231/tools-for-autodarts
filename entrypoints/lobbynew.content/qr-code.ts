import QRCodeStyling from "qr-code-styling";

import { QR_CODE_OPTIONS } from "./qr-code-options";
import i18next from '@/utils/translate';

export async function qrCode() {
  console.log("Autodarts Tools: QR Code feature initializing");

  await waitForElementWithTextContent("p", i18next.t('share_link'));

  // get input with placeholder "Lobby invite url"
  const shareLinkInput = document.querySelector("input[placeholder=\"Lobby invite url\"]") as HTMLInputElement;

  if (!shareLinkInput) {
    return console.error("Autodarts Tools: Share link input not found");
  }

  const qrCodeContainer = shareLinkInput.parentElement?.parentElement;

  if (!qrCodeContainer) {
    return console.error("Autodarts Tools: QR Code container not found");
  }

  // get the value of the input
  const shareLink = shareLinkInput.value;

  console.log("Autodarts Tools: Share link", shareLink);

  // Check if QR code already exists in the container
  const existingQRCode = qrCodeContainer.querySelector("canvas");
  if (existingQRCode) {
    console.log("Autodarts Tools: Removing existing QR code");
    existingQRCode.remove();
  }

  QR_CODE_OPTIONS.data = shareLink;
  const qrCode = new QRCodeStyling(QR_CODE_OPTIONS as any);

  qrCode.append(qrCodeContainer);

  // Add border radius to the QR code container
  const qrCodeElement = qrCodeContainer.querySelector("canvas");
  if (qrCodeElement) {
    qrCodeElement.style.borderRadius = "var(--chakra-radii-md)";
  }
}

export function onRemove() {
  console.log("Autodarts Tools: QR Code feature cleanup");
}
