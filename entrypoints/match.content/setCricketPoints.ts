import {
  AutodartsToolsCricketClosedPoints,
} from "@/utils/storage";

export async function setCricketClosedPoints(playerCount: number) {
  const cricketContainer = document.getElementById("ad-ext-turn")?.nextElementSibling;
  const cricketPointTable = cricketContainer?.children[0]?.children[1];

  if (!cricketPointTable?.children) return;
  const closedPoints: number[] = [];

  [ ...cricketPointTable.children ].forEach((el, i) => {
    if (i % playerCount === 0) {
      const rowCount = (i / playerCount) + 1;
      const rowPoints = (rowCount === 7 ? 25 : 21 - rowCount); // Bulls fix
      if (el.children.length === 3) {
        closedPoints.push(rowPoints);
      }
    }
  });

  await AutodartsToolsCricketClosedPoints.setValue(closedPoints);
}
