<template>
  <!--
    The Autodarts design system skin.
    Derived from the system's foundations rather than copied off a screen — its
    own notes record that the in-match scoreboard was never captured, so there
    is nothing to copy. What the system does settle is how it has to look:

      * Depth comes from fill, never a border and never a shadow. Three levels
        only — chrome, card, chip — so the black grid of the classic skin goes.
      * One loud blue, for whatever is active. Here that is the player at the
        oche and the visit total; the darts themselves stay neutral so the blue
        keeps meaning something.
      * Display face, uppercase, for names and the title. Every number in the
        text face at extrabold — the readme flags that as the rule people break
        when they guess at this brand, so the scores are Manrope, not Bebas.
      * Selected is never a border alone: the throwing player gets the navy fill
        the app uses for an active row, and a blue rail beside it.

    Type sizes are literal rather than the system's display scale. That scale is
    fitted to a 1920px app read at desk distance; this is read across a room
    through a stream, and the user scales it again on top. Everything else —
    faces, weights, colours, radii, timings — is a token.
  -->
  <div
    class="flex flex-col gap-2 p-4"
    :style="{
      width: `${hasSets ? metrics.widthWithSets : metrics.width}rem`,
      backgroundColor: 'var(--ad-surface-chrome)',
      borderRadius: 'var(--ad-radius-lg)',
      fontFamily: 'var(--ad-font-body)',
      color: 'var(--ad-text-primary)',
      fontVariantNumeric: 'tabular-nums',
    }"
  >
    <!--
      Title, sharing its line with the column labels as the classic skin does.
      The padding and gap here have to be the rows' own, or the labels do not sit
      over the columns they name.
    -->
    <div class="flex items-baseline gap-6 pl-3 pr-5">
      <div :style="{ width: RAIL }" />
      <div
        class="min-w-0 flex-1 truncate"
        :style="{
          fontFamily: 'var(--ad-font-display)',
          fontSize: '26px',
          letterSpacing: '.02em',
          textTransform: 'uppercase',
          color: 'var(--ad-text-muted)',
        }"
      >
        {{ title.join(" • ") }}
      </div>
      <div v-if="hasSets" class="text-center" :style="{ ...LABEL, width: CELL.count }">
        Sets
      </div>
      <div class="text-center" :style="{ ...LABEL, width: CELL.count }">
        Legs
      </div>
      <div :style="{ width: CELL.score }" />
    </div>

    <!--
      The visit: its total, then the three darts. Empty slots are drawn rather
      than left blank so the strip does not change width dart by dart.
    -->
    <div
      v-if="showThrows"
      class="flex items-stretch gap-3 p-3"
      :style="{ backgroundColor: 'var(--ad-surface-card)', borderRadius: 'var(--ad-radius-lg)' }"
    >
      <div
        class="flex items-center justify-center px-6 py-3"
        :style="{
          minWidth: '7rem',
          borderRadius: 'var(--ad-radius-md)',
          backgroundColor: busted ? 'var(--ad-danger)' : 'var(--ad-action-primary)',
          color: 'var(--ad-white)',
          transition: 'var(--ad-transition-interactive)',
        }"
      >
        <!-- A bust is a status, and this system says a status is one word in a badge. -->
        <span
          v-if="busted"
          :style="{ fontSize: '26px', fontWeight: 'var(--ad-weight-extrabold)', letterSpacing: 'var(--ad-tracking-caps)' }"
        >BUST</span>
        <span v-else :style="{ fontSize: '34px', fontWeight: 'var(--ad-weight-extrabold)', letterSpacing: '-.01em' }">{{ visitPoints }}</span>
      </div>
      <div
        v-for="n in 3"
        :key="n"
        class="flex flex-1 items-center justify-center px-3 py-3"
        :style="{
          borderRadius: 'var(--ad-radius-md)',
          backgroundColor: visitThrows[n - 1] ? 'var(--ad-surface-chip-strong)' : 'var(--ad-surface-sunken)',
          transition: 'var(--ad-transition-interactive)',
        }"
      >
        <span
          v-if="visitThrows[n - 1]"
          :style="{ fontSize: '32px', fontWeight: 'var(--ad-weight-extrabold)', letterSpacing: '-.01em' }"
        >{{ visitThrows[n - 1]?.segment.name }}</span>
        <span
          v-else-if="checkout?.[n - 1]"
          :style="{ fontSize: '26px', fontWeight: 'var(--ad-weight-medium)', fontStyle: 'italic', color: 'var(--ad-text-muted)' }"
        >{{ checkout[n - 1]?.name }}</span>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="30" height="30" class="-rotate-45" viewBox="0 0 512 512" :style="{ color: 'var(--ad-text-disabled)', opacity: '.45' }"><path fill="currentColor" d="M134.745 22.098c-4.538-.146-9.08 1.43-14.893 7.243c-5.586 5.586-11.841 21.725-15.248 35.992c-.234.979-.444 1.907-.654 2.836l114.254 105.338c-7.18-28.538-17.555-59.985-29.848-86.75c-11.673-25.418-25.249-46.657-37.514-57.024c-6.132-5.183-11.56-7.488-16.097-7.635M92.528 82.122L82.124 92.526L243.58 267.651l24.072-24.072zm-24.357 21.826c-.929.21-1.857.42-2.836.654c-14.267 3.407-30.406 9.662-35.993 15.248c-5.813 5.813-7.39 10.355-7.244 14.893c.147 4.538 2.452 9.965 7.635 16.098c10.367 12.265 31.608 25.842 57.025 37.515c26.766 12.293 58.211 22.669 86.749 29.848L68.17 103.948zM280.899 255.79l-25.107 25.107l73.265 79.469l31.31-31.31zm92.715 85.476l-32.346 32.344l2.07 2.246c.061.058 4.419 4.224 10.585 6.28c6.208 2.069 12.71 2.88 21.902-6.313c9.192-9.192 8.38-15.694 6.31-21.902c-2.057-6.174-6.235-10.54-6.283-10.59zm20.172 41.059a46.23 46.23 0 0 1-5.233 6.226a46.241 46.241 0 0 1-6.226 5.235L489.91 489.91z" /></svg>
      </div>
    </div>

    <!--
      One card per player. `rows` is already in seating order — see the overlay's
      own `rows` for why that is not the order the site sends.
    -->
    <div
      v-for="row in rows"
      :key="row.player.id || row.player.name"
      class="flex items-center gap-6 py-2 pl-3 pr-5"
      :style="{
        borderRadius: 'var(--ad-radius-md)',
        backgroundColor: row.throwing ? 'var(--ad-navy-500)' : 'var(--ad-surface-card)',
        transition: 'var(--ad-transition-interactive)',
      }"
    >
      <div
        class="self-stretch"
        :style="{
          width: RAIL,
          borderRadius: 'var(--ad-radius-full)',
          backgroundColor: row.throwing ? 'var(--ad-action-primary)' : 'transparent',
          transition: 'var(--ad-transition-interactive)',
        }"
      />
      <div class="flex min-w-0 flex-1 items-baseline justify-between gap-4">
        <div
          class="truncate"
          :style="{
            fontFamily: 'var(--ad-font-display)',
            fontSize: '42px',
            lineHeight: 'var(--ad-leading-tight)',
            letterSpacing: '.01em',
            textTransform: 'uppercase',
            color: row.throwing ? 'var(--ad-text-primary)' : 'var(--ad-text-secondary)',
          }"
        >
          {{ row.player.name }}
        </div>
        <div
          v-if="showAvg && average(row)"
          class="flex items-baseline gap-1.5 whitespace-nowrap"
          :style="{ color: 'var(--ad-text-muted)' }"
        >
          <span :style="{ fontSize: '17px', fontWeight: 'var(--ad-weight-bold)', letterSpacing: '-.01em' }">{{ average(row) }}</span>
          <span :style="LABEL">Avg</span>
        </div>
      </div>
      <div v-if="hasSets" class="text-center" :style="{ ...COUNT, width: CELL.count, color: row.throwing ? 'var(--ad-text-primary)' : 'var(--ad-text-secondary)' }">
        {{ row.score?.sets || 0 }}
      </div>
      <div class="text-center" :style="{ ...COUNT, width: CELL.count, color: row.throwing ? 'var(--ad-text-primary)' : 'var(--ad-text-secondary)' }">
        {{ row.score?.legs || 0 }}
      </div>
      <div
        class="text-right"
        :style="{
          width: CELL.score,
          fontSize: '46px',
          fontWeight: 'var(--ad-weight-extrabold)',
          letterSpacing: '-.01em',
          lineHeight: '1',
          color: row.throwing ? 'var(--ad-white)' : 'var(--ad-text-primary)',
        }"
      >
        {{ row.gameScore }}
      </div>
    </div>

    <div class="flex items-center gap-2 px-1 pt-1">
      <div
        class="min-w-0 flex-1 truncate"
        :style="{ fontSize: '13px', fontWeight: 'var(--ad-weight-medium)', color: 'var(--ad-text-muted)' }"
      >
        {{ footer }}
      </div>
      <button
        @click="emit('settings')"
        type="button"
        title="Streaming Mode settings"
        class="flex cursor-pointer items-center justify-center"
        :style="{ color: 'var(--ad-text-disabled)', transition: 'var(--ad-transition-interactive)' }"
        @mouseenter="hover($event, true)"
        @mouseleave="hover($event, false)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M12 20H4q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h16q.825 0 1.413.588T22 6v5h-2V6H4v12h8zm-2.5-3.5v-9l7 4.5zm8.35 6.5l-.3-1.5q-.3-.125-.562-.262t-.538-.338l-1.45.45l-1-1.7l1.15-1q-.05-.35-.05-.65t.05-.65l-1.15-1l1-1.7l1.45.45q.275-.2.538-.337t.562-.263l.3-1.5h2l.3 1.5q.3.125.563.275t.537.375l1.45-.5l1 1.75l-1.15 1q.05.3.05.625t-.05.625l1.15 1l-1 1.7l-1.45-.45q-.275.2-.537.338t-.563.262l-.3 1.5z" /></svg>
      </button>
      <!--
        The one control on the overlay that is always in the same place. The
        header button is underneath the overlay while it is up, and the backdrop
        is a large target to have to guess at.
      -->
      <button
        @click="emit('exit')"
        type="button"
        title="Leave Streaming Mode"
        class="flex cursor-pointer items-center justify-center"
        :style="{ color: 'var(--ad-text-disabled)', transition: 'var(--ad-transition-interactive)' }"
        @mouseenter="hover($event, true)"
        @mouseleave="hover($event, false)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z" /></svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { IThrow } from "@/utils/websocket-helpers";
import type { ICheckoutRoute, IStreamingRow } from "./streaming-board";

import { SCOREBOARD_METRICS } from "./streaming-board";

/** The blue bar beside the player at the oche, and the header's spacer for it. */
const RAIL = "4px";

/** Shared by the column labels and the rows, so the two line up. */
const CELL = { count: "5rem", score: "9rem" };

const LABEL = {
  fontSize: "12px",
  fontWeight: "var(--ad-weight-semibold)",
  letterSpacing: "var(--ad-tracking-caps)",
  textTransform: "uppercase",
  color: "var(--ad-text-muted)",
} as const;

const COUNT = {
  fontSize: "30px",
  fontWeight: "var(--ad-weight-extrabold)",
  letterSpacing: "-.01em",
} as const;

const metrics = SCOREBOARD_METRICS.v2;

defineProps<{
  rows: IStreamingRow[];
  title: string[];
  footer: string;
  visitThrows: IThrow[];
  visitPoints: number;
  busted: boolean;
  checkout: ICheckoutRoute | null;
  showAvg: boolean;
  showThrows: boolean;
  hasSets: boolean;
}>();

const emit = defineEmits<{ settings: []; exit: [] }>();

/**
 * The one average worth the space.
 *
 * The classic skin prints leg / set / match side by side. This system's line on
 * statistics is that a figure carries its own message and no sentence explains
 * it, so this shows the narrowest one the match has reached — the leg if there
 * is one, else the set, else the match.
 */
function average(row: IStreamingRow): string {
  const stats = row.stats;
  // Truthiness, not `??`: an average of 0 is what every player has before the
  // first dart of the match, and "0.0 Avg" against three names says nothing.
  const value = stats?.legStats?.average || stats?.setStats?.average || stats?.matchStats?.average;
  return typeof value === "number" && value > 0 ? value.toFixed(1) : "";
}

/** Hover picks up the white wash the system uses for ghost items. */
function hover(event: MouseEvent, on: boolean): void {
  (event.currentTarget as HTMLElement).style.color = on
    ? "var(--ad-text-primary)"
    : "var(--ad-text-disabled)";
}
</script>
