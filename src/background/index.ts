const { get, set } = useLocalStorage();

chrome.runtime.onInstalled.addListener(async (opt) => {
  if (opt.reason === "install") {
    await chrome.storage.local.clear();

    await set("colors", {
      enabled: false,
      background: "#3182ce",
      text: "rgba(255,255,255,0.92)",
    });

    await set("settings", {
      extendLobbies: false,
    });

    await set("users", []);

    // chrome.tabs.create({
    //   active: true,
    //   url: chrome.runtime.getURL("./installed.html"),
    // });
  }

  if (opt.reason === "update") {
    // chrome.tabs.create({
    //   active: true,
    //   url: chrome.runtime.getURL("./src/update/index.html"),
    // });
  }
});

self.onerror = function (message, source, lineno, colno, error) {
  console.info(
    `Error: ${message}\nSource: ${source}\nLine: ${lineno}\nColumn: ${colno}\nError object: ${error}`,
  );
};

// https://github.com/GanymedeNil/request-pipeline

let currentTabId: number | undefined;
const version = "1.0";
const requests = new Map();

checkTabs().catch(err => console.error(err));

async function checkTabs() {
  const settings = await get("settings");
  if (!settings?.extendLobbies) return;

  // get tab id where name includes "autodarts"
  chrome.tabs.query({
    url: "*://play.autodarts.io/*",
  }, (tabs) => {
    if (tabs.length > 0) {
      currentTabId = tabs[0].id;
      if (!currentTabId) return;
      chrome.debugger.attach({
        tabId: currentTabId,
      }, version, onAttach.bind(null, currentTabId));
    }
  });
}

// on new tab check if it is autodarts
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const settings = await get("settings");
  if (!settings?.extendLobbies) return;

  if (changeInfo.status === "complete") {
    if (tab.url?.includes("play.autodarts.io")) {
      currentTabId = tabId;
      chrome.debugger.attach({
        tabId: currentTabId,
      }, version, onAttach.bind(null, currentTabId));
    }
  }
});

// on tab close, detach debugger if it is autodarts
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (tabId === currentTabId) {
    chrome.debugger.detach({
      tabId: currentTabId,
    }, debuggerDetachHandler);
  }
});

function debuggerDetachHandler() {
  requests.clear();
}
function onAttach(tabId: number) {
  chrome.debugger.sendCommand({
    tabId,
  }, "Network.enable").catch(err => console.error(err));

  chrome.debugger.onEvent.addListener(allEventHandler);
}
// https://chromedevtools.github.io/devtools-protocol/tot/Network
function allEventHandler(debuggerId: any, message: string, params: any) {
  if (currentTabId !== debuggerId.tabId) {
    return;
  }
  // get request data
  if (message === "Network.requestWillBeSent") {
    if (params.request && filter(params.request.url)) {
      const detail = new Map();
      detail.set("request", params.request);
      requests.set(params.requestId, detail);
    }
  }

  // get response data
  if (message === "Network.responseReceived") {
    if (params.response && filter(params.response.url)) {
      const request = requests.get(params.requestId);
      if (request === undefined) {
        console.log(params.requestId, "#not found request");
        return;
      }
      request.set("response", params.response);
      chrome.debugger.sendCommand({
        tabId: debuggerId.tabId,
      }, "Network.getCookies", {
        urls: [ params.response.url ],
      }, (response) => {
        request.set("cookies", response?.cookies);
      });
      requests.set(params.requestId, request);
    }
  }

  if (message === "Network.loadingFinished") {
    const request = requests.get(params.requestId);
    if (request === undefined) {
      console.log(params.requestId, "#not found request");
      return;
    }

    chrome.debugger.sendCommand({
      tabId: debuggerId.tabId,
    }, "Network.getResponseBody", {
      requestId: params.requestId,
    }, (response) => {
      if (response) {
        request.set("response_body", response);
        requests.set(params.requestId, request);
        console.log(request);
        // send request to content script
        chrome.tabs.sendMessage(debuggerId.tabId, {
          type: "autodarts-lobbies",
          data: response?.body ? JSON.parse(response.body) : undefined,
        }).catch(err => console.error(err));
        requests.delete(params.requestId);
      } else {
        console.log("empty");
      }
    });
  }
}

function filter(url: string) {
  return url.includes("api.autodarts.io");
}

export {};
