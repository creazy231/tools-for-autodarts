export function waitForElement(selector: string, timeout = 3000): Promise<HTMLElement | undefined> {
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
        resolve(undefined);
      }
    }, 100);
  });
}
