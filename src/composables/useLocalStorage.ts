export function useLocalStorage() {
  async function get(key: string) {
    const localStorage = await chrome.storage.local.get(`autodarts-tools-${key}`);
    return localStorage[`autodarts-tools-${key}`]?.[key];
  }

  async function set(key: string, value: any) {
    await chrome.storage.local.set({
      [`autodarts-tools-${key}`]: {
        [key]: value,
      },
    });
  }

  return {
    get,
    set,
  };
}
