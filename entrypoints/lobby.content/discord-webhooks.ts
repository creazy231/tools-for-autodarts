import { waitForElement } from "@/utils";
import { AutodartsToolsLobbyData } from "@/utils/lobby-data-storage";
import { AutodartsToolsConfig } from "@/utils/storage";

const iconDiscord = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02M8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12m6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.83 2.12-1.89 2.12\"/></svg>";

const iconCheck = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"m10 16.4l-4-4L7.4 11l2.6 2.6L16.6 7L18 8.4z\"/></svg>";

// Timer reference
let autoStartTimer: number | null = null;
// Store webhook message data for later editing
let webhookMessageId: string | null = null;
let webhookUrl: string | null = null;
// Store a copy of the lobby settings for later use
let storedLobbyFields: Array<{ name: string; value: string; inline: boolean }> = [];
// Flag to prevent duplicate message updates
let messageUpdated = false;

export async function discordWebhooks() {
  console.log("Autodarts Tools: Discord Webhooks - Starting");

  const config = await AutodartsToolsConfig.getValue();
  const lobbyData = await AutodartsToolsLobbyData.getValue();

  // Set up listener for manual start button clicks
  setupStartButtonListener();

  if (config.discord.manually) {
    const lobbyBoardSelectElement = await waitForElement("#root select") as HTMLSelectElement;
    const lobbyBoardSelectParentElement = lobbyBoardSelectElement.parentElement?.parentElement;
    if (!lobbyBoardSelectParentElement) return;
    const refreshButton = lobbyBoardSelectParentElement.querySelector("button");

    if (!refreshButton) return;

    // create a copy of the refresh button and add "D" as text content
    // then add the new button to the parent element
    const discordButton = refreshButton.cloneNode() as HTMLButtonElement;
    discordButton.innerHTML = iconDiscord;
    discordButton.title = "Send Discord Webhook";

    // Apply AppButton styling
    discordButton.classList.add(
      "user-select-none", "position-relative", "white-space-nowrap", "vertical-align-middle",
      "line-height-1.2", "transition-property-common", "transition-duration-normal",
      "group", "relative", "inline-flex", "appearance-none", "items-center",
      "justify-center", "border-none", "outline-offset-2", "outline-transparent",
      "transition-colors",
    );

    // Apply rounded corners and font weight
    discordButton.style.borderRadius = "var(--adt-radius-md)";
    discordButton.style.fontWeight = "600";

    // Apply default style
    discordButton.style.backgroundColor = "var(--adt-overlay)";
    discordButton.style.color = "var(--adt-text)";

    // Apply size (md)
    discordButton.style.height = "2.5rem";
    discordButton.style.minWidth = "2.5rem";
    discordButton.style.paddingLeft = "1rem";
    discordButton.style.paddingRight = "1rem";
    discordButton.style.fontSize = "1rem";

    discordButton.addEventListener("click", () => {
      discordButton.setAttribute("disabled", "true");

      // Apply disabled style
      discordButton.style.cursor = "not-allowed";
      discordButton.style.opacity = "0.5";

      sendWebhook();
      discordButton.innerHTML = iconCheck;

      // Apply success style when clicked
      discordButton.style.border = "1px solid var(--adt-success-border)";
      discordButton.style.backgroundColor = "var(--adt-success-surface)";
      discordButton.style.color = "var(--adt-text)";

      setTimeout(() => {
        discordButton.innerHTML = iconDiscord;
        discordButton.removeAttribute("disabled");

        // Restore default style
        discordButton.style.border = "none";
        discordButton.style.backgroundColor = "var(--adt-overlay)";
        discordButton.style.color = "var(--adt-text)";
      }, 5000);
    });

    // Add hover and active states
    discordButton.addEventListener("mouseover", () => {
      if (!discordButton.hasAttribute("disabled")) {
        discordButton.style.backgroundColor = "var(--adt-overlay-strong)";
      }
    });

    discordButton.addEventListener("mouseout", () => {
      if (!discordButton.hasAttribute("disabled")) {
        discordButton.style.backgroundColor = "var(--adt-overlay)";
      }
    });

    discordButton.addEventListener("mousedown", () => {
      if (!discordButton.hasAttribute("disabled")) {
        discordButton.style.backgroundColor = "var(--adt-overlay-strong)";
      }
    });

    lobbyBoardSelectParentElement.appendChild(discordButton);
  } else {
    await sendWebhook();
  }
}

// Function to set up a mutation observer to watch for the Start Game button
function setupStartButtonListener() {
  // Create a MutationObserver to watch for button additions to the DOM
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        const startButtons = Array.from(document.querySelectorAll("button")).filter(
          button => button.textContent?.trim().toLowerCase() === "start game",
        );

        if (startButtons.length > 0) {
          startButtons.forEach((button) => {
            // Only add listener if it doesn't already have one
            if (!button.hasAttribute("data-autodarts-tools-listener")) {
              button.setAttribute("data-autodarts-tools-listener", "true");
              button.addEventListener("click", handleManualGameStart);
              console.log("Autodarts Tools: Discord Webhooks - Added listener to Start Game button");
            }
          });
        }
      }
    }
  });

  // Start observing the document body for changes
  observer.observe(document.body, { childList: true, subtree: true });

  // Check for existing buttons
  const existingStartButtons = Array.from(document.querySelectorAll("button")).filter(
    button => button.textContent?.trim().toLowerCase() === "start game",
  );

  if (existingStartButtons.length > 0) {
    existingStartButtons.forEach((button) => {
      if (!button.hasAttribute("data-autodarts-tools-listener")) {
        button.setAttribute("data-autodarts-tools-listener", "true");
        button.addEventListener("click", handleManualGameStart);
        console.log("Autodarts Tools: Discord Webhooks - Added listener to existing Start Game button");
      }
    });
  }
}

// Function to handle manual game start
async function handleManualGameStart() {
  console.log("Autodarts Tools: Discord Webhooks - Manual start detected");

  // Prevent duplicate message updates
  if (messageUpdated) {
    return;
  }

  // Clear the auto-start timer if it's running
  if (autoStartTimer !== null) {
    clearTimeout(autoStartTimer);
    autoStartTimer = null;
  }

  // Update Discord message if we have the necessary data
  if (webhookMessageId && webhookUrl) {
    try {
      await updateDiscordMessage("manual");
      messageUpdated = true;
    } catch (error) {
      console.error("Autodarts Tools: Discord Webhooks - Error updating Discord message on manual start:", error);
    }
  }
}

// Function to update the Discord message and save config
async function updateDiscordMessage(trigger: "timer" | "manual") {
  if (!webhookMessageId || !webhookUrl) return;

  console.log(`Autodarts Tools: Discord Webhooks - Updating Discord message (trigger: ${trigger})`);

  // Get the current config
  const config = await AutodartsToolsConfig.getValue();

  // Prepare fields for the updated embed
  let updatedFields: Array<{ name: string; value: string; inline: boolean }> = [];
  if (config.discord.autoStartAfterTimer?.enabled) {
    // Add game type and player fields if available
    updatedFields = [
      ...storedLobbyFields,
      {
        name: "\u200B",
        value: "\u200B",
        inline: false,
      },
      {
        name: "",
        value: "🎮 Game has started!",
        inline: false,
      },
    ];
  }

  const response = await fetch(`${webhookUrl}/messages/${webhookMessageId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: "🎯 **NEW GAME ON AUTODARTS** 🎯\n\n_ _",
      embeds: [
        {
          title: "Settings",
          color: 15158332, // Red tone (decimal for #E74C3C)
          fields: updatedFields,
          image: {
            url: "https://i.imgur.com/lnkebyw.png",
          },
        },
      ],
    }),
  });

  const messageData = await response.json();
  const messageId = messageData.id;

  // Save the messageId to config
  await AutodartsToolsConfig.setValue({
    ...config,
    discord: {
      ...config.discord,
      autoStartAfterTimer: {
        enabled: config.discord.autoStartAfterTimer?.enabled ?? false,
        minutes: config.discord.autoStartAfterTimer?.minutes ?? 5,
        stream: config.discord.autoStartAfterTimer?.stream ?? false,
        matchId: config.discord.autoStartAfterTimer?.matchId ?? "",
        messageId,
      },
    },
  });

  console.log("Autodarts Tools: Discord Webhook - Message updated, messageId saved:", messageId);
}

async function sendWebhook() {
  try {
    const lobbyLinkElement = await waitForElement("#root input") as HTMLInputElement;
    const lobbyLink = lobbyLinkElement.value.split("#")[0];

    let config = await AutodartsToolsConfig.getValue();
    await AutodartsToolsConfig.setValue({
      ...config,
      discord: {
        ...config.discord,
        autoStartAfterTimer: {
          enabled: config.discord.autoStartAfterTimer?.enabled ?? false,
          minutes: config.discord.autoStartAfterTimer?.minutes ?? 5,
          stream: config.discord.autoStartAfterTimer?.stream ?? false,
          matchId: lobbyLink,
          messageId: config.discord.autoStartAfterTimer?.messageId ?? "",
        },
      },
    });
    config = await AutodartsToolsConfig.getValue();

    const lobbyData = await AutodartsToolsLobbyData.getValue();

    if (!lobbyLink) return;

    // Format lobbyData keys to be more readable
    const formatKey = (key: string): string => {
      return key
        .replace(/([A-Z])/g, " $1") // Add space before capital letters
        .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
    };

    // Create fields from lobbyData
    const fields: Array<{ name: string; value: string; inline: boolean }> = [];

    // Add host as the first field if it exists
    if (lobbyData?.host?.name) {
      fields.push({
        name: "Host",
        value: lobbyData.host.name,
        inline: true,
      });
    }

    // Add settings fields
    if (lobbyData) {
      // First process settings object if it exists
      if (lobbyData.settings) {
        for (const [ key, value ] of Object.entries(lobbyData.settings)) {
          if (typeof value === "object") continue;

          fields.push({
            name: formatKey(key),
            value: String(value),
            inline: true,
          });
        }
      }

      // Then process top level properties (excluding host and other objects)
      for (const [ key, value ] of Object.entries(lobbyData)) {
        // Skip host and settings objects since we already processed them
        if (key === "host" || key === "settings" || key === "players") continue;

        // Skip filtered fields: createdAt, id, isPrivate
        if (key === "createdAt" || key === "id" || key === "isPrivate") continue;

        // Skip any non-primitive values
        if (typeof value === "object") continue;

        fields.push({
          name: formatKey(key),
          value: String(value),
          inline: true,
        });
      }
    }

    // Create the embed fields array
    const embedFields = [ ...fields ];

    // Add auto-start timestamp if enabled
    if (config.discord.autoStartAfterTimer?.enabled) {
      const minutesToAdd = config.discord.autoStartAfterTimer.minutes;
      const futureTimestamp = Math.floor(Date.now() / 1000) + (minutesToAdd * 60);

      // Add timestamp field to the embed
      embedFields.push({
        name: "\u200B",
        value: "\u200B",
        inline: false,
      });

      embedFields.push({
        name: "",
        value: `⌛ Game will auto-start: <t:${futureTimestamp}:R>`,
        inline: false,
      });
    }

    // Reset message updated flag before sending new webhook
    messageUpdated = false;

    const response = await fetch(`${config.discord.url}?wait=true`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: `🎯 **NEW GAME ON AUTODARTS** 🎯\n\n${lobbyLink}\n_ _`,
        embeds: [
          {
            title: "Settings",
            color: 8902706,
            fields: embedFields,
            image: {
              url: "https://i.imgur.com/lnkebyw.png",
            },
          },
        ],
        username: "Autodarts Tools",
        avatar_url: "https://lh3.googleusercontent.com/YwAEtrxsMxCS_nQpaTE96s4lBqmcGAI1MyI88-4E1vXK4EFoe3kTInegjd-7P2bRsWFPN1bRW5dVKBTcX8oQbeEg",
        attachments: [],
      }),
    });

    const messageData = await response.json();
    const messageId = messageData.id;

    console.log("Autodarts Tools: Discord Webhook - Message ID:", messageId);

    // Start auto-start timer if enabled
    if (config.discord.autoStartAfterTimer?.enabled) {
      startAutoStartTimer(config.discord.autoStartAfterTimer.minutes);
    }

    // Store webhook message data for later editing
    webhookMessageId = messageId;
    webhookUrl = config.discord.url;

    // Store a copy of the lobby settings for later use
    storedLobbyFields = [ ...fields ];

    return messageId;
  } catch (e) {
    console.error("Autodarts Tools: Discord Webhook - Error sending discord webhook: ", e);
    return null;
  }
}

// Function to start the auto-start timer
function startAutoStartTimer(minutes: number) {
  // Clear any existing timer
  if (autoStartTimer !== null) {
    clearTimeout(autoStartTimer);
  }

  console.log(`Autodarts Tools: Discord Webhooks - Starting auto-start timer for ${minutes} minutes`);

  // Convert minutes to milliseconds
  const milliseconds = minutes * 60 * 1000;

  // Set the timer
  autoStartTimer = window.setTimeout(async () => {
    try {
      console.log("Autodarts Tools: Discord Webhooks - Auto-start timer completed, starting game...");

      // Find and click the "Start game" button
      const startButtons = Array.from(document.querySelectorAll("button")).filter(
        button => button.textContent?.trim().toLowerCase() === "start game",
      );

      if (startButtons.length > 0) {
        console.log("Autodarts Tools: Discord Webhooks - Found 'Start game' button, clicking it");
        startButtons[0].click();

        // Edit the Discord message if we have the necessary data
        if (webhookMessageId && webhookUrl && !messageUpdated) {
          try {
            await updateDiscordMessage("timer");
          } catch (error) {
            console.error("Autodarts Tools: Discord Webhooks - Error updating Discord message:", error);
          }
        }
      } else {
        console.warn("Autodarts Tools: Discord Webhooks - Could not find 'Start game' button");
      }
    } catch (error) {
      console.error("Autodarts Tools: Discord Webhooks - Error in auto-start timer:", error);
    } finally {
      autoStartTimer = null;
    }
  }, milliseconds);
}
