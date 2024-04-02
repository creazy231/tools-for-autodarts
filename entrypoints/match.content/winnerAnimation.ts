import { addStyles, waitForElement } from "@/utils";
import { getDartsThrown, getWinnerPlayerCard } from "@/utils/getElements";
import type { IConfig } from "@/utils/storage";
import { AutodartsToolsConfig } from "@/utils/storage";
import { isX01 } from "@/utils/helpers";

export async function removeWinnerAnimation() {
  await waitForElement("#ad-ext-turn");

  try {
    const winnerAnimationContainer = document.querySelector(".ad-ext_winner-animation");
    if (!winnerAnimationContainer) return;
    document.getElementById("ad-ext_winner-animation--message")?.remove();
    const winnerScoreEl = winnerAnimationContainer.querySelector(".ad-ext-player-score");
    if (winnerScoreEl) (winnerScoreEl as HTMLElement).style.fontSize = "";
    document.querySelector(".ad-ext_winner-animation")?.classList.remove("ad-ext_winner-animation");
  } catch (e) {
    console.error("Autodarts Tools: Winner Animation - Error: ", e);
  }
}

export async function winnerAnimation() {
  addStyles(`
      .ad-ext-player-winner .ad-ext-player-score {
        text-align: center;
        line-height: 1;
      }
        #ad-ext_winner-animation--message {
            text-align: center;
            line-height: 1;
          }

          .ad-ext_winner-animation {
            position: relative;
            z-index: 1;
          }

          .ad-ext_winner-animation > div:first-child {
            background: linear-gradient(0deg, #000, #272727);
          }

          .ad-ext_winner-animation:before,
          .ad-ext_winner-animation:after {
            content: "";
            position: absolute;
            left: -2px;
            top: -2px;
            background: linear-gradient(
              45deg,
              #fb0094,
              #0000ff,
              #00ff00,
              #ffff00,
              #ff0000,
              #fb0094,
              #0000ff,
              #00ff00,
              #ffff00,
              #ff0000
            );
            background-size: 400%;
            width: calc(100% + 4px);
            height: calc(100% + 4px);
            z-index: -1;
            animation: steam 20s linear infinite;
            border-radius: 5px;
          }
          @keyframes steam {
            0% {
              background-position: 0 0;
            }
            50% {
              background-position: 400% 0;
            }
            100% {
              background-position: 0 0;
            }
          }

          .ad-ext_winner-animation:after {
            filter: blur(50px);
          }

        `);

  await waitForElement("#ad-ext-turn");

  try {
    const config: IConfig = await AutodartsToolsConfig.getValue();
    if (!config.winnerAnimation.enabled && !config.thrownDartsOnWin.enabled) return;

    const winnerPlayerCard = getWinnerPlayerCard();

    const winnerScoreEl = winnerPlayerCard?.querySelector(".ad-ext-player-score");
    if (!winnerScoreEl) return;

    const dartsThrown = getDartsThrown(winnerPlayerCard as HTMLElement);

    if (config.thrownDartsOnWin.enabled) (winnerScoreEl as HTMLElement).innerText = `${dartsThrown} Darts`;

    if (!config.winnerAnimation.enabled) return;

    const winnerPlayerCardContainer = winnerPlayerCard?.parentElement;
    winnerPlayerCardContainer?.classList.add("ad-ext_winner-animation");

    const winnerScoreElHeight = winnerScoreEl.clientHeight;
    let winnerScoreWrapperEl = winnerPlayerCard?.querySelector(".ad-ext_winner-score-wrapper");

    if (!winnerScoreWrapperEl) {
      winnerScoreWrapperEl = document.createElement("div");
      winnerScoreWrapperEl.classList.add("ad-ext_winner-score-wrapper");
      winnerScoreEl.parentNode?.insertBefore(winnerScoreWrapperEl, winnerScoreEl);
      winnerScoreWrapperEl.appendChild(winnerScoreEl);

      (winnerScoreWrapperEl as HTMLElement).style.height = `${winnerScoreElHeight}px`;
    }

    const winnerAnimationMessageElement = document.createElement("p");
    winnerAnimationMessageElement.id = "ad-ext_winner-animation--message";
    winnerAnimationMessageElement.textContent = "Game Shot!";
    winnerAnimationMessageElement.style.fontSize = `${winnerScoreElHeight / 5 * 2.2}px`;
    winnerAnimationMessageElement.style.lineHeight = `${winnerScoreElHeight / 5 * 3.6}px`;

    (winnerScoreEl as HTMLElement).style.fontSize = `${winnerScoreElHeight / 5 * 1.4}px`;
    winnerScoreWrapperEl.appendChild(winnerAnimationMessageElement);

    if (!isX01()) return;

    const baseScore = document.querySelector("#ad-ext-game-variant")?.nextSibling?.textContent;

    if (!baseScore || !dartsThrown) return;

    const motivationMapping = {
      v121: [ 3, 4, 5, 6 ],
      v170: [ 3, 5, 7, 9 ],
      v301: [ 6, 9, 12, 15 ],
      v501: [ 9, 15, 20, 25 ],
      v701: [ 12, 18, 23, 28 ],
      v901: [ 16, 22, 27, 32 ],
    };

    const motivationText = [ "UNBELIEVABLE!", "Splendid Game!", "Great Game!", "Nice Game!" ];

    const baseScoreKeys = motivationMapping[`v${baseScore}`];
    baseScoreKeys.some((key, index) => {
      if (dartsThrown <= key) {
        winnerAnimationMessageElement.textContent = motivationText[index];
        return true;
      }
      return false;
    });
  } catch (e) {
    console.error("Autodarts Tools: Winner Animation - Error: ", e);
  }
}
