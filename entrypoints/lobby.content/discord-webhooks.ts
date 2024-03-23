import { waitForElement } from "@/utils";
import { AutodartsToolsConfig } from "@/utils/storage";

export async function discordWebhooks() {
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
