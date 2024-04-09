import { waitForElement } from "@/utils";
import type { IConfig } from "@/utils/storage";
import { AutodartsToolsConfig } from "@/utils/storage";

export async function nextPlayerAfter3dartsButton() {
  try {
    const hasNextPlayerAfter3dartsButton = document.getElementById("adt-nextPlayerAfter3darts-button");
    if (hasNextPlayerAfter3dartsButton) return;

    const config: IConfig = await AutodartsToolsConfig.getValue();
    let isNextPlayerAfter3dartsEnabled = config.nextPlayerAfter3darts.enabled;

    const buttonsContainer = await waitForElement("#root > div > div:nth-of-type(2) > div > div > div:nth-of-type(3) > div") as HTMLDivElement;
    const button = buttonsContainer.children[0].cloneNode(true) as HTMLButtonElement;

    if (button.innerText !== "Start") return;

    button.id = "adt-nextPlayerAfter3darts-button";
    button.innerText = "Next after 3 darts ON";
    button.style.color = "var(--chakra-colors-red-500)";

    button.addEventListener("click", () => {
      button.textContent = isNextPlayerAfter3dartsEnabled ? "Next after 3 darts OFF" : "Next after 3 darts ON";
      button.style.color = isNextPlayerAfter3dartsEnabled ? "var(--chakra-colors-white-500)" : "var(--chakra-colors-red-500)";
      isNextPlayerAfter3dartsEnabled = !isNextPlayerAfter3dartsEnabled;

      AutodartsToolsConfig.setValue({ ...config, nextPlayerAfter3darts: { ...config.nextPlayerAfter3darts, enabled: isNextPlayerAfter3dartsEnabled } });
    });

    buttonsContainer.appendChild(button);
  } catch (e) {
    console.error("Autodarts Tools: Auto Start - Error adding NextPlayerAfter3darts button: ", e);
  }
}
