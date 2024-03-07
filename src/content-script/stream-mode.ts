// Create a MutationObserver instance

import Mustache from "mustache";
import { waitForElement } from "@/content-script/helpers";

const streamModeTemplate = `
<div class="autodarts-tools__stream-mode__container">
  <div class="autodarts-tools__stream-mode__header">
    {{title}}
  </div>
  <div class="autodarts-tools__stream-mode__info autodarts-tools__stream-mode__info-legs">
    <div>
      <div>Legs</div>
    </div>
    <div>
      <div class="invisible">Score</div>
    </div>
  </div>
  {{#players}}
  <div class="autodarts-tools__stream-mode__name">
    {{name}} <span class="autodarts-tools__stream-mode__avg">{{ avg }}</span>
  </div>
  <div class="autodarts-tools__stream-mode__score">
    <div>{{legs}}</div>
    <div>{{score}}</div>
    {{#active}}
    <span class="autodarts-tools__stream-mode__active">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 512 512"><path fill="currentColor" d="M134.745 22.098c-4.538-.146-9.08 1.43-14.893 7.243c-5.586 5.586-11.841 21.725-15.248 35.992c-.234.979-.444 1.907-.654 2.836l114.254 105.338c-7.18-28.538-17.555-59.985-29.848-86.75c-11.673-25.418-25.249-46.657-37.514-57.024c-6.132-5.183-11.56-7.488-16.097-7.635M92.528 82.122L82.124 92.526L243.58 267.651l24.072-24.072zm-24.357 21.826c-.929.21-1.857.42-2.836.654c-14.267 3.407-30.406 9.662-35.993 15.248c-5.813 5.813-7.39 10.355-7.244 14.893c.147 4.538 2.452 9.965 7.635 16.098c10.367 12.265 31.608 25.842 57.025 37.515c26.766 12.293 58.211 22.669 86.749 29.848L68.17 103.948zM280.899 255.79l-25.107 25.107l73.265 79.469l31.31-31.31zm92.715 85.476l-32.346 32.344l2.07 2.246c.061.058 4.419 4.224 10.585 6.28c6.208 2.069 12.71 2.88 21.902-6.313c9.192-9.192 8.38-15.694 6.31-21.902c-2.057-6.174-6.235-10.54-6.283-10.59zm20.172 41.059a46.23 46.23 0 0 1-5.233 6.226a46.241 46.241 0 0 1-6.226 5.235L489.91 489.91z"/></svg>
    </span>
    {{/active}}
  </div>
  {{/players}}
  <div class="autodarts-tools__stream-mode__footer">
    {{footer}}
  </div>
</div>
`;

let streamModeActive = false;
let initialized = false;
let observer: MutationObserver;

let getGameStatsInterval: NodeJS.Timeout;

function startObserver() {
  console.log("[Stream Mode] Observer started");
  observer = new MutationObserver((mutationsList, observer) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        if ((window.location.href.includes("/matches/") || window.location.href.includes("/boards/")) && !initialized) {
          observer.disconnect();
          console.log("[Stream Mode] Observer disconnected");
          initStreamMode().catch(err => console.error(err));

          setTimeout(() => {
            observer.observe(document, { childList: true, subtree: true });
            console.log("[Stream Mode] Observer reconnected");
          }, 1000);
        } else {
          if (getGameStatsInterval) clearInterval(getGameStatsInterval);
          // remove element with id "autodarts-tools__stream-mode" from the body
          const streamModeDiv = document.getElementById("autodarts-tools__stream-mode");
          if (streamModeDiv) streamModeDiv.remove();
        }
      }
    }
  });

  // Start observing the document with the configured parameters
  observer.observe(document, { childList: true, subtree: true });
}

startObserver();

setInterval(() => {
  if (streamModeActive) {
    const streamModeDiv = document.getElementById("autodarts-tools__stream-mode") as HTMLElement;
    if (streamModeDiv && streamModeDiv.classList.contains("hidden")) {
      streamModeDiv.classList.remove("hidden");
      getGameStatsInterval = setInterval(getGameStats, 500);
    }
  }
}, 1000);

async function initStreamMode() {
  if (initialized) return;

  // check if element with id "autodarts-tools__button__stream-mode" already exists. if yes, return
  const streamModeButtonCheck = document.getElementById("autodarts-tools__button__stream-mode");
  if (streamModeButtonCheck) return;
  initialized = true;

  setTimeout(() => {
    initialized = false;
  }, 1000);

  // TODO: Edit waitForElement to accept multiple selectors
  const modeGroupElement = await new Promise((resolve) => {
    const interval = setInterval(() => {
      const element = document.querySelector("#root > div:nth-of-type(2) [aria-label='Live mode']");
      if (element) {
        clearInterval(interval);
        resolve(element.parentElement!);
      }
    }, 100);
  }) as Element;

  // get last "button" element inside modeGroupElement
  const liveModeButton = modeGroupElement?.firstElementChild as Node;

  // make a copy of the button and add it to the modeGroupElement
  let streamModeButton = liveModeButton.cloneNode(true) as Element;

  // remove data-active attribute from the copy
  streamModeButton?.removeAttribute("data-active");

  // set "aria-label" attribute to "Stream Mode"
  streamModeButton?.setAttribute("aria-label", "Stream Mode");

  // set id to "stream-mode-button"
  streamModeButton?.setAttribute("id", "autodarts-tools__button__stream-mode");

  modeGroupElement?.appendChild(streamModeButton!);

  streamModeButton = await waitForElement("#autodarts-tools__button__stream-mode") as Element;

  // set inner from "streamModeButton" to "Stream Mode"
  streamModeButton.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\"><g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M7 9h.01m9.74 3H22l-3.5 7l-3.09-4.32\"/><path d=\"m18 9.5l-4 8l-10.39-5.2a2.92 2.92 0 0 1-1.3-3.91L3.69 5.6a2.92 2.92 0 0 1 3.92-1.3ZM2 19h3.76a2 2 0 0 0 1.8-1.1L9 15m-7 6v-4\"/></g></svg>";

  // create div with id "autodarts-tools__stream-mode" and add it to the body
  const streamModeDiv = document.createElement("div");
  streamModeDiv.id = "autodarts-tools__stream-mode";
  streamModeDiv.classList.add("hidden");

  streamModeButton.addEventListener("click", toggleStreamMode);
  streamModeDiv.addEventListener("click", toggleStreamMode);

  document.body.appendChild(streamModeDiv);
}

async function toggleStreamMode() {
  const streamModeDiv = document.getElementById("autodarts-tools__stream-mode") as HTMLElement;
  streamModeDiv.classList.toggle("hidden");

  if (!streamModeDiv.classList.contains("hidden")) {
    streamModeActive = true;
    getGameStatsInterval = setInterval(getGameStats, 500);
  } else {
    streamModeActive = false;
    clearInterval(getGameStatsInterval);
  }
}

async function getGameStats() {
  const gameContainerElement = await waitForElement("#root > div:nth-of-type(2) > div > div:nth-of-type(3)");

  // count elements inside gameContainerElement
  const elementsCount = gameContainerElement?.childElementCount;
  if (!elementsCount) return;

  const game: any = {
    title: "",
    players: [],
    footer: "Game provided by Autodarts.io",
  };

  const gameSettingsContainerElement = document.querySelector("#root > div:nth-of-type(2) .chakra-wrap__list .chakra-wrap__list");
  // set game.title to all span's textContent inside gameSettingsContainerElement joined by " - "
  game.title = Array.from(gameSettingsContainerElement?.querySelectorAll("span") || []).map(span => span.textContent).filter(span => !span!.includes("/") && !span!.includes("-")).join(" - ");

  for (let i = 0; i < elementsCount; i++) {
    // get i-th element inside gameContainerElement
    const player = gameContainerElement?.children[i];

    // define "active" as true if player's first div has any class appends style ""background: var(--chakra-colors-yellow-500);"
    const active = window.getComputedStyle(player?.querySelector("div") as Element).backgroundColor === "rgb(49, 130, 206)";

    // a span where not has any child elements
    let playerName = player?.querySelector("a")?.textContent;
    const playerScore = player?.querySelector("p")?.textContent;
    const playerLegs = document.querySelector(`#root > div:nth-of-type(2) > div > div.chakra-stack > div:nth-of-type(${i + 1}) > div:nth-of-type(2) > div > div`)?.textContent;
    const playerStats = document.querySelector(`#root > div:nth-of-type(2) > div > div.chakra-stack > div:nth-of-type(${i + 1}) > div:nth-of-type(2) > div > p`)?.textContent;
    const playerAVG = playerStats?.split("|")[1].trim();

    // remove all lowercase letters from playerName
    playerName = playerName?.replace(/[a-z]/g, "");

    game.players.push({
      name: playerName,
      score: playerScore,
      legs: playerLegs || 0,
      avg: playerAVG,
      active,
    });
  }

  const streamModeDiv = document.getElementById("autodarts-tools__stream-mode") as HTMLElement;
  streamModeDiv.innerHTML = Mustache.render(streamModeTemplate, game);
}
