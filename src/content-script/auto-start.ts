// Create a MutationObserver instance
import { waitForElement } from "@/content-script/helpers";

let observer: MutationObserver;

let checkAutoStartInterval: NodeJS.Timeout;

function startObserver() {
  console.log("Observer started");
  observer = new MutationObserver((mutationsList, observer) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        if (window.location.href.includes("/lobbies/") && !window.location.href.includes("/new")) {
          observer.disconnect();
          console.log("Observer disconnected");
          initAutoStart().catch(err => console.error(err));

          setTimeout(() => {
            observer.observe(document, { childList: true, subtree: true });
            console.log("Observer reconnected");
          }, 1000);
        } else {
          if (checkAutoStartInterval) clearInterval(checkAutoStartInterval);
        }
      }
    }
  });

  // Start observing the document with the configured parameters
  observer.observe(document, { childList: true, subtree: true });
}

startObserver();

async function initAutoStart() {
  // check if element with id "auto-start-toggle" exists. if yes, return
  const toggleElement = document.getElementById("auto-start-toggle");
  if (toggleElement) return;

  const startButton = await waitForElement("#root > div:nth-of-type(2) > div:nth-of-type(3) > div > button:nth-of-type(1)");
  const deleteButton = await waitForElement("#root > div:nth-of-type(2) > div:nth-of-type(3) > div > button:nth-of-type(2)");
  const buttonsElement = await waitForElement("#root > div:nth-of-type(2) > div:nth-of-type(3) > div");

  if (startButton && deleteButton && buttonsElement) {
    console.log("START GAME");
    // create a toggle with on and off and add it to the buttonsElement
    const toggle = document.createElement("button");
    toggle.id = "auto-start-toggle";
    toggle.className = "auto-start-toggle";
    toggle.innerText = "Auto Start: OFF";
    const defaultStyles = "color: var(--chakra-colors-red-500); background: var(--chakra-colors-whiteAlpha-300); padding-inline-start: var(--chakra-space-6); padding-inline-end: var(--chakra-space-6); line-height: 3; border-radius: var(--chakra-radii-md); font-weight: bold;";
    toggle.setAttribute("style", defaultStyles);

    toggle.addEventListener("click", () => {
      if (toggle.innerText.includes("OFF")) {
        toggle.innerText = "Auto Start: ON";
        toggle.setAttribute("style", `${defaultStyles}color: var(--chakra-colors-green-500);`);
        checkAutoStartInterval = setInterval(checkAutoStart, 1000);
      } else {
        toggle.innerText = "Auto Start: OFF";
        toggle.setAttribute("style", `${defaultStyles}color: var(--chakra-colors-red-500);`);
        if (checkAutoStartInterval) clearInterval(checkAutoStartInterval);
      }
    });
    buttonsElement.appendChild(toggle);

    // check if there are multiple elements with class "auto-start-toggle". if yes, remove all except the last one
    const toggles = document.querySelectorAll(".auto-start-toggle");
    if (toggles.length > 1) {
      for (let i = 0; i < toggles.length - 1; i++) {
        toggles[i].remove();
      }
    }
  }
}

function checkAutoStart() {
  // check if querySelectorAll "#root > div:nth-of-type(2) > div:nth-of-type(2) > div > table tr" contains more than 1 row
  const rows = document.querySelectorAll("#root > div:nth-of-type(2) > div:nth-of-type(2) > div > table > tbody > tr");
  if (rows.length > 1) {
    // get the "startButton" again and click it
    const startButton = document.querySelector("#root > div:nth-of-type(2) > div:nth-of-type(3) > div > button:nth-of-type(1)");
    startButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }
}
