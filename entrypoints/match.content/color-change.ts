import { AutodartsToolsConfig } from "@/utils/storage";
import { waitForElement } from "@/utils";

let colorChangeInterval: NodeJS.Timeout | null = null;

export async function colorChange() {
  console.log("Autodarts Tools: color change");
  handleChangeColor().catch(console.error);
  colorChangeInterval = setInterval(handleChangeColor, 500);
}

async function handleChangeColor() {
  try {
    const config = await AutodartsToolsConfig.getValue();

    const elements: HTMLElement[] = [];

    const playerDisplay = await waitForElement("#ad-ext-player-display") as HTMLElement;
    const playerScores = playerDisplay.querySelectorAll(".ad-ext-player");
    const playerInfos = playerDisplay.querySelectorAll("div:nth-of-type(2)");
    const body = document.querySelector("body") as HTMLElement;

    playerScores.forEach(element => elements.push(element as HTMLElement));
    playerInfos.forEach(element => elements.push(element as HTMLElement));

    const playerNames = playerDisplay.querySelectorAll("a");
    playerNames.forEach(element => elements.push(element as HTMLElement));

    const turnThrows = document.querySelector("#ad-ext-turn")?.childNodes;
    if (turnThrows) turnThrows.forEach(element => elements.push(element as HTMLElement));

    const turnScoreElement = turnThrows![0] as HTMLElement;
    const turnScore = turnScoreElement.querySelector("p");
    if (turnScore) elements.push(turnScore as HTMLElement);

    // for each in elements set variable: `--adt-accent-hover: red;`
    elements.forEach((element) => {
      element.style.setProperty("background", config.colors.background);
      element.style.color = `${config.colors.text}`;
    });

    // Apply only text color to player name elements (no background)
    const playerNameElements = document.querySelectorAll(".ad-ext-player-name");
    playerNameElements.forEach((element) => {
      (element as HTMLElement).style.color = `${config.colors.text}`;
    });

    if (body && config.colors.enabled && config.colors.matchBackground) {
      body.style.setProperty("background-color", config.colors.matchBackground, "important");
      body.style.setProperty("background-image", "none", "important");
    }
  } catch (e) {
    console.error("Autodarts Tools: Color Change - Error changing color: ", e);
    if (colorChangeInterval) clearInterval(colorChangeInterval);
  }
}

export async function onRemove() {
  if (colorChangeInterval) clearInterval(colorChangeInterval);
  const body = document.querySelector("body") as HTMLElement;
  if (body) {
    body.style.removeProperty("background-color");
    body.style.removeProperty("background-image");
  }
}
