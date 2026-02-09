<template>
  <div
    v-show="config?.instantReplay?.enabled && (showReplay || isTransitioning)"
    class="fixed z-[190] transition-opacity duration-500"
    :class="[containerClasses, { 'opacity-0': !showReplay, 'opacity-100': showReplay }]"
    :style="containerStyle"
  >
    <div class="absolute inset-0">
      <video
        @click="handleVideoClick"
        id="replay-video"
        ref="videoElement"
        autoplay
        muted
        playsinline
        :style="{ transform: `scale(${zoomLevel}) translate(${positionX}%, ${positionY}%)` }"
        class="size-full cursor-pointer object-cover"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { AutodartsToolsConfig, type IConfig } from "@/utils/storage";
import { AutodartsToolsGameData } from "@/utils/game-data-storage";

const videoElement = ref<HTMLVideoElement | null>(null);
const config = ref<IConfig>();
const mediaStream = ref<MediaStream | null>(null);
const cameraError = ref<string | null>(null);
const showReplay = ref(false);
const isTransitioning = ref(false);
let hideReplayTimeout: NodeJS.Timeout | null = null;
let transitionTimeout: NodeJS.Timeout | null = null;

// For storing the delayed playback components
let sourceVideo: HTMLVideoElement | null = null;
let buffer: ImageBitmap[] = [];
let animationFrameId: number | null = null;
let sourceCanvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let canvasStream: MediaStream | null = null;

// FPS detection
const detectedFPS = ref<number>(30); // Default to 30 FPS until detected
let fpsDetectionFrames: number[] = [];
let fpsDetectionStartTime: number | null = null;

// Board position tracking
const boardPosition = ref({
  top: 0,
  left: 0,
  width: 0,
  height: 0,
});
let updateInterval: NodeJS.Timeout | null = null;

// Computed properties for camera settings
const zoomLevel = computed(() => config.value?.instantReplay?.zoom || 1);
const positionX = computed(() => config.value?.instantReplay?.positionX ?? 0);
const positionY = computed(() => config.value?.instantReplay?.positionY ?? 0);
const delaySeconds = computed(() => config.value?.instantReplay?.delay ?? 0);
const durationSeconds = computed(() => config.value?.instantReplay?.duration ?? 10);
const viewMode = computed(() => config.value?.instantReplay?.viewMode || "full-page");

// Computed properties for container styling
const containerClasses = computed(() => {
  const isFullPage = viewMode.value === "full-page";
  return {
    "inset-0 size-full": isFullPage,
  };
});

const containerStyle = computed(() => {
  const isFullPage = viewMode.value === "full-page";
  if (isFullPage) {
    return {};
  }

  return {
    top: `${boardPosition.value.top}px`,
    left: `${boardPosition.value.left}px`,
    width: `${boardPosition.value.width}px`,
    height: `${boardPosition.value.height}px`,
  };
});

onMounted(async () => {
  // Load config and start camera
  await loadConfig();
  await startCamera();

  // Update board position
  updateBoardPosition();

  // Set up interval to update board position
  window.addEventListener("resize", updateBoardPosition);
  updateInterval = setInterval(updateBoardPosition, 1000);

  // Watch for game data changes to detect winner
  setupGameDataWatcher();
});

onUnmounted(() => {
  // Clean up camera and all resources first
  cleanup();

  // Clean up board position tracking
  if (updateInterval) clearInterval(updateInterval);
  window.removeEventListener("resize", updateBoardPosition);

  // Clear any pending timeouts
  if (hideReplayTimeout) {
    clearTimeout(hideReplayTimeout);
    hideReplayTimeout = null;
  }

  if (transitionTimeout) {
    clearTimeout(transitionTimeout);
    transitionTimeout = null;
  }

  // Ensure video element is cleared
  if (videoElement.value) {
    videoElement.value.srcObject = null;
  }
});

// Watch for changes in config
watch(() => config.value?.instantReplay, async () => {
  if (config.value?.instantReplay?.enabled) {
    await startCamera();
  } else {
    cleanup();
  }
}, { deep: true });

// Watch for FPS detection changes to update canvas stream
watch(detectedFPS, (newFPS) => {
  if (canvasStream && sourceCanvas) {
    // Stop the current stream
    canvasStream.getTracks().forEach(track => track.stop());

    // Create a new stream with the detected FPS
    canvasStream = sourceCanvas.captureStream(newFPS);

    // Update the video element with the new stream
    if (videoElement.value) {
      videoElement.value.srcObject = canvasStream;
    }

    console.log(`Updated canvas stream to use ${newFPS} FPS`);
  }
});

function cleanup() {
  // Stop animation frame
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  // Clean up canvas stream
  if (canvasStream) {
    canvasStream.getTracks().forEach((track) => {
      track.stop();
      console.log("Canvas stream track stopped:", track.kind);
    });
    canvasStream = null;
  }

  // Clean up media stream (camera)
  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach((track) => {
      track.stop();
      console.log("Media stream track stopped:", track.kind, track.label);
    });
    mediaStream.value = null;
  }

  // Clear source video srcObject before removing
  if (sourceVideo) {
    sourceVideo.srcObject = null;
    if (sourceVideo.parentNode) {
      sourceVideo.parentNode.removeChild(sourceVideo);
    }
    sourceVideo = null;
  }

  // Remove the canvas element
  if (sourceCanvas && sourceCanvas.parentNode) {
    sourceCanvas.parentNode.removeChild(sourceCanvas);
    sourceCanvas = null;
  }

  // Clear the buffer
  buffer.forEach(bitmap => bitmap.close());
  buffer = [];
  ctx = null;

  // Reset camera error state
  cameraError.value = null;

  // Reset FPS detection
  detectedFPS.value = 30;
  fpsDetectionFrames = [];
  fpsDetectionStartTime = null;
}

function updateBoardPosition(): void {
  const boardElement = document.querySelector("#ad-ext-turn")?.nextElementSibling?.querySelector(".showAnimations");
  if (boardElement) {
    const rect = boardElement.getBoundingClientRect();
    boardPosition.value = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  }
}

async function loadConfig() {
  config.value = await AutodartsToolsConfig.getValue();
}

function setupGameDataWatcher() {
  AutodartsToolsGameData.watch(async (gameData) => {
    // Check if there's a winner
    if (gameData?.match && (gameData.match.winner !== -1 || gameData.match.gameWinner !== -1)) {
      // Clear any existing timeouts
      if (hideReplayTimeout) {
        clearTimeout(hideReplayTimeout);
        hideReplayTimeout = null;
      }

      if (transitionTimeout) {
        clearTimeout(transitionTimeout);
        transitionTimeout = null;
      }

      // Wait 3 seconds before showing the replay
      setTimeout(() => {
        // Show the replay with fade-in
        fadeInReplay();

        // Set a timeout to hide the replay after the configured duration (delay + duration)
        const replayDuration = (delaySeconds.value + durationSeconds.value) * 1000; // Convert to milliseconds
        hideReplayTimeout = setTimeout(() => {
          fadeOutReplay();
          hideReplayTimeout = null;
        }, replayDuration);
      }, 3000); // 3-second delay
    } else if (gameData?.match?.activated !== undefined && gameData.match.activated >= 0) {
      // Hide replay when game is active or edited
      fadeOutReplay();
      if (hideReplayTimeout) {
        clearTimeout(hideReplayTimeout);
        hideReplayTimeout = null;
      }
    }
  });
}

async function startCamera() {
  if (!config.value?.instantReplay?.enabled || !videoElement.value) return;

  try {
    // Clean up any existing resources
    cleanup();

    // Get the selected device ID from config
    const deviceId = config.value.instantReplay.deviceId;

    // Set up constraints based on whether we have a specific device ID
    const constraints = {
      video: deviceId ? { deviceId: { exact: deviceId } } : true,
      audio: false,
    };

    try {
      // Request camera access
      mediaStream.value = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (cameraError) {
      console.error("Camera access error:", cameraError);
      // Re-throw to be caught by outer try-catch
      throw cameraError;
    }

    // Create a new source video element for the live feed
    sourceVideo = document.createElement("video");
    sourceVideo.autoplay = true;
    sourceVideo.playsInline = true;
    sourceVideo.muted = true;
    sourceVideo.srcObject = mediaStream.value;

    // Wait for video to start playing
    await new Promise<void>((resolve) => {
      if (!sourceVideo) return resolve();

      const onPlaying = () => {
        sourceVideo?.removeEventListener("playing", onPlaying);
        resolve();
      };

      sourceVideo.addEventListener("playing", onPlaying);
      sourceVideo.play().catch((error) => {
        console.error("Error starting source video:", error);
        resolve();
      });
    });

    // Create the canvas for drawing the delayed video
    sourceCanvas = document.createElement("canvas");

    // Make sure source video has started and has dimensions
    if (sourceVideo.videoWidth && sourceVideo.videoHeight) {
      // Set canvas dimensions to match video
      sourceCanvas.width = sourceVideo.videoWidth;
      sourceCanvas.height = sourceVideo.videoHeight;

      // Get canvas context
      ctx = sourceCanvas.getContext("2d", { willReadFrequently: true });

      if (ctx) {
        console.log("Canvas and context created successfully");

        // Create a stream from the canvas (will be updated when FPS is detected)
        canvasStream = sourceCanvas.captureStream(detectedFPS.value);

        // Set the delayed stream as the source for our display video
        if (videoElement.value) {
          videoElement.value.srcObject = canvasStream;
        }

        // Start the delayed playback system
        startDelayedPlayback();
      }
    } else {
      console.error("Source video has no dimensions");
      cameraError.value = "Camera stream started but has no dimensions.";
    }
  } catch (error) {
    console.error("Error starting camera:", error);
    cameraError.value = "Failed to access the camera.";
  }
}

function startDelayedPlayback() {
  if (!sourceVideo || !ctx || !sourceCanvas) {
    console.error("Cannot start delayed playback: missing components");
    return;
  }

  // Calculate frame buffer size based on delay using detected FPS
  const bufferSize = delaySeconds.value * detectedFPS.value;
  const frameBuffer: ImageBitmap[] = [];
  let shouldOutput = false;

  console.log(`Starting delayed playback with buffer size: ${bufferSize} (${detectedFPS.value} FPS)`);

  // Function to capture frames and create the delay
  const captureFrame = async () => {
    if (!sourceVideo || !ctx || !sourceCanvas) {
      console.log("Stopping capture: components no longer available");
      return;
    }

    try {
      // Detect FPS during the first few seconds
      if (fpsDetectionStartTime === null || performance.now() - fpsDetectionStartTime < 2000) {
        detectFPS();
      }

      // Create a bitmap from the current video frame (efficient, async, avoids main thread block)
      const bitmap = await createImageBitmap(sourceVideo);

      // Add the frame to our buffer
      frameBuffer.push(bitmap);

      // If buffer is full, start showing the delayed frames
      if (frameBuffer.length >= bufferSize) {
        shouldOutput = true;

        // Get the oldest frame
        const delayedFrame = frameBuffer.shift();

        // Draw that frame to the canvas
        if (delayedFrame) {
          ctx.drawImage(delayedFrame, 0, 0, sourceCanvas.width, sourceCanvas.height);
          delayedFrame.close(); // Important: release GPU memory
        }
      }

      // Schedule the next frame capture
      animationFrameId = requestAnimationFrame(captureFrame);
    } catch (e) {
      console.error("Error in capture frame:", e);
      // Try to continue anyway
      animationFrameId = requestAnimationFrame(captureFrame);
    }
  };

  // Start capturing frames
  animationFrameId = requestAnimationFrame(captureFrame);

  console.log("Delayed playback started");
}

// Function to show replay with fade-in
function fadeInReplay() {
  isTransitioning.value = true;
  showReplay.value = true;
}

// Function to hide replay with fade-out
function fadeOutReplay() {
  showReplay.value = false;

  // Keep element in DOM during transition
  if (transitionTimeout) {
    clearTimeout(transitionTimeout);
  }

  // Remove element after transition completes
  transitionTimeout = setTimeout(() => {
    isTransitioning.value = false;
    transitionTimeout = null;
  }, 500); // match the duration-500 from the CSS
}

function handleVideoClick() {
  // Clear any existing timeout to prevent automatic hiding
  if (hideReplayTimeout) {
    clearTimeout(hideReplayTimeout);
    hideReplayTimeout = null;
  }

  fadeOutReplay();
}

// Function to detect the actual FPS of the camera
function detectFPS() {
  const now = performance.now();

  if (fpsDetectionStartTime === null) {
    fpsDetectionStartTime = now;
    fpsDetectionFrames = [ now ];
    return;
  }

  fpsDetectionFrames.push(now);

  // Collect frames for 2 seconds to get a good average
  const detectionDuration = 2000; // 2 seconds
  if (now - fpsDetectionStartTime >= detectionDuration) {
    // Calculate FPS based on collected frames
    const frameCount = fpsDetectionFrames.length - 1; // Subtract 1 because we count intervals
    const totalTime = (fpsDetectionFrames[fpsDetectionFrames.length - 1] - fpsDetectionFrames[0]) / 1000; // Convert to seconds
    const calculatedFPS = frameCount / totalTime;

    // Round to nearest common FPS value (24, 25, 30, 60, etc.)
    const commonFPS = [ 24, 25, 30, 50, 60, 120 ];
    const closestFPS = commonFPS.reduce((prev, curr) =>
      Math.abs(curr - calculatedFPS) < Math.abs(prev - calculatedFPS) ? curr : prev,
    );

    detectedFPS.value = closestFPS;
    console.log(`Detected camera FPS: ${calculatedFPS.toFixed(2)}, using: ${closestFPS}`);

    // Reset detection variables to stop measuring
    fpsDetectionStartTime = null;
    fpsDetectionFrames = [];
  }
}
</script>
