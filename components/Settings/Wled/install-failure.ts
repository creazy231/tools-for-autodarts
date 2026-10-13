import type { InstallFailure } from "@/utils/wled-pack-install";

import { t } from "@/utils/i18n";

/**
 * What the packs dialog says of an install that failed (utils/wled-pack-install.ts):
 * the install view of a whole pack, and a single animation's row. Called in a
 * template or `computed`, it follows the language. `address` is the WLED's
 * origin, such as http://192.168.0.227.
 */
export function installFailureText(failure: InstallFailure, address: string): string {
  const host = hostOf(address);
  switch (failure.reason) {
    case "unreachable": return t("wled.packs.errors.unreachable", { address: host });
    case "not-wled": return t("wled.packs.errors.notWled", { address: host });
    case "not-matrix": return t("wled.packs.errors.notMatrix");
    case "effect-missing": return t("wled.packs.errors.effectMissing", { effect: failure.effect });
    case "presets-unreadable": return t("wled.packs.errors.presetsUnreadable");
    case "no-slots": return t("wled.packs.errors.noSlots", { needed: failure.needed, free: failure.free });
    case "no-room": return t("wled.packs.errors.noRoom", { needed: failure.neededKb, free: failure.freeKb, address });
    case "locked": return t("wled.packs.errors.locked");
    case "upload-failed": return t("wled.packs.errors.uploadFailed", { file: failure.file });
    case "restored": return t("wled.packs.errors.restored");
    case "not-restored": return t("wled.packs.errors.notRestored");
    case "pack-unreadable": return t("wled.packs.errors.packUnreadable");
  }
  return "";
}

function hostOf(address: string): string {
  try {
    return new URL(address).host;
  } catch {
    return address;
  }
}
