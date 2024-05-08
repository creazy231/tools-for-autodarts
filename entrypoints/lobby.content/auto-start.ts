import { waitForElement } from "@/utils";

let autostartEnabled: boolean = false;
let checkAutoStartInterval: NodeJS.Timeout | null = null;

export async function autoStart() {
  try {
    const hasAutoStartButton = document.getElementById("adt-autostart-button");
    if (hasAutoStartButton) return;

    const buttonsContainer = await waitForElement("#root > div > div:nth-of-type(2) > div > div > div:nth-of-type(3) > div") as HTMLDivElement;
    const button = buttonsContainer.querySelector("button")?.cloneNode(true) as HTMLButtonElement;

    if (button.innerText !== "Start") return;

    button.id = "adt-autostart-button";
    button.innerText = "Autostart OFF";
    button.style.color = "var(--chakra-colors-green-500)";
    button.style.color = "var(--chakra-colors-red-500)";

    button.addEventListener("click", () => {
      button.textContent = button.textContent === "Autostart ON" ? "Autostart OFF" : "Autostart ON";
      button.style.color = button.textContent === "Autostart ON" ? "var(--chakra-colors-green-500)" : "var(--chakra-colors-red-500)";
      autostartEnabled = !autostartEnabled;

      if (autostartEnabled) {
        checkAutoStartInterval = setInterval(checkAutoStart, 1000);
      } else {
        if (checkAutoStartInterval) clearInterval(checkAutoStartInterval);
      }
    });

    buttonsContainer.appendChild(button);
  } catch (e) {
    console.error("Autodarts Tools: Auto Start - Error adding auto start button: ", e);
  }
}

export async function onRemove() {
  if (checkAutoStartInterval) clearInterval(checkAutoStartInterval);
  autostartEnabled = false;
}

async function checkAutoStart() {
  const rows = document.querySelectorAll("#root > div > div:nth-of-type(2) > div > div > div:nth-of-type(2) > div > table > tbody > tr");
  if (rows.length > 1) {
    await new Promise(resolve => setTimeout(resolve, 3000));

    const buttons = document.querySelectorAll("button") as NodeList;
    const startButton = Array.from(buttons).find(button => button.textContent === "Start");
    startButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    if (checkAutoStartInterval) clearInterval(checkAutoStartInterval);
  }
}
