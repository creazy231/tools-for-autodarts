import { AutodartsToolsConfig } from "@/utils/storage";
import { waitForElement } from "@/utils";

let colorChangeInterval: NodeJS.Timeout | null = null;

export async function colorChange() {
  handleChangeColor().catch(console.error);
  colorChangeInterval = setInterval(handleChangeColor, 500);
}

async function handleChangeColor() {
  try {
    const config = await AutodartsToolsConfig.getValue();

    const elements: HTMLElement[] = [];

    const playerDisplay = await waitForElement("#ad-ext-player-display") as HTMLElement;
    const playerScores = playerDisplay.querySelectorAll(".ad-ext-player");

    playerScores.forEach(element => elements.push(element as HTMLElement));

    const playerNames = playerDisplay.querySelectorAll("a");
    playerNames.forEach(element => elements.push(element as HTMLElement));

    const turnThrows = document.querySelector("#ad-ext-turn")?.childNodes;
    if (turnThrows) turnThrows.forEach(element => elements.push(element as HTMLElement));

    // for each in elements set variable: `--chakra-colors-blue-500: red;`
    elements.forEach((element) => {
      element.style.setProperty("--chakra-colors-blue-500", config.colors.background);
      element.style.color = `${config.colors.text}`;
    });
  } catch (e) {
    console.error("Autodarts Tools: Color Change - Error changing color: ", e);
    if (colorChangeInterval) clearInterval(colorChangeInterval);
  }
}

export async function onRemove() {
  if (colorChangeInterval) clearInterval(colorChangeInterval);
}
