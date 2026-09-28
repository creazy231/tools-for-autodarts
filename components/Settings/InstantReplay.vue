<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <!-- Visible overflow so the preview can stick; see Colors.vue. -->
    <div v-if="config" class="adt-container !overflow-visible">
      <div class="relative z-10 pr-2 text-[var(--ad-text-secondary)]">
        <p class="max-w-3xl">
          Point a webcam at your board, and the winning dart is played back over the screen whenever a leg is won, from
          a few seconds before it to a few after. A click on the replay puts it away early.
        </p>
        <p class="mb-6 mt-2 max-w-3xl text-sm text-[var(--ad-text-muted)]">
          It records only while you are in a match, and nothing leaves your computer. This is your own webcam, not the
          board's camera, which the browser cannot reach.
        </p>

        <AppAlert v-if="cameraError" class="mb-6" :title="hasCameraPermission ? 'Camera unavailable' : 'No camera access'" variant="error">
          {{ cameraError }}
          <template #action>
            <!-- With access already given, only the cameras need looking at again, not the permission. -->
            <AppButton @click="hasCameraPermission ? loadCameraDevices() : requestCameraAccess()" auto size="sm">
              Try again
            </AppButton>
          </template>
        </AppAlert>

        <!-- While the browser asks. Not while an earlier grant lets it answer by itself, which only takes a moment. -->
        <div
          v-if="!hasCameraPermission && !cameraError && !answeringItself"
          class="flex flex-col items-center rounded-[var(--ad-radius-lg)] bg-[var(--ad-surface-sunken)] px-6 py-12 text-center"
        >
          <span class="icon-[material-symbols--videocam-outline-rounded] mb-4 text-5xl text-white/25" />
          <p class="text-lg font-bold text-white">
            Camera access needed
          </p>
          <p class="mt-1 max-w-md text-sm text-[var(--ad-text-muted)]">
            The replay is recorded from your webcam, so the browser asks you first. Allow it in the prompt, or ask again.
          </p>
          <AppButton @click="requestCameraAccess" auto class="mt-6" type="primary">
            Allow camera access
          </AppButton>
        </div>

        <!-- The preview beside the options where there is room, kept in view while they scroll; above them on a phone. -->
        <div v-if="hasCameraPermission" class="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] lg:items-start lg:gap-8">
          <div class="mb-8 lg:sticky lg:top-0 lg:order-2 lg:mb-0">
            <h3 class="adt-section-title mb-3">
              Preview
            </h3>
            <div class="relative overflow-hidden rounded-[var(--ad-radius-lg)] bg-[var(--ad-surface-sunken)]">
              <video
                ref="videoPreview"
                class="aspect-video w-full object-cover"
                autoplay
                muted
                playsinline
                :style="{ transform: `scale(${zoomLevel}) translate(${positionX}%, ${positionY}%)` }"
              />
              <span v-if="currentFps && cameraDevices.length" class="adt-chip absolute bottom-2 right-2 !bg-black/70 !text-white">{{ currentFps }} FPS</span>
              <div v-if="!cameraDevices.length" class="absolute inset-0 flex flex-col items-center justify-center text-sm text-[var(--ad-text-muted)]">
                <span class="icon-[material-symbols--videocam-off-outline-rounded] mb-2 text-4xl text-white/25" />
                No camera to show
              </div>
            </div>
          </div>

          <div>
            <section class="mb-10">
              <h3 class="adt-section-title">
                Camera
              </h3>
              <OptionRow :description="cameraHint" title="Camera">
                <div class="flex items-center gap-1">
                  <!-- The width on a wrapper: .adt-input's own 100% comes after the utilities and beats one on the field. -->
                  <div class="w-56">
                    <AppSelect
                      v-model="selectedDeviceId"
                      :disabled="!cameraDevices.length"
                      :options="cameraOptions"
                      aria-label="Camera"
                    />
                  </div>
                  <button
                    @click="loadCameraDevices"
                    :aria-busy="isLoadingDevices"
                    :aria-label="isLoadingDevices ? 'Looking for cameras' : 'Look for cameras again'"
                    :disabled="isLoadingDevices"
                    class="adt-icon-btn"
                    :title="isLoadingDevices ? 'Looking…' : 'Look again'"
                    type="button"
                  >
                    <span :class="isLoadingDevices ? 'icon-[material-symbols--progress-activity] animate-spin' : 'icon-[material-symbols--refresh-rounded]'" />
                  </button>
                </div>
              </OptionRow>
            </section>

            <section class="mb-10">
              <h3 class="adt-section-title">
                Replay
              </h3>
              <OptionRow description="How much of the run-up to the winning dart the replay shows." title="Before the gameshot">
                <AppNumberInput
                  v-model="config.instantReplay.before"
                  :max="30"
                  :min="1"
                  label="Before the gameshot"
                  unit="s"
                />
              </OptionRow>
              <OptionRow description="And how much of what follows it." title="After the gameshot">
                <AppNumberInput
                  v-model="config.instantReplay.after"
                  :max="10"
                  :min="0"
                  label="After the gameshot"
                  unit="s"
                />
              </OptionRow>
              <OptionRow :description="startDelayHint" title="Start delay">
                <AppNumberInput
                  v-model="config.instantReplay.startDelay"
                  :max="10"
                  :min="0"
                  label="Start delay"
                  unit="s"
                />
              </OptionRow>
              <OptionRow description="Just the board, or the whole page." title="Covers">
                <AppRadioGroup v-model="viewMode" :options="VIEW_MODES" aria-label="Covers" button-size="sm" />
              </OptionRow>
            </section>

            <section>
              <h3 class="adt-section-title">
                Framing
              </h3>
              <OptionRow description="How far the picture zooms in on the board." title="Zoom">
                <div class="flex w-full items-center gap-3 sm:w-64">
                  <AppSlider
                    v-model="zoomLevel"
                    :autofocus="false"
                    :max="5"
                    :min="1"
                    :show-value="false"
                    :step="0.1"
                    class="flex-1"
                  />
                  <span class="w-20 text-right text-sm font-semibold tabular-nums text-[var(--ad-text-primary)]">{{ zoomLevel.toFixed(1) }}×</span>
                </div>
              </OptionRow>
              <template v-if="zoomLevel > 1">
                <OptionRow description="Where the zoomed picture sits, side to side." title="Left and right">
                  <div class="flex w-full items-center gap-3 sm:w-64">
                    <AppSlider
                      v-model="positionX"
                      :autofocus="false"
                      :max="100"
                      :min="-100"
                      :show-value="false"
                      class="flex-1"
                    />
                    <span class="w-20 text-right text-sm font-semibold tabular-nums text-[var(--ad-text-primary)]">{{ panLabel(positionX, "left", "right") }}</span>
                  </div>
                </OptionRow>
                <OptionRow description="And top to bottom." title="Up and down">
                  <div class="flex w-full items-center gap-3 sm:w-64">
                    <AppSlider
                      v-model="positionY"
                      :autofocus="false"
                      :max="100"
                      :min="-100"
                      :show-value="false"
                      class="flex-1"
                    />
                    <span class="w-20 text-right text-sm font-semibold tabular-nums text-[var(--ad-text-primary)]">{{ panLabel(positionY, "up", "down") }}</span>
                  </div>
                </OptionRow>
              </template>
            </section>
          </div>
        </div>
      </div>
    </div>
  </template>

  <template v-else>
    <!-- Feature Card -->
    <div
      v-if="config"
      class="adt-container adt-interactive h-56"
    >
      <div class="relative z-10 flex h-full flex-col justify-between">
        <div>
          <h3 class="mb-1 flex items-center adt-card-title">
            Instant Replay
            <span class="adt-badge adt-badge-practice ml-2">BETA</span>
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>
          <p class="w-2/3 text-white/70">
            Plays the winning dart back from your own webcam whenever a leg is won.
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'instant-replay')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle
            @update:model-value="toggleFeature"
            v-model="config.instantReplay.enabled"
          />
        </div>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppAlert from "../AppAlert.vue";
import AppButton from "../AppButton.vue";
import AppNumberInput from "../AppNumberInput.vue";
import AppRadioGroup from "../AppRadioGroup.vue";
import AppSelect from "../AppSelect.vue";
import AppSlider from "../AppSlider.vue";
import AppToggle from "../AppToggle.vue";

import OptionRow from "./Library/OptionRow.vue";

const emit = defineEmits([ "toggle" ]);

const VIEW_MODES = [
  { label: "Board only", value: "board-only" },
  { label: "Full page", value: "full-page" },
];

const { config } = useConfig();
const videoPreview = ref<HTMLVideoElement | null>(null);
const mediaStream = ref<MediaStream | null>(null);
const hasCameraPermission = ref(false);
const cameraError = ref<string | null>(null);
/**
 * Holds the "Camera access needed" block back while the browser can answer by
 * itself, access having been given before. True from the first render until
 * the check says otherwise, so the block does not flash in and out.
 */
const answeringItself = ref(true);
const cameraDevices = ref<MediaDeviceInfo[]>([]);
const isLoadingDevices = ref(false);
const currentFps = ref<number | null>(null);

// Computed properties
const cameraHint = computed(() => (cameraDevices.value.length
  ? "Only cameras no other app is using are listed."
  : "No free camera found. Another app may be using it: close that, then look again."));

/** Start delay's line, which says so when the seconds after the gameshot hold the replay back for longer. */
const startDelayHint = computed(() => {
  const after = config.value?.instantReplay?.after ?? 0;
  if (after <= (config.value?.instantReplay?.startDelay ?? 0)) return "From the won leg to the replay, leaving room for autodarts' own celebration.";
  return `From the won leg to the replay. The ${after} s after the gameshot have to be filmed first, so it starts after ${after} s.`;
});

const cameraOptions = computed(() => {
  return cameraDevices.value.map(device => ({
    label: device.label || `Camera ${device.deviceId.substring(0, 5)}...`,
    value: device.deviceId,
  }));
});

// Computed properties for form inputs

const selectedDeviceId = computed({
  get: () => config.value?.instantReplay?.deviceId || "",
  set: (value: string) => {
    if (config.value?.instantReplay) {
      config.value.instantReplay.deviceId = value;
      updateCameraPreview(value);
    }
  },
});

const viewMode = computed({
  get: () => config.value?.instantReplay?.viewMode || "board-only",
  set: (value: "full-page" | "board-only") => {
    if (config.value?.instantReplay) {
      config.value.instantReplay.viewMode = value;
    }
  },
});

const zoomLevel = computed({
  get: () => config.value?.instantReplay?.zoom || 1,
  set: (value: number) => {
    if (config.value?.instantReplay) {
      config.value.instantReplay.zoom = value;
    }
  },
});

const positionX = computed({
  get: () => config.value?.instantReplay?.positionX ?? 0,
  set: (value: number) => {
    if (config.value?.instantReplay) {
      config.value.instantReplay.positionX = value;
    }
  },
});

const positionY = computed({
  get: () => config.value?.instantReplay?.positionY ?? 0,
  set: (value: number) => {
    if (config.value?.instantReplay) {
      config.value.instantReplay.positionY = value;
    }
  },
});

// Check if the browser supports getUserMedia
const isCameraSupported = computed(() => {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
});

// Watch for changes in the data-feature-index attribute to detect when settings are opened
watch(() => !getCurrentInstance()?.attrs["data-feature-index"], async (isSettingsPanel, wasPanelBefore) => {
  // Check if we're transitioning from feature card to settings panel
  if (isSettingsPanel && !wasPanelBefore) {
    await checkCameraPermission();
  }
}, { immediate: true });

onUnmounted(() => {
  // Clean up media stream if it exists
  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach(track => track.stop());
  }
});

/** Whether camera access was given before. False where the browser cannot say, as older Firefox cannot. */
async function cameraGranted(): Promise<boolean> {
  try {
    const status = await navigator.permissions.query({ name: "camera" as PermissionName });
    return status.state === "granted";
  } catch {
    return false;
  }
}

async function checkCameraPermission() {
  if (!isCameraSupported.value) {
    cameraError.value = "Your browser does not support camera access.";
    return;
  }

  answeringItself.value = await cameraGranted();
  try {
    // Standard approach for all browsers
    await navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        hasCameraPermission.value = true;
        stream.getTracks().forEach(track => track.stop());
        loadCameraDevices();
      })
      .catch((error) => {
        console.error("Autodarts Tools: Camera permission error:", error);
        hasCameraPermission.value = false;
        cameraError.value = "Camera access was denied. Please allow camera access in your browser settings.";
      });
  } catch (error) {
    console.error("Error checking camera permission:", error);
  } finally {
    answeringItself.value = false;
  }
}

async function requestCameraAccess() {
  if (!isCameraSupported.value) {
    cameraError.value = "Your browser does not support camera access.";
    return;
  }

  try {
    await navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        hasCameraPermission.value = true;
        // Stop the stream as we just needed it for permission
        stream.getTracks().forEach(track => track.stop());
        // Now load available devices
        loadCameraDevices();
        cameraError.value = null;
      })
      .catch((error) => {
        console.error("Camera access denied:", error);
        cameraError.value = "Camera access was denied. Please allow camera access in your browser settings.";
        hasCameraPermission.value = false;
      });
  } catch (error) {
    console.error("Error requesting camera access:", error);
    cameraError.value = "An error occurred while trying to access the camera.";
  }
}

async function loadCameraDevices() {
  isLoadingDevices.value = true;
  cameraError.value = null;

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const allCameraDevices = devices.filter(device => device.kind === "videoinput");

    // Filter out devices that are already in use by testing each one
    const availableDevices: MediaDeviceInfo[] = [];

    for (const device of allCameraDevices) {
      try {
        // Try to access the device briefly to check if it's available
        const testStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: device.deviceId } },
        });

        // If successful, the device is available
        availableDevices.push(device);

        // Immediately stop the test stream
        testStream.getTracks().forEach(track => track.stop());
      } catch (error: any) {
        // Check if the error indicates the device is in use
        if (error?.name === "NotReadableError"
            || error?.name === "TrackStartError"
            || error?.name === "AbortError"
            || error?.message?.includes("Could not start video source")
            || error?.message?.includes("Failed to allocate videosource")
            || error?.message?.includes("Starting videoinput failed")) {
          console.log(`Camera device ${device.label || device.deviceId} is already in use, excluding from list`);
          // Device is in use, don't add to available devices
        } else {
          // Other errors (like permission issues) - still include the device
          // as the user might be able to resolve the issue
          availableDevices.push(device);
        }
      }
    }

    cameraDevices.value = availableDevices;

    // If we have devices and a selected device in config
    if (cameraDevices.value.length > 0) {
      // If we have a saved device ID and it's in the available list
      const savedDeviceId = config.value?.instantReplay?.deviceId;
      if (savedDeviceId && cameraDevices.value.some(d => d.deviceId === savedDeviceId)) {
        updateCameraPreview(savedDeviceId);
      } else {
        // Use the first available device
        const firstDeviceId = cameraDevices.value[0].deviceId;
        if (config.value?.instantReplay) {
          config.value.instantReplay.deviceId = firstDeviceId;
        }
        updateCameraPreview(firstDeviceId);
      }
    } else if (allCameraDevices.length > 0) {
      // All devices are in use
      cameraError.value = "All camera devices are currently in use by other applications. Please close other video applications and try again.";
    }
  } catch (error) {
    console.error("Error loading camera devices:", error);
    cameraError.value = "Failed to load camera devices.";
  } finally {
    isLoadingDevices.value = false;
  }
}

async function updateCameraPreview(deviceId: string) {
  if (!hasCameraPermission.value || !videoPreview.value) return;

  try {
    // Stop any existing stream
    if (mediaStream.value) {
      mediaStream.value.getTracks().forEach(track => track.stop());
    }

    // Start a new stream with the selected device
    const constraints = {
      video: { deviceId: { exact: deviceId } },
    };

    mediaStream.value = await navigator.mediaDevices.getUserMedia(constraints);
    videoPreview.value.srcObject = mediaStream.value;

    // Detect camera FPS
    detectCameraFps();
  } catch (error) {
    console.error("Error updating camera preview:", error);
    cameraError.value = "Failed to access the selected camera.";
  }
}

function detectCameraFps() {
  if (!mediaStream.value) return;

  const videoTrack = mediaStream.value.getVideoTracks()[0];
  if (videoTrack) {
    const settings = videoTrack.getSettings();
    if (settings.frameRate) {
      currentFps.value = settings.frameRate;
      console.log(`Camera FPS: ${settings.frameRate}`);
    } else {
      // Fallback: measure FPS manually
      measureFpsManually();
    }
  }
}

function measureFpsManually() {
  if (!videoPreview.value) return;

  let frameCount = 0;
  const startTime = performance.now();

  const measureFrame = () => {
    frameCount++;
    const currentTime = performance.now();
    const elapsed = currentTime - startTime;

    // Measure for 2 seconds
    if (elapsed >= 2000) {
      const fps = Math.round((frameCount / elapsed) * 1000);
      currentFps.value = fps;
      console.log(`Measured FPS: ${fps}`);
    } else {
      requestAnimationFrame(measureFrame);
    }
  };

  requestAnimationFrame(measureFrame);
}

/** Where a pan slider stands, in words: "Centre", "40% left". */
function panLabel(value: number, negative: string, positive: string): string {
  if (value === 0) return "Centre";
  return `${Math.abs(value)}% ${value < 0 ? negative : positive}`;
}

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.instantReplay.enabled;
  config.value.instantReplay.enabled = !wasEnabled;

  // If we're enabling the feature and don't have camera permission yet, request it
  if (!wasEnabled && !hasCameraPermission.value) {
    await checkCameraPermission();
    await nextTick();
    emit("toggle", "instant-replay");
  } else if (!wasEnabled) {
    // Just open settings if we already have permission
    await nextTick();
    emit("toggle", "instant-replay");
  }
}
</script>
