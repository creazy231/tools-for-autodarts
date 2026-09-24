<template>
  <!--
    The match screen in miniature, so each colour can be judged where it goes.

    Laid out from the real screen at 1600×900: every position is that screen's,
    as a share of the frame, and every size is in container units of the
    frame's width (the real size in px, over 16), so the whole of it scales as
    one picture. The card copies the site's own markup: avatar and name tag,
    score and legs, averages, darts thrown.
  -->
  <div
    :style="page"
    aria-hidden="true"
    class="relative aspect-video w-full select-none overflow-hidden rounded-[var(--ad-radius-lg)] ring-1 ring-inset ring-white/10 [container-type:inline-size]"
  >
    <!-- the throw bar: three darts, the visit's total, and the bot button -->
    <div
      :style="{ backgroundColor: colors.cards || SITE_CARDS }"
      class="absolute left-[30%] top-[3.11%] flex h-[8%] w-2/5 overflow-hidden rounded-[1.125cqw]"
    >
      <div class="flex flex-1 items-center justify-evenly border-r border-[#292c33]">
        <span
          v-for="(dart, i) in THROWS"
          :key="i"
          :style="number(SITE_TEXT)"
          class="text-[length:2.25cqw] font-bold leading-none"
        >{{ dart }}</span>
      </div>
      <span
        :style="number(SITE_TEXT)"
        class="flex w-[15.6%] items-center justify-center text-[length:2.5cqw] font-bold leading-none"
      >{{ TOTAL }}</span>
      <span class="flex w-[10%] items-center justify-center bg-[#292c33] text-white/40">
        <span class="icon-[material-symbols--smart-toy-outline] size-[1.75cqw]" />
      </span>
    </div>

    <img
      :src="board"
      alt=""
      class="absolute left-[30%] top-[15.11%] h-[71.11%] w-2/5 rounded-full"
      draggable="false"
    >

    <div
      v-for="player in PLAYERS"
      :key="player.name"
      :style="face(player.active)"
      class="absolute top-[14.68%] flex w-1/4 flex-col items-center gap-[0.5cqw] overflow-hidden rounded-[1.125cqw] px-[2cqw] py-[1.5cqw]"
      :class="player.active ? 'left-[2%]' : 'left-[73%]'"
    >
      <!-- the name tag: who started the leg, the avatar, and the name on a tag with a slanted end -->
      <div class="flex h-[2.875cqw] items-center gap-[0.375cqw]">
        <span
          class="size-[0.5cqw] rounded-full bg-white"
          :class="{ invisible: !player.active }"
        />
        <span class="relative z-[1] flex size-[2.875cqw] items-center justify-center rounded-full border-[0.125cqw] border-[#01040b] bg-[image:linear-gradient(to_bottom_right,#001849,#374c98)] text-white/80">
          <span
            :class="player.avatar"
            class="size-[1.75cqw]"
          />
        </span>
        <span class="ml-[-0.125cqw] flex h-[2cqw] items-center bg-[#01040b] pl-[1cqw]">
          <span
            :style="{ color: tint('#cacfd9') }"
            class="font-[family-name:var(--ad-font-display)] text-[length:1.125cqw] uppercase leading-none"
          >{{ player.name }}</span>
        </span>
        <svg
          class="-ml-px h-[2cqw] w-auto overflow-visible text-[#01040b]"
          fill="none"
          viewBox="0 0 15 26"
        >
          <path d="M-2 0H10C11.7 0 13.6 2.4 13 4L6 22C5.4 23.6 4.7 26 3 26H-2Z" fill="currentColor" />
        </svg>
      </div>

      <!-- the score, and the legs won in their badge -->
      <div class="flex items-center gap-[0.375cqw]">
        <span
          :style="number(player.active ? SITE_TEXT : '#b8bcc5')"
          class="h-[6.25cqw] overflow-hidden text-[length:7.5cqw] font-bold leading-none"
        >{{ player.score }}</span>
        <span
          :style="number('#f5f5f5')"
          class="flex size-[2cqw] items-center justify-center rounded-[0.375cqw] bg-[#01040b] text-[length:1.5cqw] font-medium leading-none"
        >{{ player.legs }}</span>
      </div>

      <!-- the averages -->
      <div
        :style="{ color: tint('#ffffff') }"
        class="flex items-center gap-[0.5cqw] font-[family-name:var(--ad-font-body)] text-[length:1.375cqw] font-medium leading-none"
      >
        <span>Leg <b class="font-bold">{{ player.leg }}</b></span>
        <span class="text-[0.9em]">/</span>
        <span>Match <b class="font-bold">{{ player.match }}</b></span>
      </div>

      <!-- darts thrown -->
      <div
        :style="{ color: tint(SITE_TEXT) }"
        class="flex items-center gap-[0.375cqw] font-[family-name:var(--ad-font-body)] text-[length:1.375cqw] font-bold leading-none"
      >
        <svg
          class="w-[2cqw] rotate-45"
          fill="none"
          viewBox="0 0 67 16"
        >
          <path :d="DART" fill="currentColor" />
        </svg>
        {{ player.darts }}
      </div>
    </div>

    <!-- the bottom bar: the input method, undo and Next -->
    <div
      :style="{ backgroundColor: colors.actionBar || SITE_ACTION_BAR }"
      class="absolute left-[31.5%] top-[88.89%] flex h-[7.56%] w-[37%] items-center gap-[0.5cqw] rounded-[1.125cqw] px-[1.625cqw]"
    >
      <span class="size-[2.5cqw] rounded-[0.75cqw] bg-[#0b55df]" />
      <span class="flex-1" />
      <span class="h-[2.5cqw] w-[3.375cqw] rounded-[0.75cqw] border-[0.125cqw] border-[#0b55df]" />
      <span class="flex h-[2.5cqw] w-[4cqw] items-center justify-center rounded-[0.75cqw] bg-[#0b55df] font-[family-name:var(--ad-font-body)] text-[length:1cqw] font-bold leading-none text-white">Next</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ColorsConfig } from "@/utils/colors";

import { SITE_ACTION_BAR, SITE_CARDS, SITE_TEXT, gradient, pageLayers } from "@/utils/colors";

const props = defineProps<{
  colors: ColorsConfig;
  /** The board picture to draw in the middle. */
  board: string;
  /** autodarts' page texture, from utils/page-background.ts; none draws the gradient alone. */
  texture?: string;
}>();

/** The site's number face, which it ships and the settings page can use. */
const NUMBER_FACE = "\"League Spartan Variable\", var(--ad-font-body)";
/** The dart autodarts draws beside the count of darts thrown. */
const DART = "M3.59665 0H11.1107L11.1303 0.0173403L18.9427 7.1111L24.8531 7.10007L30.8041 7.1111C30.9371 7.02282 31.7677 6.48054 32.213 6.48054H53.6039C53.8994 6.48054 54.2243 6.53729 54.5703 6.64922C54.8448 6.7375 55.1347 6.86203 55.4288 7.01809C55.8714 7.2514 56.1879 7.48155 56.2664 7.53988C56.5521 7.53988 59.6039 7.52412 61.9639 7.52412C63.412 7.52412 64.321 7.52884 64.6656 7.53988C65.4709 7.5651 66.5045 7.852 66.6193 7.88511H66.6221L66.6053 7.96078L66.6221 8.03959H66.6193C66.5045 8.0727 65.4709 8.35803 64.6656 8.38482C64.3224 8.39586 63.4134 8.40059 61.9639 8.40059C59.6039 8.40059 56.5521 8.3864 56.2664 8.38482C56.1879 8.44315 55.8714 8.6733 55.4288 8.90661C54.9638 9.15095 54.2705 9.44416 53.6039 9.44416H32.213C31.7663 9.44416 30.9371 8.90188 30.8041 8.8136L24.8531 8.82464L18.9427 8.8136L11.1303 15.9074L11.1107 15.9247H3.59665L3.57705 15.8821L0.0168068 7.99703L0 7.96078L0.0168068 7.92452L3.57845 0.0425626L3.59806 0H3.59665Z";
/** A visit under way: the player on the left threw these, the one on the right waits. */
const THROWS = [ "T20", "S20", "T5" ];
const TOTAL = 95;
const PLAYERS = [
  { name: "You", avatar: "icon-[material-symbols--person]", score: 406, legs: 1, leg: "95.0", match: "71.4", darts: 3, active: true },
  { name: "Bot Level 3", avatar: "icon-[material-symbols--smart-toy-outline]", score: 441, legs: 0, leg: "60.0", match: "64.2", darts: 3, active: false },
];

const page = computed(() => ({
  backgroundColor: props.colors.page.from,
  backgroundImage: pageLayers(props.colors.page, props.texture),
  // the site's own placement of the texture: bottom left, as tall as the page
  backgroundPosition: "0 100%",
  backgroundRepeat: "no-repeat",
  backgroundSize: "contain",
}));

/** A picked text colour replaces all of the card's, as it does on the match screen. */
function tint(site: string): string {
  return props.colors.text || site;
}

function number(site: string) {
  return { color: tint(site), fontFamily: NUMBER_FACE };
}

function face(active: boolean) {
  return active
    ? { backgroundImage: gradient(props.colors.card) }
    : { backgroundColor: props.colors.cards || SITE_CARDS };
}
</script>
