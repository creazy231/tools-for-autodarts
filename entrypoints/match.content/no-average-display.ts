import { AutodartsToolsConfig } from "@/utils/storage";
import { addStyles } from "@/utils";

export async function noAverageDisplay() {
  try {
    const config = await AutodartsToolsConfig.getValue();

    if (!config.noAverageDisplay.enabled) {
      return;
    }

    console.log("Autodarts Tools: No Average Display activated");
    addStyles(`
        .ad-ext-player > div > div:nth-of-type(2) { display: none!important; }
        `, "no-average-display");
  } catch (e) {
    console.error("Autodarts Tools: No Average Display - Error: ", e);
  }
}
