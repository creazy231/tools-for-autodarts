import { isBullOff } from "@/utils/helpers";

export const getPageContainer = (): Element | null => document.querySelector("#root > div > div:nth-of-type(2) > div > div");
export function getMenuBar(): Element | null {
  if (isBullOff()) {
    return document.getElementById("ad-ext-game-variant")?.parentElement?.parentElement || null;
  } else {
    return document.getElementById("ad-ext-game-variant")?.parentElement?.parentElement?.parentElement || null;
  }
}

export const getResetBtn = () => [ ...getMenuBar()?.querySelectorAll("button") as NodeListOf<HTMLButtonElement> ].find(el => el.textContent === "Reset");

export const getMenu = () => document.querySelector("#root > div > div") as HTMLElement | null;

export const getWinnerPlayerCard = () => document.querySelector(".ad-ext-player-winner");

export const getDartsThrown = (playerCard: HTMLElement) => playerCard?.nextElementSibling?.querySelectorAll("p")[1]?.textContent?.split("|")[0].trim().split("#")[1].trim();
