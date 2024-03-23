import { waitForElement } from "@/utils";

let checkPlayersInterval: NodeJS.Timeout | null = null;
let playerRows: HTMLTableRowElement[] = [];
let shuffledPlayerNames: string[] = [];

export async function shufflePlayers() {
  try {
    const buttonsContainer = await waitForElement("#root > div > div:nth-of-type(2) > div > div > div:nth-of-type(3) > div") as HTMLDivElement;
    const button = buttonsContainer.children[0].cloneNode(true) as HTMLButtonElement;

    if (button.innerText !== "Start") return;

    button.setAttribute("id", "autodarts-tools-shuffle-button");
    button.innerText = "Shuffle";
    button.style.color = "var(--chakra-colors-white)";

    button.addEventListener("click", handleShuffle);

    checkPlayersInterval = setInterval(checkPlayers, 500);

    buttonsContainer.appendChild(button);
  } catch (e) {
    // silence is golden
  }
}

async function checkPlayers() {
  const rows = document.querySelectorAll("#root > div > div:nth-of-type(2) > div > div > div:nth-of-type(2) > div > table > tbody > tr");
  playerRows = rows as unknown as HTMLTableRowElement[];
}

function getPlayerNameFromRow(row: HTMLTableRowElement) {
  return row.querySelector("td:nth-of-type(2) > a > div p")?.textContent;
}

function getIndexByPlayerName(playerName: string) {
  for (let i = 0; i < playerRows.length; i++) {
    const row = playerRows[i];
    if (getPlayerNameFromRow(row) === playerName) return i;
  }
}

async function handleShuffle() {
  const shuffleButton = document.querySelector("#autodarts-tools-shuffle-button") as HTMLButtonElement;
  shuffleButton.setAttribute("disabled", "true");
  shuffleButton.innerText = "Shuffling...";

  if (checkPlayersInterval) clearInterval(checkPlayersInterval);

  // get player names from the rows
  const playerNames = Array.from(playerRows).map(row => row.querySelector("td:nth-of-type(2) > a > div p")?.textContent);

  // shuffle the player names by ordering them in a random order
  shuffledPlayerNames = [ ...playerNames ] as string[];

  let shuffledArrayIsDifferent = playerNames.length < 2;
  while (!shuffledArrayIsDifferent) {
    shuffledPlayerNames.sort(() => Math.random() - 0.5);
    shuffledArrayIsDifferent = !playerNames.every((value, index) => value === shuffledPlayerNames[index]);
  }

  const playerButtons = {};

  function updatePlayerButtons() {
    for (const row of playerRows) {
      const playerName = row.querySelector("td:nth-of-type(2) > a > div p")?.textContent;
      const playerButtonUp = row.querySelector("button:nth-of-type(1)");
      const playerButtonDown = row.querySelector("button:nth-of-type(2)");
      playerButtons[playerName!] = { up: playerButtonUp as HTMLButtonElement, down: playerButtonDown as HTMLButtonElement };
    }
  }

  updatePlayerButtons();

  let orderIsCorrect = false;
  while (!orderIsCorrect) {
    orderIsCorrect = true;

    for (let i = 0; i < shuffledPlayerNames.length; i++) {
      const playerName = shuffledPlayerNames[i];
      let playerIndex = getIndexByPlayerName(playerName);

      while (playerIndex !== i) {
        orderIsCorrect = false;

        playerButtons[playerName].up.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        await checkPlayers();
        updatePlayerButtons();

        playerIndex = getIndexByPlayerName(playerName);
      }
    }
  }

  checkPlayersInterval = setInterval(checkPlayers, 500);
  shuffleButton.removeAttribute("disabled");
  shuffleButton.innerText = "Shuffle";
}

export async function onRemove() {
  if (checkPlayersInterval) clearInterval(checkPlayersInterval);

  // reset default values
  checkPlayersInterval = null;
  playerRows = [];
  shuffledPlayerNames = [];
}
