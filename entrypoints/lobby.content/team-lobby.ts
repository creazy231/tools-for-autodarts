import { waitForElement } from "@/utils";
import { AutodartsToolsLobbyData } from "@/utils/lobby-data-storage";
import type { ILobbyStatus } from "@/utils/storage";
import type { ILobbies } from "@/utils/websocket-helpers";

let lobbyDataWatcherUnwatch: any;
// Track whether the host has been removed already
let hostAlreadyRemoved = false;

export async function teamLobby() {
  console.log("Autodarts Tools: Team Lobby - Starting");
  // Reset the tracking flag when starting a new lobby session
  hostAlreadyRemoved = false;

  try {
    const lobbyData = await AutodartsToolsLobbyData.getValue();
    if (lobbyData?.isPrivate) {
      processTeamLobby(lobbyData).catch(console.error);
      lobbyDataWatcherUnwatch?.();
      lobbyDataWatcherUnwatch = AutodartsToolsLobbyData.watch((data: ILobbies | undefined) => {
        if (!data) return;
        processTeamLobby(data).catch(console.error);
      });
    }
  } catch (e) {
    console.error("Autodarts Tools: Team Lobby - Error: ", e);
  }
}

async function processTeamLobby(lobbyStatus: ILobbyStatus) {
  console.log("Autodarts Tools: Team Lobby - Processing");

  await new Promise(resolve => setTimeout(resolve, 200));
  await waitForElement(".ad-ext-player-name");
  const username = lobbyStatus.host?.name;

  // Only attempt to remove the host if they haven't been removed yet
  if (!hostAlreadyRemoved) {
    // Find all tr elements that might contain player information
    const rows = [ ...document.querySelectorAll("tr") ];

    // Process each row
    for (const row of rows) {
      // Skip rows containing "via" text
      if (row.textContent?.includes("via")) {
        continue;
      }

      // Check if this row contains the host username
      const playerNameElement = row.querySelector(".ad-ext-player-name > p");
      if (playerNameElement?.textContent?.trim()?.toLowerCase() === username?.toLowerCase()) {
        // Find and click the remove button
        const removeBtn = row.querySelector("button:last-of-type") as HTMLButtonElement;
        if (removeBtn) {
          removeBtn.click();
          // Set the flag to true after removing the host
          hostAlreadyRemoved = true;
          console.log("Autodarts Tools: Team Lobby - Host removed once");
          break; // Exit the loop once removed
        }
      }
    }
  }

  await new Promise(resolve => setTimeout(resolve, 200));

  const useMyBoardButtons = [ ...document.querySelectorAll("button") ]
    .filter(button => button.textContent?.trim() === "Use my board");

  useMyBoardButtons.forEach((button) => {
    button.click();
  });
}

export async function teamLobbyOnRemove() {
  lobbyDataWatcherUnwatch?.();
  lobbyDataWatcherUnwatch = null;
  // Reset the flag when the lobby is removed
  hostAlreadyRemoved = false;
}
