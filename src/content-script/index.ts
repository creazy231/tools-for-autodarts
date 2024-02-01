import "./index.scss";
import { useLocalStorage } from "@/composables/useLocalStorage";

const { get, set } = useLocalStorage();

function waitForElement(selector: string, timeout = 3000): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(timer);
        // @ts-expect-error
        resolve(element);
      } else if (Date.now() - startTime >= timeout) {
        clearInterval(timer);
        reject(new Error(`Timeout waiting for element ${selector}`));
      }
    }, 100);
  });
}

// Create a MutationObserver instance
const observer = new MutationObserver((mutationsList, observer) => {
  for (const mutation of mutationsList) {
    if (mutation.type === "childList") {
      if (window.location.href.includes("/matches/")) modifyColors();
    }
  }
});

// Start observing the document with the configured parameters
observer.observe(document, { childList: true, subtree: true });

async function modifyColors() {
  const colors = await get("colors");
  if (!colors?.enabled) return;

  const gameElement = await waitForElement("#root > div:nth-of-type(2) > div > div:nth-of-type(2)");
  gameElement.setAttribute("style", `--chakra-colors-blue-500: ${colors.background}; color: ${colors.text};`);
  // find a tag in gameElement and set color to black
  // const gameElementUser = gameElement.querySelector("a");
  // gameElementUser?.setAttribute("style", "color: black;");

  const dartsElements = [
    await waitForElement("#root > div:nth-of-type(2) > div > div:nth-of-type(3) > div:nth-of-type(2)"),
    await waitForElement("#root > div:nth-of-type(2) > div > div:nth-of-type(3) > div:nth-of-type(3)"),
    await waitForElement("#root > div:nth-of-type(2) > div > div:nth-of-type(3) > div:nth-of-type(4)"),
  ];

  dartsElements.forEach((dartsElement) => {
    if (!dartsElement) return;
    dartsElement.setAttribute("style", `--chakra-colors-blue-500: ${colors.background}; color: ${colors.text};`);
  });
}

// get cookie with name "Authorization"
function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  return parts.length === 2 ? parts.pop()?.split(";").shift() : undefined;
}

self.onerror = function (message, source, lineno, colno, error) {
  console.info(
    `Error: ${message}\nSource: ${source}\nLine: ${lineno}\nColumn: ${colno}\nError object: ${error}`,
  );
};

set("users", []).catch(console.error);

// listen on message from chrome.tabs.sendMessage
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request?.data?.length > 0) updateLobbiesTable(request.data);

  // check if current url contains "/lobbies"
  if (window.location.href.includes("/lobbies")) {
    if (request?.data?.length > 0) updateLobbiesUsers(request.data).catch(console.error);
  }

  return undefined;
});

async function updateLobbiesUsers(lobbiesData: any[]) {
  // check if store has users data
  const users = await get("users");

  for (let i = 0; i < lobbiesData.length; i++) {
    const lobbyData = lobbiesData[i];
    const hostUserId = lobbyData.host.id;

    // check if user is already in store
    let userData = users.find((user: any) => user.id === hostUserId);
    if (userData) continue;

    userData = await fetchAutodarts(`https://api.autodarts.io/as/v0/users/${hostUserId}/stats/x01?limit=10`);

    users.push({
      id: hostUserId,
      ...userData,
    });
  }

  for (let i = 0; i < lobbiesData.length; i++) {
    const lobbyData = lobbiesData[i];
    const hostUserId = lobbyData.host.id;
    const hostUser = users.find((user: any) => user.id === hostUserId);
    if (!hostUser) continue;

    const hostUserElement = document.querySelector(`table > tbody > tr:nth-of-type(${i + 1}) > td:nth-of-type(1) > a > span:nth-of-type(2)`);
    if (!hostUserElement) continue;
    hostUserElement.innerHTML = `
      <span style="display: flex; align-items: center;">
        ${lobbyData.host.name.toUpperCase()}
        <span style="font-size: 0.75rem; text-align: center; margin-left: 1rem; margin-right: 0.5rem;">
          AVG: ${hostUser.average.average.toFixed(2)}
        </span>
        <span style="font-size: 0.75rem; text-align: center; margin-left: 0.5rem; margin-right: 0.5rem;">
          CO: ${(hostUser.average.checkoutPercent * 100).toFixed(2)}%
        </span>
        <span style="font-size: 0.75rem; text-align: center; margin-left: 0.5rem; margin-right: 0.5rem;">
          ${hostUser.totalLegs} Legs
        </span>
      </span>
    `;
  }

  await set("users", users);
}

function fetchAutodarts(url: string, method: string = "GET", body?: any) {
  const token = getCookie("Authorization");
  return new Promise((resolve, reject) => {
    const autodartsAPI = new XMLHttpRequest();
    autodartsAPI.open(method, url);
    autodartsAPI.setRequestHeader("Authorization", `Bearer ${token}`);
    // Accept: application/json, text/plain, */*
    autodartsAPI.setRequestHeader("Accept", "application/json, text/plain, */*");
    autodartsAPI.send();
    autodartsAPI.onload = () => {
      return resolve(JSON.parse(autodartsAPI.response));
    };
  });
}

function updateLobbiesTable(lobbiesData: any[]) {
  for (let i = 0; i < lobbiesData.length; i++) {
    const lobbyData = lobbiesData[i];

    // get 2nd td inside table element of dom and append lobby id
    const lobbyElement = document.querySelector(`table > tbody > tr:nth-of-type(${i + 1}) > td:nth-of-type(2)`);
    if (!lobbyElement) continue;
    // filter undefined values
    lobbyElement.setAttribute("style", "white-space: nowrap;");
    lobbyElement.innerHTML = [
      lobbyData.variant,
      lobbyData.settings?.baseScore,
      lobbyData.settings?.inMode && lobbyData.settings?.outMode ? `${lobbyData.settings?.inMode.slice(0, 1)}/${lobbyData.settings?.outMode.slice(0, 1)}` : undefined,
      lobbyData.legs ? `${lobbyData.legs} Legs` : undefined,
    ]
      .filter(Boolean)
      .join(" - ");
  }
}
