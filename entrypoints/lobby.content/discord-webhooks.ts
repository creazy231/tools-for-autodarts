import { waitForElement } from "@/utils";
import { AutodartsToolsConfig } from "@/utils/storage";

const iconDiscord = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02M8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12m6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.83 2.12-1.89 2.12\"/></svg>";

const iconCheck = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"m10 16.4l-4-4L7.4 11l2.6 2.6L16.6 7L18 8.4z\"/></svg>";

export async function discordWebhooks() {
  const config = await AutodartsToolsConfig.getValue();

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

    discordButton.addEventListener("click", () => {
      discordButton.setAttribute("disabled", "true");
      sendWebhook();
      discordButton.innerHTML = iconCheck;
      setTimeout(() => {
        discordButton.innerHTML = iconDiscord;
        discordButton.removeAttribute("disabled");
      }, 5000);
    });
    lobbyBoardSelectParentElement.appendChild(discordButton);
  } else {
    await sendWebhook();
  }
}

async function sendWebhook() {
  try {
    const lobbyLinkElement = await waitForElement("#root input") as HTMLInputElement;
    const lobbyLink = lobbyLinkElement.value.split("#")[0];

    const settingsTableElement = await waitForElement("#root table tbody") as HTMLTableSectionElement;
    const settingsRows = Array.from(settingsTableElement.children) as HTMLTableRowElement[];
    const settings = settingsRows.map((el: HTMLTableRowElement) => {
      return {
        key: el.children[0].textContent,
        value: el.children[1].textContent,
      };
    });

    const fields = settings.map((setting) => {
      return {
        name: setting.key,
        value: setting.value,
        inline: true,
      };
    });

    const config = await AutodartsToolsConfig.getValue();

    if (!lobbyLink) return;

    await fetch(config.discord.url, {
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
            fields,
          },
        ],
        username: "Autodarts Tools",
        avatar_url: "https://lh3.googleusercontent.com/YwAEtrxsMxCS_nQpaTE96s4lBqmcGAI1MyI88-4E1vXK4EFoe3kTInegjd-7P2bRsWFPN1bRW5dVKBTcX8oQbeEg",
        attachments: [],
      }),
    });
  } catch (e) {
    console.error("Autodarts Tools: Discord Webhook - Error sending discord webhook: ", e);
  }
}
