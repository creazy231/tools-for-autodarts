<template>
  <!--
    The scoreboard Streaming Mode has always drawn, moved here unchanged when the
    second skin arrived: white rows on a black grid, cyan for whatever is live.
    It stays the default, so an existing stream's layout does not move under its
    owner the first time they update.
  -->
  <div class="border-2 border-black bg-gray-800 text-2xl">
    <div
      :class="twMerge(
        'grid grid-cols-[30rem_8rem_8rem]',
        hasSets && 'grid-cols-[35rem_8rem_8rem_8rem]',
      )"
    >
      <div
        v-if="showThrows"
        :class="twMerge(
          'col-span-3 border-b-2 border-black',
          hasSets && 'col-span-4',
        )"
      >
        <div class="grid grid-cols-4 divide-x-2 divide-black text-center text-5xl font-bold">
          <div class="relative flex items-center justify-center p-2 uppercase">
            {{ busted ? "Bust" : visitPoints }}
          </div>
          <div
            v-for="n in 3"
            :key="n"
            :class="twMerge(
              'relative flex items-center justify-center p-2 uppercase',
              'bg-gray-300 text-black',
              visitThrows[n - 1] && 'bg-cyan-600 text-white',
              checkout?.[n - 1] && 'bg-cyan-600',
            )"
          >
            <template v-if="visitThrows[n - 1]">
              {{ visitThrows[n - 1]?.segment.name }}
            </template>
            <template v-else-if="checkout?.[n - 1]">
              <span class="text-4xl font-normal italic text-white/65">{{ checkout[n - 1]?.name }}</span>
            </template>
            <template v-else>
              <div class="absolute inset-0 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" class="-rotate-45" viewBox="0 0 512 512"><path fill="currentColor" d="M134.745 22.098c-4.538-.146-9.08 1.43-14.893 7.243c-5.586 5.586-11.841 21.725-15.248 35.992c-.234.979-.444 1.907-.654 2.836l114.254 105.338c-7.18-28.538-17.555-59.985-29.848-86.75c-11.673-25.418-25.249-46.657-37.514-57.024c-6.132-5.183-11.56-7.488-16.097-7.635M92.528 82.122L82.124 92.526L243.58 267.651l24.072-24.072zm-24.357 21.826c-.929.21-1.857.42-2.836.654c-14.267 3.407-30.406 9.662-35.993 15.248c-5.813 5.813-7.39 10.355-7.244 14.893c.147 4.538 2.452 9.965 7.635 16.098c10.367 12.265 31.608 25.842 57.025 37.515c26.766 12.293 58.211 22.669 86.749 29.848L68.17 103.948zM280.899 255.79l-25.107 25.107l73.265 79.469l31.31-31.31zm92.715 85.476l-32.346 32.344l2.07 2.246c.061.058 4.419 4.224 10.585 6.28c6.208 2.069 12.71 2.88 21.902-6.313c9.192-9.192 8.38-15.694 6.31-21.902c-2.057-6.174-6.235-10.54-6.283-10.59zm20.172 41.059a46.23 46.23 0 0 1-5.233 6.226a46.241 46.241 0 0 1-6.226 5.235L489.91 489.91z" /></svg>
              </div>
            </template>
          </div>
        </div>
      </div>
      <div class="px-4 py-2">
        {{ title.join(" - ") }}
      </div>
      <div v-if="hasSets" class="px-4 py-2 text-center">
        Sets
      </div>
      <div class="px-4 py-2 text-center">
        Legs
      </div>
      <div />
      <template v-for="(row, index) in rows" :key="row.player.id || row.player.name">
        <div
          :class="twMerge(
            'flex w-full items-center justify-between border-y-2 border-r-2 border-black bg-white px-4 py-2 text-black',
            index === 0 ? 'border-t-2' : 'border-t-0',
          )"
        >
          <div class="truncate py-2 font-bold uppercase">
            {{ row.player.name }}
          </div>
          <div v-if="showAvg && (row.stats?.legStats?.average || row.stats?.setStats?.average || row.stats?.matchStats?.average)" class="whitespace-nowrap text-lg font-bold text-gray-500">
            ∅
            <span v-if="row.stats?.legStats?.average?.toString()">{{ row.stats.legStats.average.toFixed(1) }} / </span>
            <span v-if="row.stats?.setStats?.average?.toString()">{{ row.stats.setStats.average.toFixed(1) }} / </span>
            <span v-if="row.stats?.matchStats?.average?.toString()">{{ row.stats.matchStats.average.toFixed(1) }}</span>
          </div>
        </div>
        <div
          v-if="hasSets"
          :class="twMerge(
            'flex items-center justify-center border-y-2 border-r-2 border-black px-4 py-2 text-5xl font-bold',
            index === 0 ? 'border-t-2' : 'border-t-0',
          )"
        >
          {{ row.score?.sets || 0 }}
        </div>
        <div
          :class="twMerge(
            'flex items-center justify-center border-y-2 border-r-2 border-black px-4 py-2 text-5xl font-bold',
            index === 0 ? 'border-t-2' : 'border-t-0',
          )"
        >
          {{ row.score?.legs || 0 }}
        </div>
        <div
          :class="twMerge(
            'relative flex items-center justify-center border-y-2 border-black px-4 py-2 text-5xl font-bold',
            index === 0 ? 'border-t-2' : 'border-t-0',
          )"
        >
          {{ row.gameScore }}
          <div v-if="row.throwing" class="absolute -inset-y-0.5 -right-20 flex w-20 items-center justify-center border-2 border-black bg-cyan-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 512 512"><path fill="currentColor" d="M134.745 22.098c-4.538-.146-9.08 1.43-14.893 7.243c-5.586 5.586-11.841 21.725-15.248 35.992c-.234.979-.444 1.907-.654 2.836l114.254 105.338c-7.18-28.538-17.555-59.985-29.848-86.75c-11.673-25.418-25.249-46.657-37.514-57.024c-6.132-5.183-11.56-7.488-16.097-7.635M92.528 82.122L82.124 92.526L243.58 267.651l24.072-24.072zm-24.357 21.826c-.929.21-1.857.42-2.836.654c-14.267 3.407-30.406 9.662-35.993 15.248c-5.813 5.813-7.39 10.355-7.244 14.893c.147 4.538 2.452 9.965 7.635 16.098c10.367 12.265 31.608 25.842 57.025 37.515c26.766 12.293 58.211 22.669 86.749 29.848L68.17 103.948zM280.899 255.79l-25.107 25.107l73.265 79.469l31.31-31.31zm92.715 85.476l-32.346 32.344l2.07 2.246c.061.058 4.419 4.224 10.585 6.28c6.208 2.069 12.71 2.88 21.902-6.313c9.192-9.192 8.38-15.694 6.31-21.902c-2.057-6.174-6.235-10.54-6.283-10.59zm20.172 41.059a46.23 46.23 0 0 1-5.233 6.226a46.241 46.241 0 0 1-6.226 5.235L489.91 489.91z" /></svg>
          </div>
        </div>
      </template>
      <div
        :class="twMerge(
          'col-span-3 px-4 py-2 text-lg',
          hasSets && 'col-span-4',
        )"
      >
        <div class="grid grid-cols-[auto_2rem_2rem]">
          <div>{{ footer }}</div>
          <div @click="emit('settings')" title="Streaming Mode settings" class="flex cursor-pointer items-center justify-end opacity-20 hover:opacity-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M12 20H4q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h16q.825 0 1.413.588T22 6v5h-2V6H4v12h8zm-2.5-3.5v-9l7 4.5zm8.35 6.5l-.3-1.5q-.3-.125-.562-.262t-.538-.338l-1.45.45l-1-1.7l1.15-1q-.05-.35-.05-.65t.05-.65l-1.15-1l1-1.7l1.45.45q.275-.2.538-.337t.562-.263l.3-1.5h2l.3 1.5q.3.125.563.275t.537.375l1.45-.5l1 1.75l-1.15 1q.05.3.05.625t-.05.625l1.15 1l-1 1.7l-1.45-.45q-.275.2-.537.338t-.563.262l-.3 1.5zm1-3q.825 0 1.413-.587T20.85 18q0-.825-.587-1.412T18.85 16q-.825 0-1.412.588T16.85 18q0 .825.588 1.413T18.85 20" /></svg>
          </div>
          <!--
            The one control on the overlay that is always in the same place.
            The header button is underneath the overlay while it is up, and the
            backdrop is a large target to have to guess at.
          -->
          <div @click="emit('exit')" title="Leave Streaming Mode" class="flex cursor-pointer items-center justify-end opacity-20 hover:opacity-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z" /></svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { twMerge } from "tailwind-merge";

import type { IThrow } from "@/utils/websocket-helpers";
import type { ICheckoutRoute, IStreamingRow } from "./streaming-board";

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
</script>
