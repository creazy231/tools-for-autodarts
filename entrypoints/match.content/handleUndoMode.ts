import type { IMatchStatus } from "@/utils/storage";
import { AutodartsToolsMatchStatus } from "@/utils/storage";
import { getUndoBtn } from "@/utils/getElements";

export async function handleUndoMode() {
  const undoButton = getUndoBtn();
  undoButton?.addEventListener("click", async () => {
    const matchStatus: IMatchStatus = await AutodartsToolsMatchStatus.getValue();
    await AutodartsToolsMatchStatus.setValue({
      ...matchStatus,
      isInUndoMode: true,
    });
  });
}
