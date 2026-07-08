import { waitForElement } from "@/utils";

let checkPlayersInterval: NodeJS.Timeout | null = null;
let playerRows: HTMLTableRowElement[] = [];
let shuffledPlayerNames: string[] = [];

export async function shufflePlayers() {
  try {
    const buttonsContainer = await waitForElement("#root > div > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > div:last-of-type") as HTMLDivElement;

    if (document.querySelector("#autodarts-tools-shuffle-button")) return;

    const button = buttonsContainer.querySelector("button")?.cloneNode(true) as HTMLButtonElement;

    button.id = "autodarts-tools-shuffle-button";
    button.innerText = "Shuffle";
    button.style.color = "var(--chakra-colors-white)";
    button.style.background = "var(--chakra-colors-whiteAlpha-200)";
    button.style.borderColor = "var(--chakra-colors-whiteAlpha-200)";
    button.style.maxWidth = "7rem";

    button.addEventListener("click", handleShuffle);

    if (checkPlayersInterval) clearInterval(checkPlayersInterval);
    checkPlayersInterval = setInterval(checkPlayers, 500);

    buttonsContainer.appendChild(button);
  } catch (e) {
    // silence is golden
  }
}

async function checkPlayers() {
  const rows = document.querySelectorAll("#root > div > div:nth-of-type(2) > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) table > tbody > tr");
  playerRows = rows as unknown as HTMLTableRowElement[];
}

function getPlayerNameFromRow(row: HTMLTableRowElement) {
  return row.querySelector("td:nth-of-type(2) > span > div p")?.textContent;
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
  const playerNames = Array.from(playerRows).map(row => row.querySelector("td:nth-of-type(2) > span > div p")?.textContent);

  // shuffle the player names by ordering them in a random order
  shuffledPlayerNames = [ ...playerNames ] as string[];

  let shuffledArrayIsDifferent = playerNames.length < 2;
  while (!shuffledArrayIsDifferent) {
    // Fisher-Yates (Knuth) shuffle algorithm
    for (let i = shuffledPlayerNames.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      // Swap elements at indices i and j
      [ shuffledPlayerNames[i], shuffledPlayerNames[j] ] = [ shuffledPlayerNames[j], shuffledPlayerNames[i] ];
    }
    shuffledArrayIsDifferent = !playerNames.every((value, index) => value === shuffledPlayerNames[index]);
  }

  const playerButtons = {};

  function updatePlayerButtons() {
    for (const row of playerRows) {
      const playerName = row.querySelector("td:nth-of-type(2) > span > div p")?.textContent;
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
