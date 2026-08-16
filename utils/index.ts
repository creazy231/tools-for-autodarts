export function waitForElement(selector: string | string[], timeout = 3000): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      if (Array.isArray(selector)) {
        for (const sel of selector) {
          const element = document.querySelector(sel);
          if (element) {
            clearInterval(timer);
            // @ts-expect-error
            resolve(element);
            return;
          }
        }
      } else {
        const element = document.querySelector(selector);
        if (element) {
          clearInterval(timer);
          // @ts-expect-error
          resolve(element);
          return;
        }
      }

      // Skip timeout check if timeout is 0
      if (timeout !== 0 && Date.now() - startTime >= timeout) {
        clearInterval(timer);
        reject(new Error(`Timeout waiting for element ${selector}`));
      }
    }, 100);
  });
}

export function waitForElementWithTextContent(selector: string | string[], textContent: string | string[], timeout = 3000): Promise<HTMLElement> {
  const texts = Array.isArray(textContent) ? textContent : [textContent];
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      if (Array.isArray(selector)) {
        for (const sel of selector) {
          const elements = document.querySelectorAll(sel);
          for (const element of elements) {
            if (texts.includes(element.textContent ?? "")) {
              clearInterval(timer);
              resolve(element as HTMLElement);
              return;
            }
          }
        }
      } else {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          if (texts.includes(element.textContent ?? "")) {
            clearInterval(timer);
            resolve(element as HTMLElement);
            return;
          }
        }
      }

      if (Date.now() - startTime >= timeout) {
        clearInterval(timer);
        reject(new Error(`Timeout waiting for element ${selector} with text content ${texts.join(", ")}`));
      }
    }, 100);
  });
}

const STYLE_ID_PREFIX = "ad-ext_style_";

/**
 * Install a feature's stylesheet, replacing any previous version of it.
 *
 * Prefer this over writing styles onto elements for anything on the rebuilt
 * site: it is React, and it re-renders the match screen on every throw, which
 * discards inline styles. A rule keyed on a selector survives that.
 *
 * @param css {string} - CSS rules string to be added
 * @param componentName {string} - Name of the component
 */
export function addStyles(css: string, componentName: string = "") {
  const id = `${STYLE_ID_PREFIX}${componentName}`;
  // Replace rather than bail out: re-running with a changed setting used to
  // leave the first version of the rules in place.
  document.getElementById(id)?.remove();

  const style = document.createElement("style");
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
}

/** Remove a stylesheet installed by {@link addStyles}. */
export function removeStyles(componentName: string = "") {
  document.getElementById(`${STYLE_ID_PREFIX}${componentName}`)?.remove();
}
