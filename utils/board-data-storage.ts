export interface IBoard {
  /**
   * Which board this is. Not every frame on `autodarts.boards` carries one, and
   * the record has held it all along by way of the spread that writes it — see
   * `isWatchedBoard` in utils/websocket-helpers.ts, which needs it to tell a
   * board on screen from one that has nothing to do with this page.
   */
  id?: string;
  connected: boolean;
  event: string;
  numThrows: number;
  status: string;
}

export const defaultBoardData: IBoard = {
  connected: false,
  event: "",
  numThrows: 0,
  status: "",
};

export const AutodartsToolsBoardData: WxtStorageItem<IBoard, any> = storage.defineItem(
  "local:board-data",
  {
    defaultValue: defaultBoardData,
  },
);
