import { type DBSchema, type IDBPDatabase, openDB } from "idb";

import type { IConfig, ISound } from "@/utils/storage";

import { GameMode } from "@/utils/game-data-storage";

export const isX01 = () => document.getElementById("ad-ext-game-variant")?.textContent === GameMode.X01;
export const isBullOff = () => document.getElementById("ad-ext-game-variant")?.textContent === "Bull-off";
export const isCricket = () => document.getElementById("ad-ext-game-variant")?.textContent?.split(" ")[0] === "Cricket";

export const isValidGameMode = () => isX01() || isCricket();

export const soundEffect1 = new Audio();
export const soundEffect2 = new Audio();
export const soundEffect3 = new Audio();

// Add Safari-specific initialization
soundEffect1.preload = "auto";
soundEffect2.preload = "auto";
soundEffect3.preload = "auto";

// Modified event listeners to prevent automatic playback which could cause double sounds
// These listeners are now only for debugging purposes
soundEffect1.addEventListener("canplaythrough", () => {
  // Removed automatic play to prevent double sounds
  if (soundEffect1.paused && soundEffect1.autoplay) {
    console.log("Sound 1 loaded and ready to play");
    // Removed automatic play call
  }
});

soundEffect2.addEventListener("canplaythrough", () => {
  // Removed automatic play to prevent double sounds
  if (soundEffect2.paused && soundEffect2.autoplay) {
    console.log("Sound 2 loaded and ready to play");
    // Removed automatic play call
  }
});

soundEffect3.addEventListener("canplaythrough", () => {
  // Removed automatic play to prevent double sounds
  if (soundEffect3.paused && soundEffect3.autoplay) {
    console.log("Sound 3 loaded and ready to play");
    // Removed automatic play call
  }
});

export const soundEffectArray = [ soundEffect1, soundEffect2, soundEffect3 ];

export function isiOS() {
  return [
    "iPad Simulator", "iPhone Simulator", "iPod Simulator", "iPad", "iPhone", "iPod" ].includes(navigator.platform) // iPad on iOS 13 detection
    || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
}

// Add Safari detection function
export function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
         || (navigator.userAgent.includes("AppleWebKit") && !navigator.userAgent.includes("Chrome"));
}

// Function to get the authorization token from storage
export async function getAuthToken() {
  const { AutodartsToolsGlobalStatus } = await import("./storage");
  const globalStatus = await AutodartsToolsGlobalStatus.getValue();
  return globalStatus.auth?.token || "";
}

/**
 * Decodes a JWT token and extracts the user ID from the 'sub' claim
 * @returns The user ID from the JWT token or null if not found
 */
export async function getUserIdFromToken(): Promise<string | null> {
  try {
    const token = await getAuthToken();
    if (!token) return null;

    // JWT token consists of three parts: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Decode the payload (middle part)
    const payload = JSON.parse(atob(parts[1]));

    // Extract and return the 'sub' claim which contains the user ID
    return payload.sub || null;
  } catch (error) {
    console.error("Error decoding JWT token:", error);
    return null;
  }
}

// Function to make authenticated API requests
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = await getAuthToken();

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

// IndexedDB helpers for sound storage
export interface SoundDB extends DBSchema {
  "sounds-caller": {
    key: string;
    value: {
      id: string;
      name: string;
      base64: string;
      dateAdded: number;
    };
    indexes: { "by-date": number };
  };
  "sounds-fx": {
    key: string;
    value: {
      id: string;
      name: string;
      base64: string;
      dateAdded: number;
    };
    indexes: { "by-date": number };
  };
  "animations": {
    key: string;
    value: {
      id: string;
      name: string;
      base64: string;
      dateAdded: number;
    };
    indexes: { "by-date": number };
  };
}

let dbPromise: Promise<IDBPDatabase<SoundDB>> | null = null;

// Check if IndexedDB is available in the browser
export function isIndexedDBAvailable(): boolean {
  return typeof window !== "undefined"
         && typeof window.indexedDB !== "undefined"
         && window.indexedDB !== null;
}

// Convert base64 to blob for better browser compatibility (especially Safari)
export function base64toBlob(base64Data: string): Blob {
  try {
    // Check if the base64 data already has a data URI prefix
    if (!base64Data.includes("data:")) {
      // Add a default audio MIME type if none is present
      base64Data = `data:audio/mpeg;base64,${base64Data}`;
    }

    // Safari has issues with certain complex base64 strings containing metadata
    // Strip the data to just the essential parts if we're on Safari
    if (isSafari()) {
      try {
        // Extract content type and actual base64 data
        const parts = base64Data.split(";base64,");
        const contentType = parts[0].split(":")[1] || "audio/mpeg";

        // Get just the base64 data
        const base64Content = parts[1];

        // Create a simpler data URI without the problematic metadata
        base64Data = `data:${contentType};base64,${base64Content}`;

        // For M4A files specifically, which commonly cause issues in Safari
        if (base64Content.includes("ftypM4A") || base64Content.includes("M4A")
            || contentType.includes("mp4") || contentType.includes("m4a")) {
          // Force the content type to audio/mp4 for M4A files
          base64Data = `data:audio/mp4;base64,${base64Content}`;
        }
      } catch (parseError) {
        console.warn("Error parsing base64 data:", parseError);
        // Fall back to original base64Data if parsing fails
      }
    }

    // Extract content type and actual base64 data
    const parts = base64Data.split(";base64,");
    const contentType = parts[0].split(":")[1] || "audio/mpeg";
    const base64Content = parts[1];

    // Safari has issues with certain audio files containing metadata
    // Try to determine a more specific MIME type if possible
    const detectedType = detectAudioMimeType(base64Content);
    const finalContentType = detectedType || contentType;

    const raw = window.atob(base64Content);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([ uInt8Array ], { type: finalContentType });
  } catch (error) {
    console.error("Error converting base64 to blob:", error);
    return new Blob([ "" ], { type: "audio/mpeg" });
  }
}

// Initialize the IndexedDB database
export function getDB(): Promise<IDBPDatabase<SoundDB>> | null {
  if (!isIndexedDBAvailable()) {
    console.warn("IndexedDB is not available in this browser");
    return null;
  }

  if (!dbPromise) {
    dbPromise = openDB<SoundDB>("autodarts-tools-sounds", 3, {
      upgrade(db, oldVersion, newVersion) {
        // Create a store for Caller sounds if it doesn't exist
        if (!db.objectStoreNames.contains("sounds-caller")) {
          const callerStore = db.createObjectStore("sounds-caller", {
            keyPath: "id",
          });
          callerStore.createIndex("by-date", "dateAdded");
        }

        // Create a store for SoundFx sounds if it doesn't exist
        if (!db.objectStoreNames.contains("sounds-fx")) {
          const soundFxStore = db.createObjectStore("sounds-fx", {
            keyPath: "id",
          });
          soundFxStore.createIndex("by-date", "dateAdded");
        }

        // Create a store for Animations if it doesn't exist
        if (!db.objectStoreNames.contains("animations")) {
          const animationsStore = db.createObjectStore("animations", {
            keyPath: "id",
          });
          animationsStore.createIndex("by-date", "dateAdded");
        }
      },
    });
  }

  return dbPromise;
}

// Generic function to save to IndexedDB
async function saveToIndexedDB(
  storeName: "sounds-caller" | "sounds-fx",
  name: string,
  base64: string,
  existingId?: string,
): Promise<string | null> {
  try {
    const db = await getDB();
    if (!db) return null;

    // Use existing ID if provided, otherwise generate a new one
    const id = existingId || `sound_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const soundData = {
      id,
      name,
      base64,
      dateAdded: existingId ? (await db.get(storeName, id))?.dateAdded || Date.now() : Date.now(),
    };

    await db.put(storeName, soundData);
    return id;
  } catch (error) {
    console.error(`Error saving sound to IndexedDB (${storeName}):`, error);
    return null;
  }
}

// Save a base64 sound to IndexedDB for caller
export async function saveSoundToIndexedDB(
  name: string,
  base64: string,
  existingId?: string,
): Promise<string | null> {
  return saveToIndexedDB("sounds-caller", name, base64, existingId);
}

// Save a base64 sound to IndexedDB for soundFx
export async function saveSoundFxToIndexedDB(
  name: string,
  base64: string,
  existingId?: string,
): Promise<string | null> {
  return saveToIndexedDB("sounds-fx", name, base64, existingId);
}

// Get a sound from IndexedDB by ID for caller
export async function getSoundFromIndexedDB(id: string): Promise<string | null> {
  return getFromIndexedDB("sounds-caller", id);
}

// Get a sound from IndexedDB by ID for soundFx
export async function getSoundFxFromIndexedDB(id: string): Promise<string | null> {
  return getFromIndexedDB("sounds-fx", id);
}

// Generic function to get from IndexedDB
async function getFromIndexedDB(
  storeName: "sounds-caller" | "sounds-fx",
  id: string,
): Promise<string | null> {
  try {
    const db = await getDB();
    if (!db) return null;

    const sound = await db.get(storeName, id);
    if (!sound) return null;

    // Normalize the base64 data to ensure it has correct format for Safari
    let base64 = sound.base64;

    // If it's a Safari browser, make sure the MIME type is properly set
    if (isSafari() && base64.includes("data:")) {
      // Try to detect the correct MIME type from the data URI
      const mimeType = base64.split(";")[0].split(":")[1];

      // If we can't detect or it's an ambiguous type, default to audio/mpeg
      if (!mimeType || mimeType === "application/octet-stream") {
        // Extract the base64 content and create a new data URI with audio/mpeg MIME type
        const base64Content = base64.split(";base64,")[1];
        base64 = `data:audio/mpeg;base64,${base64Content}`;
      }
    }

    return base64;
  } catch (error) {
    console.error(`Error getting sound from IndexedDB (${storeName}):`, error);
    return null;
  }
}

// Delete a sound from IndexedDB for caller
export async function deleteSoundFromIndexedDB(id: string): Promise<boolean> {
  return deleteFromIndexedDB("sounds-caller", id);
}

// Delete a sound from IndexedDB for soundFx
export async function deleteSoundFxFromIndexedDB(id: string): Promise<boolean> {
  return deleteFromIndexedDB("sounds-fx", id);
}

// Generic function to delete from IndexedDB
async function deleteFromIndexedDB(
  storeName: "sounds-caller" | "sounds-fx",
  id: string,
): Promise<boolean> {
  try {
    const db = await getDB();
    if (!db) return false;

    await db.delete(storeName, id);
    return true;
  } catch (error) {
    console.error(`Error deleting sound from IndexedDB (${storeName}):`, error);
    return false;
  }
}

// Clear sounds from IndexedDB for caller
export async function clearCallerSoundsFromIndexedDB(): Promise<boolean> {
  return clearFromIndexedDB("sounds-caller");
}

// Clear sounds from IndexedDB for soundFx
export async function clearSoundFxFromIndexedDB(): Promise<boolean> {
  return clearFromIndexedDB("sounds-fx");
}

// Generic function to clear from IndexedDB
async function clearFromIndexedDB(
  storeName: "sounds-caller" | "sounds-fx",
): Promise<boolean> {
  try {
    const db = await getDB();
    if (!db) return false;

    await db.clear(storeName);
    return true;
  } catch (error) {
    console.error(`Error clearing sounds from IndexedDB (${storeName}):`, error);
    return false;
  }
}

// Get all sounds from IndexedDB for caller
export async function getAllCallerSoundsFromIndexedDB(): Promise<Array<{ id: string; name: string; base64: string }> | null> {
  return getAllSoundsFromIndexedDB("sounds-caller");
}

// Get all sounds from IndexedDB for soundFx
export async function getAllSoundFxFromIndexedDB(): Promise<Array<{ id: string; name: string; base64: string }> | null> {
  return getAllSoundsFromIndexedDB("sounds-fx");
}

// Generic function to get all sounds from IndexedDB
async function getAllSoundsFromIndexedDB(
  storeName: "sounds-caller" | "sounds-fx",
): Promise<Array<{ id: string; name: string; base64: string }> | null> {
  try {
    const db = await getDB();
    if (!db) return null;

    const sounds = await db.getAll(storeName);
    return sounds.map(sound => ({
      id: sound.id,
      name: sound.name,
      base64: sound.base64,
    }));
  } catch (error) {
    console.error(`Error getting all sounds from IndexedDB (${storeName}):`, error);
    return null;
  }
}

// Migration function to move existing base64 sounds from localStorage to IndexedDB
export async function migrateCallerSoundsToIndexedDB(
  config: IConfig,
  updateConfig: (updatedConfig: IConfig) => Promise<void>,
): Promise<boolean> {
  return migrateSoundsToIndexedDB(
    "caller",
    config,
    updateConfig,
    saveSoundToIndexedDB,
  );
}

// Migration function for SoundFx
export async function migrateSoundFxToIndexedDB(
  config: IConfig,
  updateConfig: (updatedConfig: IConfig) => Promise<void>,
): Promise<boolean> {
  return migrateSoundsToIndexedDB(
    "soundFx",
    config,
    updateConfig,
    saveSoundFxToIndexedDB,
  );
}

// Generic migration function
async function migrateSoundsToIndexedDB(
  featureKey: "caller" | "soundFx",
  config: IConfig,
  updateConfig: (updatedConfig: IConfig) => Promise<void>,
  saveFunction: (name: string, base64: string) => Promise<string | null>,
): Promise<boolean> {
  if (!isIndexedDBAvailable() || !config?.[featureKey]?.sounds?.length) {
    return false;
  }

  let migrated = false;
  const updatedSounds: ISound[] = [];

  // Process each sound
  for (const sound of config[featureKey].sounds) {
    // Skip sounds that don't have base64 data
    if (!sound.base64) {
      updatedSounds.push(sound);
      continue;
    }

    try {
      // Save to IndexedDB
      const soundId = await saveFunction(
        sound.name || "Migrated Sound",
        sound.base64,
      );

      if (soundId) {
        // Update the sound object with the soundId and remove base64 from config
        updatedSounds.push({
          ...sound,
          soundId,
          base64: "", // Clear base64 from config to save space
        });
        migrated = true;
      } else {
        // If we couldn't save to IndexedDB, keep the original
        updatedSounds.push(sound);
      }
    } catch (error) {
      console.error(`Error migrating ${featureKey} sound to IndexedDB:`, error);
      // Keep the original if there was an error
      updatedSounds.push(sound);
    }
  }

  // Only update config if we actually migrated something
  if (migrated) {
    const updatedConfig: IConfig = {
      ...config,
      [featureKey]: {
        ...config[featureKey],
        sounds: updatedSounds,
      },
    };

    await updateConfig(updatedConfig);
  }

  return migrated;
}

// Utility function to fetch resources through the background script (bypassing CORS)
export async function backgroundFetch(url: string, options: RequestInit = {}): Promise<{
  ok: boolean;
  status?: number;
  statusText?: string;
  data?: string;
  error?: string;
  tooLarge?: boolean;
  suggestChunked?: boolean;
}> {
  try {
    // Send a message to the background script to perform the fetch
    const response = await browser.runtime.sendMessage({
      type: "fetch",
      url,
      options,
    });

    // Check if response is undefined (communication issue)
    if (response === undefined) {
      console.error("Background fetch failed: No response from background script");
      return {
        ok: false,
        error: "No response from background script. This may be due to a messaging issue.",
      };
    }

    // If response suggests using chunked download for large files
    if (response.ok && response.tooLarge && response.suggestChunked) {
      console.log("File too large for regular backgroundFetch, using chunkedBackgroundFetch instead");
      return await chunkedBackgroundFetch(url, options);
    }

    return response;
  } catch (error) {
    console.error("Error in backgroundFetch:", error);
    // If we get a "message too large" error, try chunked download
    if (error instanceof Error && error.message.includes("Message length exceeded")) {
      console.log("Message size exceeded, falling back to chunkedBackgroundFetch");
      return await chunkedBackgroundFetch(url, options);
    }

    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Function to download large files in chunks through the background script
export async function chunkedBackgroundFetch(url: string, options: RequestInit = {}): Promise<{
  ok: boolean;
  status?: number;
  statusText?: string;
  data?: string;
  error?: string;
}> {
  try {
    // Step 1: Start a chunked download
    const startResponse = await browser.runtime.sendMessage({
      type: "fetch",
      url,
      options,
      chunked: true,
      action: "start",
    });

    // Check if startResponse is undefined (communication issue)
    if (startResponse === undefined) {
      console.error("Chunked background fetch failed: No response from background script");
      return {
        ok: false,
        error: "No response from background script. This may be due to a messaging issue.",
      };
    }

    if (!startResponse.ok) {
      return {
        ok: false,
        status: startResponse.status,
        statusText: startResponse.statusText,
        error: startResponse.error || "Failed to start chunked download",
      };
    }

    // Get download ID and total chunks
    const { downloadId, totalChunks, mimeType } = startResponse;

    // Step 2: Fetch each chunk
    const chunks: string[] = [];
    for (let i = 0; i < totalChunks; i++) {
      // Request chunk from background
      const chunkResponse = await browser.runtime.sendMessage({
        type: "fetch",
        chunked: true,
        action: "getChunk",
        downloadId,
        chunkIndex: i,
      });

      if (!chunkResponse.ok) {
        return {
          ok: false,
          error: `Failed to retrieve chunk ${i}/${totalChunks}`,
        };
      }

      chunks.push(chunkResponse.chunk);
    }

    // Step 3: Complete the download and clean up
    await browser.runtime.sendMessage({
      type: "fetch",
      chunked: true,
      action: "complete",
      downloadId,
    });

    // Combine all chunks and create a data URL
    const base64Data = chunks.join("");
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    return {
      ok: true,
      data: dataUrl,
    };
  } catch (error) {
    console.error("Error in chunkedBackgroundFetch:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Add this to utils/helpers.ts
export function detectAudioMimeType(base64Data: string): string {
  // Get the actual data part without the prefix
  const base64Content = typeof base64Data === "string" && base64Data.includes("data:")
    ? base64Data.split(";base64,")[1]
    : base64Data;

  if (!base64Content || typeof base64Content !== "string") {
    return "audio/mpeg"; // Default if invalid input
  }

  try {
    // MP3 detection - look for ID3 or MPEG header patterns
    if (base64Content.startsWith("SUQz")
        || base64Content.startsWith("ID3")
        || base64Content.includes("LAME")
        || base64Content.startsWith("//M")
        || base64Content.startsWith("//Ug")
        || base64Content.startsWith("AAAA")) {
      return "audio/mpeg";
    }

    // M4A/AAC detection
    if (base64Content.includes("ftypM4A")
        || base64Content.includes("M4A")
        || base64Content.includes("mp42")
        || base64Content.includes("MOOV")
        || base64Content.includes("ftyp")) {
      return "audio/mp4";
    }

    // WAV detection
    if (base64Content.startsWith("RIFF")
        || base64Content.startsWith("UklG") // RIFF in base64
        || base64Content.includes("WAVE")
        || base64Content.includes("wave")) {
      return "audio/wav";
    }

    // OGG detection
    if (base64Content.startsWith("T0RnZ")
        || base64Content.startsWith("Og==") // "O" in base64
        || base64Content.includes("vorbis")
        || base64Content.includes("vorb")) {
      return "audio/ogg";
    }

    // Look for other common audio format markers
    if (base64Content.includes("FLAC")) {
      return "audio/flac";
    }

    if (base64Content.includes("WebM") || base64Content.includes("webm")) {
      return "audio/webm";
    }
  } catch (error) {
    console.warn("Error in MIME type detection:", error);
  }

  // Default to MP3 if we can't detect the format
  return "audio/mpeg";
}

/**
 * Safely clone objects that might contain non-cloneable properties
 * @param obj The object to clone
 * @returns A deep clone of the object
 */
export function safeClone<T>(obj: T): T {
  // Check if the object is null or not an object type
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  // Handle special types like Date, etc.
  if (obj instanceof Date) {
    return new Date(obj) as unknown as T;
  }

  // Create a new instance with the appropriate prototype
  const result = Array.isArray(obj) ? [] : {};

  // Copy properties
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      // Recursively clone nested objects
      (result as any)[key] = typeof value === "object" && value !== null
        ? safeClone(value)
        : value;
    }
  }

  return result as T;
}

/**
 * Converts a string into a consistent numerical seed for avatar generation
 */
export function idToSeed(id: string): number {
  let seed = 0;
  for (let i = 0; i < id.length; i++) {
    seed = id.charCodeAt(i) + ((seed << 5) - seed);
  }
  return seed;
}

/**
 * Returns a light, vibrant color for avatar pixels based on a seed
 */
export function getLightColor(seed: number): string {
  const avatarColors = [
    "#9763f8", "#e5739f", "#bbf5ec", "#5df0ab", "#4ac6e3",
    "#ff6b6b", "#ffb84d", "#8fa3ae", "#f490b1", "#aed581",
    "#f9e180", "#84b84c", "#4b4b6c", "#d9d9d9",
  ];
  return avatarColors[Math.abs(seed) % avatarColors.length];
}

/**
 * Returns a darker, vibrant color for avatar backgrounds based on a seed
 */
export function getDarkerVibrantColor(seed: number): string {
  const backgroundColors = [
    "#401354", "#404c29", "#625a01", "#59282a", "#4e6a03",
    "#8fa3ae", "#f490b1", "#aed581", "#ff6b6b", "#ffb84d",
    "#4b4b6c", "#84b84c", "#d9d9d9", "#f9e180",
  ];
  return backgroundColors[Math.abs(seed) % backgroundColors.length];
}

/**
 * Checks if a Gravatar URL points to a custom uploaded image or a default one
 * @param avatarUrl The Gravatar URL to check
 * @returns Promise that resolves to true if it's a custom image, false if it's a default image
 */
export async function isCustomGravatar(avatarUrl: string): Promise<boolean> {
  if (!avatarUrl) return false;
  try {
    // Add the d=404 parameter to the URL
    const url = new URL(avatarUrl);
    url.searchParams.set("d", "404");

    // Make the request
    const response = await fetch(url.toString());
    return response.status === 200;
  } catch (error) {
    console.error("Error checking Gravatar:", error);
    return false;
  }
}

/**
 * Generates a retro-style pixel art avatar based on a name
 * Uses an 8x8 grid with mirrored pattern for consistent, unique avatars
 */
export function generateAvatar(name: string): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) return "";

  const size = 64; // R1 S64 size
  const gridSize = 8;
  const pixelSize = size / gridSize;

  canvas.width = size;
  canvas.height = size;

  const seed = idToSeed(name);
  const avatarColor = getLightColor(seed);
  const backgroundColor = getDarkerVibrantColor(seed + 1); // Use offset seed for background

  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, size, size);

  // Draw pixel pattern
  ctx.fillStyle = avatarColor;
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize / 2; x++) {
      const shouldFill = (seed >> (y * 4 + x)) & 1;
      if (shouldFill) {
        // Draw left side
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        // Mirror to right side
        ctx.fillRect((gridSize - 1 - x) * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }
  }

  return canvas.toDataURL("image/png");
}

// Save a base64 animation to IndexedDB
export async function saveAnimationToIndexedDB(
  name: string,
  base64Data: string,
  existingId?: string,
): Promise<string | null> {
  try {
    const db = await getDB();
    if (!db) return null;

    // Use existing ID if provided, otherwise generate a new one
    const id = existingId || `animation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const dateAdded = existingId
      ? (await db.get("animations", id))?.dateAdded || Date.now()
      : Date.now();

    const animationData = {
      id,
      name,
      base64: base64Data,
      dateAdded,
    };

    await db.put("animations", animationData);
    return id;
  } catch (error) {
    console.error("Error saving animation to IndexedDB:", error);
    return null;
  }
}

// Get an animation from IndexedDB by ID
export async function getAnimationDataFromIndexedDB(id: string) {
  try {
    const db = await getDB();
    if (!db) return null;

    const animation = await db.get("animations", id);
    if (!animation) return null;

    return animation;
  } catch (error) {
    console.error("Error getting animation data from IndexedDB:", error);
    return null;
  }
}

export async function getAnimationFromIndexedDB(id: string): Promise<string | null> {
  try {
    const data = await getAnimationDataFromIndexedDB(id);
    if (!data) return null;

    return data.base64;
  } catch (error) {
    console.error("Error getting animation from IndexedDB:", error);
    return null;
  }
}

export async function getAnimationNameFromIndexedDB(id: string): Promise<string | null> {
  try {
    const data = await getAnimationDataFromIndexedDB(id);
    if (!data) return null;

    return data.name;
  } catch (error) {
    console.error("Error getting animation name from IndexedDB:", error);
    return null;
  }
}

// Delete an animation from IndexedDB
export async function deleteAnimationFromIndexedDB(id: string): Promise<boolean> {
  try {
    const db = await getDB();
    if (!db) return false;

    await db.delete("animations", id);
    return true;
  } catch (error) {
    console.error("Error deleting animation from IndexedDB:", error);
    return false;
  }
}

// Clear all animations from IndexedDB
export async function clearAnimationsFromIndexedDB(): Promise<boolean> {
  try {
    const db = await getDB();
    if (!db) return false;

    await db.clear("animations");
    return true;
  } catch (error) {
    console.error("Error clearing animations from IndexedDB:", error);
    return false;
  }
}

// Get all animations from IndexedDB
export async function getAllAnimationsFromIndexedDB(): Promise<Array<{ id: string; name: string; base64: string }> | null> {
  try {
    const db = await getDB();
    if (!db) return null;

    const animations = await db.getAll("animations");
    return animations.map(animation => ({
      id: animation.id,
      name: animation.name,
      base64: animation.base64,
    }));
  } catch (error) {
    console.error("Error getting all animations from IndexedDB:", error);
    return null;
  }
}

/**
 * Define regex patterns for each trigger type
 */
export const triggerPatterns = {
  // Points: 0 to 180
  points: /^(180|1[0-7][0-9]|[1-9][0-9]|[0-9])$/,

  // Ranges: 100-140 or range_100_140
  ranges: /^(?:range_)?(180|1[0-7][0-9]|[1-9][0-9]|[0-9])[-_](180|1[0-7][0-9]|[1-9][0-9]|[0-9])$/,

  // Singles: s0 to s20 and 25
  singles: /^s(1[0-9]|20|[0-9]|25)$/,

  // Doubles: d1 to d20
  doubles: /^d(1[0-9]|20|[1-9])$/,

  // Triples: t1 to t20
  triples: /^t(1[0-9]|20|[1-9])$/,

  // Special events
  specialEvents: /^(bull|outside|busted|gameshot|luckynumber)$/,

  // Combination tags: Format: [first dart]_[second dart]_[third dart]
  // Each dart can be a single, double, triple, or bull
  dartPattern: /^(s(1[0-9]|20|[0-9]|25)|d(1[0-9]|20|[1-9])|t(1[0-9]|20|[1-9])|bull)$/,
};

/**
 * Validates animation triggers according to the supported formats
 * @param triggers Array of trigger strings to validate
 * @returns Object containing valid triggers and any invalid ones that were removed
 */
export function validateAnimationTriggers(triggers: string[]): {
  validTriggers: string[];
  invalidTriggers: string[];
} {
  const validTriggers: string[] = [];
  const invalidTriggers: string[] = [];

  console.log("checking triggers", triggers);

  if (!Array.isArray(triggers)) {
    return { validTriggers: [], invalidTriggers: [] };
  }

  // Combination pattern builder
  const isValidCombination = (combo: string): boolean => {
    const parts = combo.split("_");

    // Must have 2 or 3 parts
    if (parts.length < 2 || parts.length > 3) {
      return false;
    }

    // Each part must be a valid dart
    return parts.every(part => triggerPatterns.dartPattern.test(part));
  };

  // Process each trigger
  for (const trigger of triggers) {
    const trimmedTrigger = trigger.trim().toLowerCase();

    // Skip empty triggers
    if (!trimmedTrigger) {
      continue;
    }

    // Check if it's a valid combination
    if (trimmedTrigger.includes("_")) {
      if (isValidCombination(trimmedTrigger)) {
        validTriggers.push(trimmedTrigger);
      } else {
        invalidTriggers.push(trimmedTrigger);
      }
      continue;
    }

    // Check against all single-dart patterns
    if (
      triggerPatterns.points.test(trimmedTrigger)
      || triggerPatterns.singles.test(trimmedTrigger)
      || triggerPatterns.doubles.test(trimmedTrigger)
      || triggerPatterns.triples.test(trimmedTrigger)
      || triggerPatterns.specialEvents.test(trimmedTrigger)
      || triggerPatterns.ranges.test(trimmedTrigger)
    ) {
      validTriggers.push(trimmedTrigger);
    } else {
      invalidTriggers.push(trimmedTrigger);
    }
  }

  return { validTriggers, invalidTriggers };
}

// OPFS helpers for animation storage
// Check if OPFS is available in this browser
export function isOPFSAvailable(): boolean {
  return typeof navigator !== "undefined"
      && typeof navigator.storage !== "undefined"
      && typeof navigator.storage.getDirectory === "function";
}

// Get the animations directory in OPFS
async function getAnimationsDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!isOPFSAvailable()) {
    throw new Error("OPFS is not available");
  }

  const root = await navigator.storage.getDirectory();
  return await root.getDirectoryHandle("animations", { create: true });
}

// Save animation GIF to OPFS
export async function saveAnimationToOPFS(fileName: string, fileBlob: Blob): Promise<string> {
  try {
    // Get root directory
    const animDir = await getAnimationsDirectory();

    // Generate a unique ID for this animation
    const animationId = `animation_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const uniqueFileName = `${animationId}_${fileName}`;

    // Save the file to OPFS
    const fileHandle = await animDir.getFileHandle(uniqueFileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(fileBlob);
    await writable.close();

    // Store metadata in local storage
    const metadata = {
      id: animationId,
      fileName,
      storedName: uniqueFileName,
      dateAdded: Date.now(),
    };

    localStorage.setItem(`animation_meta_${animationId}`, JSON.stringify(metadata));

    return animationId;
  } catch (error) {
    console.error("Error saving animation to OPFS:", error);
    throw error;
  }
}

// Get animation from OPFS
export async function getAnimationFromOPFS(animationId: string): Promise<string | null> {
  try {
    const animDir = await getAnimationsDirectory();

    // Get metadata from local storage
    const metadataStr = localStorage.getItem(`animation_meta_${animationId}`);
    if (!metadataStr) return null;

    const metadata = JSON.parse(metadataStr);
    const uniqueFileName = metadata.storedName;

    const fileHandle = await animDir.getFileHandle(uniqueFileName);
    const file = await fileHandle.getFile();

    // Create and return an object URL for the file
    return URL.createObjectURL(file);
  } catch (error) {
    console.error("Error retrieving animation from OPFS:", error);
    return null;
  }
}

// Get animation original filename
export async function getAnimationNameFromOPFS(animationId: string): Promise<string | null> {
  try {
    const metadataStr = localStorage.getItem(`animation_meta_${animationId}`);
    if (!metadataStr) return null;

    const metadata = JSON.parse(metadataStr);
    return metadata.fileName || null;
  } catch (error) {
    console.error("Error getting animation name:", error);
    return null;
  }
}

// Delete animation from OPFS
export async function deleteAnimationFromOPFS(animationId: string): Promise<boolean> {
  try {
    const animDir = await getAnimationsDirectory();

    // Get metadata from local storage
    const metadataStr = localStorage.getItem(`animation_meta_${animationId}`);
    if (!metadataStr) return false;

    const metadata = JSON.parse(metadataStr);
    const uniqueFileName = metadata.storedName;

    // Delete the file from OPFS and metadata from local storage
    await animDir.removeEntry(uniqueFileName);
    localStorage.removeItem(`animation_meta_${animationId}`);

    return true;
  } catch (error) {
    console.error("Error deleting animation from OPFS:", error);
    return false;
  }
}

// Clear all animations from OPFS
export async function clearAnimationsFromOPFS(): Promise<boolean> {
  try {
    const animDir = await getAnimationsDirectory();

    // Find all animation metadata entries in local storage
    const animationKeys = Object.keys(localStorage)
      .filter(key => key.startsWith("animation_meta_"));

    if (animationKeys.length === 0) {
      return true; // No animations to delete
    }

    // @ts-expect-error - entries() returns an iterator (see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/entries)
    for await (const [ name ] of animDir.entries()) {
      try {
        await animDir.removeEntry(name);
      } catch (err) {
        console.error(`Could not delete ${name}:`, err);
      }
    }

    // Clear all metadata entries
    for (const key of animationKeys) {
      localStorage.removeItem(key);
    }

    return true;
  } catch (error) {
    console.error("Error clearing animations from OPFS:", error);
    return false;
  }
}

// Get all animations metadata
export async function getAllAnimationsMetadataFromOPFS(): Promise<Array<{
  id: string;
  fileName: string;
  storedName: string;
  dateAdded: number;
}> | null> {
  try {
    // Get all animation metadata from local storage
    const animationKeys = Object.keys(localStorage)
      .filter(key => key.startsWith("animation_meta_"));

    const metadataList = animationKeys.map((key) => {
      const metadataStr = localStorage.getItem(key);
      return metadataStr ? JSON.parse(metadataStr) : null;
    }).filter(Boolean);

    return metadataList;
  } catch (error) {
    console.error("Error getting all animations metadata:", error);
    return null;
  }
}

// Revoke object URL to free memory
export function revokeAnimationURL(objectURL: string): void {
  if (objectURL?.startsWith("blob:")) {
    URL.revokeObjectURL(objectURL);
  }
}
