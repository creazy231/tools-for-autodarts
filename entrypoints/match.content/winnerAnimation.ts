import { addStyles, waitForElement } from "@/utils";
import { getWinnerPlayerCard } from "@/utils/getElements";

export async function winnerAnimation() {
  addStyles(`
      .ad-ext-player-score {
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
    console.log("winner animation");
    const winnerPlayerCard = getWinnerPlayerCard();
    const winnerPlayerCardContainer = getWinnerPlayerCard()?.parentElement;
    winnerPlayerCardContainer?.classList.add("ad-ext_winner-animation");

    const winnerScoreEl = winnerPlayerCard?.querySelector(".ad-ext-player-score");

    if (!winnerScoreEl) return;
    const winnerScoreWrapperEl = document.createElement("div");
    winnerScoreEl.parentNode?.insertBefore(winnerScoreWrapperEl, winnerScoreEl);
    winnerScoreWrapperEl.appendChild(winnerScoreEl);

    const winnerScoreElHeight = winnerScoreEl.clientHeight;
    winnerScoreWrapperEl.style.height = `${winnerScoreElHeight}px`;

    const winnerAnimationMessageElement = document.createElement("p");
    winnerAnimationMessageElement.id = "ad-ext_winner-animation--message";
    winnerAnimationMessageElement.textContent = "Game Shot!";
    winnerAnimationMessageElement.style.fontSize = `${winnerScoreElHeight / 5 * 3}px`;

    const finalScoreEl = winnerPlayerCard?.querySelector(".ad-ext-player-score");
    if (finalScoreEl) {
      (finalScoreEl as HTMLElement).style.fontSize = `${winnerScoreElHeight / 5 * 2}px`;
      winnerScoreWrapperEl.appendChild(winnerAnimationMessageElement);
    }
  } catch (e) {
    console.error("Autodarts Tools: Winner Animation - Error: ", e);
  }
}
