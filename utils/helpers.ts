import { AutodartsToolsSoundAutoplayStatus } from "@/utils/storage";

export const isX01 = () => document.getElementById("ad-ext-game-variant")?.textContent === "X01";
export const isBullOff = () => document.getElementById("ad-ext-game-variant")?.textContent === "Bull-off";
export const isCricket = () => document.getElementById("ad-ext-game-variant")?.textContent?.split(" ")[0] === "Cricket";

export const soundEffect1 = new Audio();
export const soundEffect2 = new Audio();
export const soundEffect3 = new Audio();

export async function allowAudioAutoPlay() {
  soundEffect1.autoplay = true;
  soundEffect2.autoplay = true;
  soundEffect3.autoplay = true;

  soundEffect1.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
  // soundEffect1.src = "https://autodarts.x10.mx/chase_the_sun/chase_the_sun.mp3";
  soundEffect2.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
  soundEffect3.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
  await soundEffect1.play();
  await soundEffect2.play();
  await soundEffect3.play();
  await AutodartsToolsSoundAutoplayStatus.setValue(true);
}
