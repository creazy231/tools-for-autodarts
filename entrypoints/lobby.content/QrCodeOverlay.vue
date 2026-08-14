<template>
  <!--
    Pinned from inside the shadow root, not by styling the host. WXT resets the
    host with `:host { all: initial !important }`, and an important declaration
    from a shadow tree beats even an important inline style on the host, so
    positioning it from the outside does nothing at all.

    The 60px clears the site's own QR button, which sits in the same corner.
  -->
  <div class="fixed right-4 top-[60px] z-10 w-max rounded-[var(--ad-radius-lg)] bg-[var(--ad-surface-card)] p-3 shadow-[var(--ad-shadow-raised)]">
    <!-- qr-code-styling appends its canvas here. -->
    <div ref="code" class="overflow-hidden rounded-[var(--ad-radius-md)] leading-none" />
    <AppButton
      @click="props.dismiss"
      class="mt-2"
      title="Hide the QR code"
      size="sm"
      type="ghost"
    >
      <span class="icon-[pixelarticons--close] text-lg" />
    </AppButton>
  </div>
</template>

<script setup lang="ts">
import QRCodeStyling from "qr-code-styling";
import { onMounted, ref } from "vue";

import AppButton from "@/components/AppButton.vue";
import { QR_CODE_OPTIONS } from "@/utils/qr-code-options";

const props = defineProps<{
  link: string;
  dismiss: () => void;
}>();

/** Small enough to sit in a corner, large enough for a phone across the room. */
const SIZE = 160;

const code = ref<HTMLElement | null>(null);

onMounted(() => {
  if (!code.value) return;

  // Spread rather than assign: the options object is shared with the
  // tournament QR code, and v1 wrote the link straight into it.
  const qr = new QRCodeStyling({
    ...QR_CODE_OPTIONS,
    width: SIZE,
    height: SIZE,
    data: props.link,
  } as any);

  qr.append(code.value);
});
</script>
