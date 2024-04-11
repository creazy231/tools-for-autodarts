import "~/assets/tailwind.css";
import type { IConfig } from "@/utils/storage";
import {
  AutodartsToolsConfig, AutodartsToolsLobbyStatus,
  AutodartsToolsUrlStatus,
} from "@/utils/storage";

let lobbyNewReadyUnwatch: any;

export default defineContentScript({
  matches: [ "*://play.autodarts.io/*" ],
  cssInjectionMode: "ui",
  async main() {
    lobbyNewReadyUnwatch = AutodartsToolsUrlStatus.watch(async (url: string) => {
      const config: IConfig = await AutodartsToolsConfig.getValue();
      if (/\/lobbies\/*new\//.test(url)) {
        console.log("Autodarts Tools: Lobby New Ready");
        if (config.teamLobby.enabled) {
          const lobbyStatus = await AutodartsToolsLobbyStatus.getValue();
          const privateButton = [ ...document.querySelectorAll("button") ].find(btn => (btn as HTMLElement).innerText === "Private");
          const publicButton = [ ...document.querySelectorAll("button") ].find(btn => (btn as HTMLElement).innerText === "Public");

          const setPrivateState = async (isPrivate: boolean) => {
            await AutodartsToolsLobbyStatus.setValue({
              ...lobbyStatus,
              isPrivate,
            });
          };

          await setPrivateState(privateButton?.hasAttribute("data-active") || false);

          privateButton?.addEventListener("click", async () => {
            await setPrivateState(true);
          });

          publicButton?.addEventListener("click", async () => {
            await setPrivateState(false);
          });
        }
      }
    });
  },
});
