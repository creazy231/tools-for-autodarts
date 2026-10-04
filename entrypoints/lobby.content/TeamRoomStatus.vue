<template>
  <div class="adt-room">
    <button
      @click="open = !open"
      :aria-expanded="open"
      :class="`is-${status.kind}`"
      class="adt-room-chip"
      type="button"
    >
      {{ chipText }}
    </button>
    <div @keydown.esc="open = false" v-if="open" :aria-label="t('teams.online.card.title')" class="adt-room-card" role="dialog">
      <div class="adt-room-head">
        <b>{{ t("teams.online.card.title") }}</b>
        <button @click="open = false" :aria-label="t('teams.online.card.close')" class="adt-room-x" type="button">
          <span aria-hidden="true" class="icon-[material-symbols--close-rounded]" />
        </button>
      </div>
      <div class="adt-room-line">
        <span>{{ t("teams.online.card.server") }}</span><span :class="serverClass">{{ serverText }}</span>
      </div>
      <div v-for="account in accounts" :key="account.userId" class="adt-room-line">
        <span>{{ account.you ? t("teams.online.card.you", { name: account.name }) : account.name }}</span>
        <span :class="account.connected ? 'is-ok' : 'is-warn'">
          {{ account.connected ? t("teams.online.card.connected") : t("teams.online.card.notConnected") }}<template v-if="account.teams.length"> · {{ account.teams.join(", ") }}</template>
        </span>
      </div>
      <div class="adt-room-line">
        <span>{{ t("teams.online.card.shared") }}</span><span>{{ t("teams.online.card.sharedValue") }}</span>
      </div>
      <button @click="view.retry()" class="adt-room-retry" type="button">
        {{ t("teams.online.card.retry") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StatusView } from "./teams";
import type { MessageKey } from "@/utils/i18n";
import type { StatusKind } from "@/utils/team-room";

import { list } from "@/utils/i18n";
import { normalizeName } from "@/utils/teams";
import { otherAccounts, roomStatus } from "@/utils/team-room";

const props = defineProps<{ view: StatusView }>();

/** How often the chip looks again: its "isn't connected" turns up after a while, not on an event. */
const TICK_MS = 2000;
const CHIP: Record<Exclude<StatusKind, "synced" | "missing">, MessageKey> = {
  connecting: "teams.online.status.connecting",
  ready: "teams.online.status.ready",
  offline: "teams.online.status.offline",
  outdated: "teams.online.status.outdated",
};

const { t } = useI18n();

const now = ref(Date.now());
const open = ref(false);

const status = computed(() => roomStatus({ ...props.view, now: now.value }));
const chipText = computed(() => {
  const { kind, names } = status.value;
  if (kind === "synced") return t("teams.online.status.synced", { names: list(names) });
  if (kind === "missing") return t("teams.online.status.missing", { names: list(names), count: names.length });
  return t(CHIP[kind]);
});
const serverText = computed(() => {
  const { connection, rtt } = props.view;
  if (connection === "connected") return rtt === undefined ? t("teams.online.card.onlineNoRtt") : t("teams.online.card.online", { ms: String(rtt) });
  if (connection === "outdated") return t("teams.online.card.outdated");
  if (connection === "offline") return t("teams.online.card.offline");
  return t("teams.online.card.connecting");
});
const serverClass = computed(() => (props.view.connection === "connected" ? "is-ok" : props.view.connection === "connecting" ? "" : "is-warn"));
/** This account first, then everyone else with seats here: whether their Tools is in the room, and their teams. */
const accounts = computed(() => {
  const { room, me, players, myTeams, connection } = props.view;
  const peers = new Set((room?.peers ?? []).map(peer => peer.userId));
  const teamsOf = (userId: string) => (room?.teams ?? []).filter(team => team.owner === userId).map(team => normalizeName(team.name));
  const self = (room?.peers ?? []).find(peer => peer.userId === me);
  const out = me ? [ { userId: me, name: normalizeName(self?.name ?? ""), you: true, connected: connection === "connected" && peers.has(me), teams: myTeams } ] : [];
  for (const account of otherAccounts(players, me)) out.push({ userId: account.userId, name: account.name, you: false, connected: peers.has(account.userId), teams: teamsOf(account.userId) });
  return out;
});

let timer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now();
  }, TICK_MS);
});

onBeforeUnmount(() => clearInterval(timer));
</script>

<style scoped>
.adt-room { position: relative; display: inline-flex; font-family: var(--ad-font-body, Manrope, system-ui, sans-serif); }
.adt-room-chip {
  display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px; border: 0; border-radius: 999px;
  font-size: 11px; font-weight: 700; line-height: 1; white-space: nowrap; cursor: pointer;
  color: #a0a6b8; background: rgb(160 166 184 / 12%);
}
.adt-room-chip::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.adt-room-chip.is-connecting::before { animation: adt-room-pulse 1.2s ease-in-out infinite; }
.adt-room-chip.is-ready, .adt-room-chip.is-synced { color: #49da9e; background: rgb(73 218 158 / 12%); }
.adt-room-chip.is-missing { color: #f29727; background: rgb(242 151 39 / 12%); }
.adt-room-chip.is-offline, .adt-room-chip.is-outdated { color: #ff6b81; background: rgb(226 78 103 / 14%); }
.adt-room-card {
  position: absolute; top: calc(100% + 8px); left: 0; z-index: 60; width: 300px; box-sizing: border-box;
  padding: 12px 14px; border-radius: 12px; background: #0b0b23; border: 1px solid rgb(255 255 255 / 10%);
  box-shadow: 0 12px 30px rgb(0 0 0 / 45%); color: #f7f8fa; font-size: 11.5px;
}
.adt-room-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
.adt-room-x { border: 0; background: none; color: #a0a6b8; cursor: pointer; display: inline-flex; padding: 2px; }
.adt-room-line { display: flex; justify-content: space-between; gap: 10px; padding: 5px 0; border-bottom: 1px solid rgb(255 255 255 / 6%); }
.adt-room-line > span:first-child { color: #a0a6b8; }
.adt-room-line > span:last-child { text-align: right; }
.is-ok { color: #49da9e; font-weight: 700; }
.is-warn { color: #f29727; font-weight: 700; }
.adt-room-retry { margin-top: 10px; border: 0; border-radius: 7px; padding: 6px 12px; font-size: 11px; font-weight: 800; color: #fff; background: #0b55df; cursor: pointer; }
@keyframes adt-room-pulse { 50% { opacity: .25; } }
@media (prefers-reduced-motion: reduce) { .adt-room-chip.is-connecting::before { animation: none; } }
</style>
