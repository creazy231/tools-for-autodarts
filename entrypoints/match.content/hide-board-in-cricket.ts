import { waitForElement } from "@/utils";
import { AutodartsToolsGameData } from "@/utils/game-data-storage";

export async function hideBoardInCricket() {
  if (document.querySelector("#adt-board-hide")) return;
  console.log("Autodarts Tools: Hiding board in match");

  await waitForElement("#ad-ext-player-display");
  const gameData = await AutodartsToolsGameData.getValue();
  if (gameData.match?.variant !== "Cricket") return;
  let boardActive: boolean = false;

  const stack = await waitForElement("#ad-ext-turn");

  const stackParent = stack.parentElement;
  if (!stackParent) return console.log("Autodarts Tools: No playboard found");

  const playboard = getLastChildren(stackParent);
  if (!playboard) return console.log("Autodarts Tools: No playboard found");
  const board = getLastChildren(playboard);

  if (!board) return console.log("Autodarts Tools: No board found");

  const menuBar = await waitForElement([ "#root > div > div:nth-of-type(2) > div .chakra-wrap", "#root > div > div:nth-of-type(2) > div > div > div > div:last-of-type" ]);
  if (!menuBar) return console.error("Autodarts Tools: No menu or menu bar found");

  const [ menuHideBtn, error ] = insertMenuItem(menuBar);
  if (!menuHideBtn) {
    return console.error(error);
  }

  const [ stackWrapper, stackError ] = await insertActionButtons(stack);

  if (!stackWrapper || stackError) {
    return console.error(stackError);
  }

  //        (nextLegBtn as HTMLElement).click();

  board.id = "ad-toggle-board";
  board.style.display = "none";

  playboard.style.gridTemplateColumns = "repeat(auto-fit, minmax(200px, 1fr))";

  stackWrapper.style.display = "flex";

  // Toggle menu function
  const toggleMenu = (forceState?: boolean) => {
    const shouldShowMenu = forceState !== undefined ? forceState : !boardActive;

    if (shouldShowMenu !== boardActive) {
      boardActive = shouldShowMenu;
      menuHideBtn.toggleAttribute("data-active", boardActive);
      board.style.display = boardActive ? "" : "none";
      playboard.style.gridTemplateColumns = boardActive ? "" : "repeat(auto-fit, minmax(200px, 1fr))";
      stackWrapper.style.display = !boardActive ? "flex" : "none";
    }
  };

  menuHideBtn.addEventListener("click", () => toggleMenu());

  let lastFinished = false;
  AutodartsToolsGameData.watch((data) => {
    if (!data.match) return;
    if (data.match.finished !== lastFinished) {
      lastFinished = data.match.finished;
      toggleMenu(lastFinished);
    }
  });
  // Initial state - hide menu
  toggleMenu(false);
}

export async function hideBoardInCricketOnRemove() {
  // restore the menu
  console.log("Autodarts Tools: Restoring Board in match");

  const menuToggleBtn = document.querySelector("#adt-board-hide");
  menuToggleBtn?.remove();

  const stackActions = document.querySelector("#adt-ext-stack-actions");
  stackActions?.remove();

  // Make the original menu visible again
  const board = document.querySelector("#ad-toggle-board") as HTMLElement;
  if (board) {
    board.style.display = "";
  }
}

function getLastChildren(element: HTMLElement | null): HTMLElement | null {
  if (!element) return null;
  if (element.children.length === 0) return null;
  return element.children[element.children.length - 1] as HTMLElement;
}

async function insertActionButtons(stack: HTMLElement): Promise<[HTMLElement | null, string | null]> {
  const wrapper = document.createElement("div");

  const style = document.createElement("style");

  style.innerHTML = `
    .ad-ext-button {
      display: inline-flex;
      appearance: none;
      -webkit-box-align: center;
      align-items: center;
      -webkit-box-pack: center;
      justify-content: center;
      user-select: none;
      position: relative;
      white-space: nowrap;
      vertical-align: middle;
      outline: transparent solid 2px;
      outline-offset: 2px;
      line-height: 1.2;
      border-radius: var(--chakra-radii-md);
      font-weight: var(--chakra-fontWeights-semibold);
      transition-property: var(--chakra-transition-property-common);
      transition-duration: var(--chakra-transition-duration-normal);
      background: var(--chakra-colors-whiteAlpha-200);
      color: var(--chakra-colors-whiteAlpha-900);
  }

  .ad-ext-button-icon {
    display: inline-flex;
    align-self: center;
    flex-shrink: 0;
    margin-inline-end: 0.5rem;
  }

   @media screen and (min-width: 48em) {
        .ad-ext-button {
            height: var(--chakra-sizes-8);
            min-width: var(--chakra-sizes-8);
            font-size: var(--chakra-fontSizes-sm);
            padding-inline-start: var(--chakra-space-3);
            padding-inline-end: var(--chakra-space-3);
        }
    }
  `;

  wrapper.appendChild(style);

  wrapper.style.display = "flex";
  wrapper.style.height = "100%";
  wrapper.style.flexDirection = "column";
  wrapper.style.justifyContent = "space-around";
  wrapper.id = "adt-ext-stack-actions";

  const undoButton = document.createElement("button");
  undoButton.type = "button";
  undoButton.classList.add("chakra-button", "ad-ext-button");

  const undoButtonWrapper = await getButton("Undo");

  if (undoButtonWrapper[1]) undoButton.appendChild(wrapIcon(undoButtonWrapper[1]));

  undoButton.append("Undo");
  undoButton.onclick = () => undoButtonWrapper[0]?.click();

  const nexButton = document.createElement("button");
  nexButton.type = "button";
  nexButton.classList.add("chakra-button", "ad-ext-button");

  const nextButtonWrapper = await getButton("Next");

  if (nextButtonWrapper[1]) nexButton.appendChild(wrapIcon(nextButtonWrapper[1]));

  nexButton.append("Next");
  nexButton.onclick = () => nextButtonWrapper[0]?.click();

  wrapper.appendChild(undoButton);
  wrapper.appendChild(nexButton);

  stack.appendChild(wrapper);
  return [ wrapper, null ];
}

function insertMenuItem(menuBar: HTMLElement): [HTMLElement | null, string | null] {
  const settingsBtn = menuBar.querySelector("button");
  const settingsIcon = settingsBtn?.querySelector("svg") as Node;

  const menuHideBtn = document.createElement("button");
  menuHideBtn.id = "adt-board-hide";
  menuHideBtn.className = settingsBtn?.className || "";

  const menuHideBtnSVG = settingsIcon?.cloneNode(true) as SVGElement;
  menuHideBtnSVG.setAttribute("viewBox", "0 0 400 400");
  menuHideBtnSVG.style.height = "1.1em";
  menuHideBtnSVG.style.width = "1.1em";
  menuHideBtnSVG.children[0].setAttribute(
    "d",
    "M398.885,74.765c-2.178-4.879-7.118-7.958-12.544-7.662l-55.774,3.042l3.039-55.773c0.292-5.328-2.787-10.369-7.657-12.544c-1.675-0.749-3.455-1.128-5.288-1.128c-3.463,0-6.719,1.35-9.168,3.799L270.65,45.341c-2.451,2.448-3.801,5.703-3.801,9.171l0,60.518l-3.164,3.164c-27.955-23.975-64.259-38.484-103.889-38.484C71.684,79.709,0,151.393,0,239.507c0,88.109,71.684,159.794,159.796,159.794c88.111,0,159.795-71.685,159.795-159.794c0-38.914-13.988-74.617-37.191-102.363l3.281-3.281l60.521-0.001c3.414,0,6.754-1.382,9.167-3.796l40.846-40.847C399.989,85.447,401.061,79.634,398.885,74.765zM292.958,239.507c0,73.424-59.737,133.162-133.163,133.162c-73.427,0-133.164-59.738-133.164-133.162c0-73.43,59.737-133.163,133.164-133.163c32.286,0,61.924,11.553,85.001,30.74l-30.941,30.94c-15.04-11.403-33.772-18.183-54.061-18.183c-49.44,0-89.664,40.222-89.664,89.665c0,49.438,40.224,89.66,89.664,89.66c49.439,0,89.663-40.222,89.663-89.66c0-19.565-6.305-37.686-16.981-52.442l31.007-31.006C281.909,178.905,292.958,207.938,292.958,239.507z M222.825,239.507c0,34.754-28.275,63.028-63.029,63.028c-34.755,0-63.031-28.274-63.031-63.028c0-34.759,28.275-63.033,63.031-63.033c12.932,0,24.965,3.922,34.979,10.629l-42.985,42.988c-5.199,5.2-5.199,13.632,0,18.832c2.6,2.598,6.009,3.9,9.416,3.9c3.409,0,6.816-1.302,9.416-3.9l42.678-42.681C219.328,215.906,222.825,227.302,222.825,239.507z");

  menuHideBtn.appendChild(menuHideBtnSVG);

  // find first ul in menuBar and add the menuHideBtn to the menuBar
  const menuBarUL = menuBar.querySelector("ul");
  if (!menuBarUL) return [ null, "Autodarts Tools: No menu bar ul found" ];
  menuBarUL.insertBefore(menuHideBtn, menuBarUL.children[menuBarUL.children.length - 1]);
  return [ menuHideBtn, null ];
}

function wrapIcon(svg: SVGElement): HTMLSpanElement {
  const span = document.createElement("span");
  span.classList.add("chakra-button__icon", "ad-ext-button-icon");
  const svgClone = svg;
  span.appendChild(svgClone);
  return span;
}

async function getButton(text: string): Promise<[HTMLButtonElement | null, SVGElement | null]> {
  const button = await waitForElementWithTextContent("button", text);
  if (!button) {
    return [ null, null ];
  }

  const iconSvg = button.querySelector(".chakra-button__icon svg");
  if (!iconSvg) {
    return [ null, null ];
  }
  return [ button as HTMLButtonElement, iconSvg.cloneNode(true) as SVGElement ];
}
