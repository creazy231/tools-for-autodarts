import { browser } from "wxt/browser";

export default defineBackground(() => {
  console.log("Hello background!", { id: browser.runtime.id });

  console.log("Background script is running!");

  browser.runtime.onMessage.addListener(async (message: any, sender: any, sendResponse: any) => {
    if (message === "cookies:authorization") {
      return await getAuthorizationCookie();
    }
  });
});

function getAuthorizationCookie() {
  return new Promise((resolve, reject) => {
    browser.cookies.get({ url: "https://play.autodarts.io/", name: "Authorization" }).then((cookie) => {
      if (cookie) {
        resolve(cookie.value);
      }
    });
  });
}
