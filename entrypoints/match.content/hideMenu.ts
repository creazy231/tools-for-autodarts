import { waitForElement } from "@/utils";
import { getMenu, getMenuBar } from "@/utils/getElements";
import type { IConfig } from "@/utils/storage";
import { AutodartsToolsConfig } from "@/utils/storage";

export async function hideMenu() {
  const config: IConfig = await AutodartsToolsConfig.getValue();
  if (!config.menuDisabled) return;

  await waitForElement("#ad-ext-user-menu-extra");

  let menuActive: boolean = false;

  const menu = getMenu();
  const menuBar = getMenuBar();
  if (!menuBar || !menu) return;

  menu.style.display = "none";

  const settingsBtn = menuBar.querySelector(":scope > button") || menuBar.children[2];
  const settingsIcon = settingsBtn?.querySelector("svg") as Node;

  const menuHideBtn = document.createElement("button");
  menuHideBtn.id = "ad-ext-menu-hide";
  menuHideBtn.className = settingsBtn?.className || "";

  const menuHideBtnSVG = settingsIcon?.cloneNode(true) as SVGElement;
  menuHideBtnSVG.setAttribute("viewBox", "0 0 24 24");
  menuHideBtnSVG.style.height = "1.2em";
  menuHideBtnSVG.style.width = "1.2em";
  menuHideBtnSVG.children[0].setAttribute("d", "M3 18h18v-2H3zm0-5h18v-2H3zm0-7v2h18V6z");

  menuHideBtn.appendChild(menuHideBtnSVG);

  menuBar?.insertBefore(menuHideBtn, settingsBtn);

  menuHideBtn.addEventListener("click", () => {
    menuActive = !menuActive;
    menuHideBtn.toggleAttribute("data-active", menuActive);
    menu.style.display = menuActive ? "" : "none";
  });
}
