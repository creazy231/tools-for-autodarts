import { AutodartsToolsConfig } from "@/utils/storage";
import { addStyles } from "@/utils";

export async function scoreSmaller() {
  addStyles(`
        .adp_points-small { font-size: 3em!important; }
        `);

  const activePlayerCardPointsEl = document.querySelector(".ad-ext-player-active .ad-ext-player-score");
  const inactivePlayerCardPointsElArr = [ ...document.querySelectorAll(".ad-ext-player-inactive .ad-ext-player-score") ];

  const { inactiveSmall } = await AutodartsToolsConfig.getValue();

  const setScoreSmaller = () => {
    console.log("score Smaller", inactiveSmall);
    if (!inactiveSmall.enabled) return;
    console.log("score Smaller!");
    if (inactivePlayerCardPointsElArr.length && activePlayerCardPointsEl) {
      activePlayerCardPointsEl.classList.remove("adp_points-small");
      [ ...inactivePlayerCardPointsElArr ].forEach(el => el.classList.add("adp_points-small"));
    }
  };

  setScoreSmaller();

  AutodartsToolsConfig.watch(async () => {
    setScoreSmaller();
  });
}
