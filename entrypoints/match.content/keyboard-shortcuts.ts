import type { IConfig } from "@/utils/storage";

import { AutodartsToolsConfig } from "@/utils/storage";

let keydownHandler: ((event: KeyboardEvent) => void) | undefined;

const buttonLabels: Record<string, string[]> = {
  nextLeg: [ "next leg", "nächstes leg", "volgende leg", "next set", "nächster satz", "volgende set" ],
  resetBoard: [ "reset", "zurücksetzen" ],
  // The referee button is identified by its aria-label "Call referee"
  referee: [ "call referee", "referee", "schiedsrichter", "scheidsrechter" ],
};

function findButtonWithText(labels: string[]): HTMLElement | undefined {
  const buttons = document.querySelectorAll("button");
  for (const button of buttons) {
    const text = button.textContent?.trim().toLowerCase() ?? "";
    const ariaLabel = button.getAttribute("aria-label")?.trim().toLowerCase() ?? "";
    if (labels.some(label => text.includes(label) || ariaLabel.includes(label))) {
      return button as HTMLElement;
    }
  }
  return undefined;
}

export async function keyboardShortcuts() {
  const config: IConfig = await AutodartsToolsConfig.getValue();

  keydownHandler = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    // Ignore keystrokes while typing in inputs or editable elements
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) return;

    const key = event.key.toLowerCase();
    const actions: [string, string[]][] = [
      [ config.shortcuts.nextLeg, buttonLabels.nextLeg ],
      [ config.shortcuts.resetBoard, buttonLabels.resetBoard ],
      [ config.shortcuts.referee, buttonLabels.referee ],
    ];

    for (const [ shortcutKey, labels ] of actions) {
      if (shortcutKey && key === shortcutKey.toLowerCase()) {
        const button = findButtonWithText(labels);
        if (button) {
          event.preventDefault();
          button.click();
        }
        return;
      }
    }
  };

  window.addEventListener("keydown", keydownHandler);
  console.log("Autodarts Tools: Keyboard Shortcuts initialized");
}

export function keyboardShortcutsOnRemove() {
  if (keydownHandler) {
    window.removeEventListener("keydown", keydownHandler);
    keydownHandler = undefined;
  }
}
