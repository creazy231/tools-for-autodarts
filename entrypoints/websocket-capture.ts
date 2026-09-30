/**
 * WebSocket capture script to be injected into the main world
 */

import { VOID_CHECKOUT_ATTR, siteFrame } from "@/utils/void-checkout";

export default defineUnlistedScript(() => {
  console.log("[WebSocket Capture] Starting initialization");

  try {
    // Get the original data property descriptor
    const property = Object.getOwnPropertyDescriptor(
      MessageEvent.prototype,
      "data",
    );

    if (!property || !property.get) {
      console.error("[WebSocket Capture] Could not get data property descriptor");
      return;
    }

    const originalGetter = property.get;

    // The visit each match's last state was in, for siteFrame.
    const visits = new Map<string, string>();

    // Create a wrapper function that intercepts the getter
    function interceptMessageData(this: MessageEvent) {
      // Check if this is a WebSocket message
      const isWebSocket = this.currentTarget instanceof WebSocket;

      if (!isWebSocket) {
        return originalGetter.call(this);
      }

      // Get the original message data
      const messageData = originalGetter.call(this);

      // What the site reads: the frame as it came, but for a checkout the
      // partner rule takes back, which it reads as a bust with no GAME SHOT
      // (utils/void-checkout.ts). The content script still gets the frame
      // itself, below.
      let forSite = messageData;

      try {
        // Only dispatch event, no logging here
        if (typeof messageData === "string") {
          try {
            const rewritten = siteFrame(JSON.parse(messageData), document.documentElement.getAttribute(VOID_CHECKOUT_ATTR), visits);
            if (rewritten) forSite = JSON.stringify(rewritten);
            // No logging here, only in content script
          } catch (e) {
            // Not valid JSON, don't process
          }
        }

        // Dispatch a custom event with the message data
        window.dispatchEvent(new CustomEvent("websocket-incoming", {
          detail: {
            url: (this.currentTarget as WebSocket).url,
            data: typeof messageData === "string" ? messageData : "(binary data)",
            timestamp: new Date().toISOString(),
          },
        }));
      } catch (error) {
        console.error("[WebSocket Capture] Error processing message:", error);
      }

      return forSite;
    }

    // Replace the getter with our interceptor
    property.get = interceptMessageData;
    Object.defineProperty(MessageEvent.prototype, "data", property);

    // Also intercept WebSocket.send to capture outgoing messages
    const originalSend = WebSocket.prototype.send;
    WebSocket.prototype.send = function (
      this: WebSocket,
      data: string | ArrayBufferLike | Blob | ArrayBufferView,
    ) {
      try {
        // Only dispatch event, no logging here
        if (typeof data === "string") {
          try {
            // Try to parse JSON data to validate it's JSON
            JSON.parse(data);
            // No logging here, only in content script
          } catch (e) {
            // Not valid JSON, don't process
          }
        }

        // Dispatch a custom event with the outgoing message
        window.dispatchEvent(new CustomEvent("websocket-outgoing", {
          detail: {
            url: this.url,
            data: typeof data === "string" ? data : "(binary data)",
            timestamp: new Date().toISOString(),
          },
        }));
      } catch (error) {
        console.error("[WebSocket Capture] Error intercepting send:", error);
      }

      // Call the original send method
      return originalSend.call(this, data);
    };

    console.log("[WebSocket Capture] Initialized successfully");
  } catch (error) {
    console.error("[WebSocket Capture] Initialization failed:", error);
  }
});
