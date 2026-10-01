<template>
  <!-- Built as the site's ResponsiveDrawer: a centred modal on a scrim from 640px up, a bottom sheet below. -->
  <div @keydown.esc.stop="state.close()" class="adt-team-drawer" :style="{ zIndex: LAYERS.teamsDrawer }">
    <div @click="state.close()" class="fixed inset-0 bg-[#01040b]/80" aria-hidden="true" />
    <div
      @keydown.tab="trapFocus"
      ref="panel"
      :aria-labelledby="titleId"
      aria-modal="true"
      class="fixed inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl bg-[#0a0a23] text-sm text-white shadow-[var(--ad-shadow-overlay)] ring-1 ring-white/10 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-2rem)] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl"
      role="dialog"
      tabindex="-1"
    >
      <div class="mx-auto mb-1 mt-3 h-1.5 w-12 shrink-0 rounded-full bg-white/30 sm:hidden" aria-hidden="true" />
      <button @click="state.close()" :aria-label="t('common.close')" class="absolute right-4 top-4 grid size-8 place-items-center rounded-lg text-[var(--ad-text-primary)] hover:bg-white/10" type="button">
        <span class="icon-[material-symbols--close-rounded] size-5" />
      </button>

      <header class="px-6 pb-1 pt-5">
        <h2 :id="titleId" class="text-lg font-bold text-white">
          {{ state.editing ? t("teams.drawer.editTeam") : t("teams.lobby.addTeam") }}
        </h2>
        <p class="mt-0.5 text-[13px] text-[var(--ad-text-muted)]">
          {{ format === "own" ? ownLine : t("teams.drawer.sharedLine") }}
        </p>
        <div class="mt-3 inline-flex gap-1 rounded-full bg-[#16181c] p-1 ring-1 ring-inset ring-white/10" role="tablist">
          <button
            @click="format = option.id"
            v-for="option in formats"
            :key="option.id"
            :aria-selected="format === option.id"
            :disabled="option.disabled"
            class="adt-team-tab"
            role="tab"
            type="button"
          >
            {{ option.label }}
          </button>
        </div>
        <p v-if="formatNote" class="mt-2 text-xs text-[var(--ad-text-muted)]">
          {{ formatNote }}
        </p>
      </header>

      <div class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pb-6 pt-3">
        <!-- First: re-adding a team that has played before is one tap, as the site's Add Player drawer puts recent players first. -->
        <section v-if="state.savedTeams.length">
          <h3 class="mb-2 text-sm font-bold">
            {{ t("teams.savedTeams") }}
          </h3>
          <div class="flex flex-col gap-2.5">
            <div v-for="team in state.savedTeams" :key="team.name" class="flex items-center gap-2 rounded-2xl bg-white/10 p-3">
              <span :style="{ backgroundImage: gradient(team.colour) }" class="mr-1 h-7 w-10 shrink-0 rounded-lg ring-1 ring-inset ring-white/15" />
              <span class="min-w-0 flex-1">
                <span class="block truncate font-[family-name:var(--ad-font-display)] text-lg uppercase leading-none">{{ team.name }}</span>
                <span class="block truncate text-xs text-[var(--ad-text-muted)]"><span class="mr-1.5 rounded bg-white/10 px-1.5 py-px text-[10.5px] font-extrabold tracking-wide text-[var(--ad-ink-200)]">{{ team.format === "own" ? t("teams.formats.own") : t("teams.formats.shared") }}</span>{{ team.players.join(" ▸ ") }}</span>
                <span v-if="state.savedProblems[team.name]" class="mt-0.5 block truncate text-xs font-semibold text-[var(--ad-text-muted)]">{{ problemText(state.savedProblems[team.name]) }}</span>
              </span>
              <button @click="addSaved(team)" :disabled="pending || Boolean(state.savedProblems[team.name])" class="adt-team-button h-8 min-w-16 px-4 text-sm" type="button">
                {{ t("common.add") }}
              </button>
              <ConfirmDeleteButton @confirm="deleteSaved(team)" :label="team.name" />
            </div>
          </div>
        </section>

        <section>
          <label :for="nameId" class="mb-2 block text-sm font-bold">{{ t("teams.drawer.sections.name") }}</label>
          <input
            @input="nameTouched = true"
            :id="nameId"
            ref="nameInput"
            v-model="name"
            :maxlength="MAX_NAME_LENGTH"
            :readonly="Boolean(state.editing)"
            autocomplete="off"
            class="adt-team-field"
            spellcheck="false"
            type="text"
          >
          <p v-if="state.editing" class="mt-1.5 text-xs text-[var(--ad-text-muted)]">
            {{ t("teams.drawer.keepsName") }}
          </p>
        </section>

        <section>
          <h3 class="mb-2 flex items-baseline justify-between gap-3 text-sm font-bold">
            {{ t("teams.drawer.sections.colour") }} <small class="text-xs font-semibold text-[var(--ad-text-muted)]">{{ format === "own" ? t("teams.drawer.hints.colourOwn") : t("teams.drawer.hints.colourShared") }}</small>
          </h3>
          <SchemePicker v-model="colour" :disabled-presets="takenPresets" :label="t('teams.drawer.colour')" :presets="CARD_PRESETS" :site="SITE_CARD" />
        </section>

        <section>
          <h3 class="mb-2 flex items-baseline justify-between gap-3 text-sm font-bold">
            {{ t("teams.drawer.sections.players") }} <small class="text-xs font-semibold text-[var(--ad-text-muted)]">{{ t("teams.drawer.hints.dragToReorder") }}</small>
          </h3>
          <template v-if="format === 'shared'">
            <ol ref="list" class="flex flex-col gap-2.5">
              <li v-for="(player, index) in players" :key="player" :data-index="index" class="flex items-center gap-2">
                <span class="adt-team-handle icon-[material-symbols--drag-indicator] size-5 shrink-0 cursor-grab text-[#4d525d]" aria-hidden="true" />
                <span class="w-4 shrink-0 text-center text-[13px] font-extrabold text-[#707580]">{{ index + 1 }}</span>
                <span class="adt-team-tag">{{ player }}</span>
                <button @click="removePlayer(index)" :aria-label="t('common.remove', { name: player })" class="ml-auto grid size-8 place-items-center rounded-lg text-[#707580] hover:bg-white/10 hover:text-white" type="button">
                  <span class="icon-[material-symbols--close-rounded] size-5" />
                </button>
              </li>
            </ol>
            <p v-if="!players.length" class="text-[13px] text-[var(--ad-text-muted)]">
              {{ t("teams.drawer.emptyShared") }}
            </p>
            <form @submit.prevent="addTyped" class="relative mt-3">
              <span class="icon-[material-symbols--search-rounded] pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#707580]" aria-hidden="true" />
              <input
                v-model="query"
                :aria-label="t('teams.drawer.searchOrAdd')"
                :disabled="players.length >= MAX_PLAYERS"
                :placeholder="t('teams.drawer.searchOrAdd')"
                autocomplete="off"
                class="adt-team-field has-icon"
                spellcheck="false"
                type="text"
              >
            </form>
            <div v-if="chips.length" class="mt-2.5 flex flex-wrap gap-1.5">
              <TeamNameChip
                @add="addPlayer(chip.name)"
                @forget="forget(chip.name)"
                v-for="chip in chips"
                :key="chip.name"
                :disabled="Boolean(chip.team) || players.length >= MAX_PLAYERS"
                :forgettable="forgettable.has(chip.name)"
                :name="chip.name"
                :team="chip.team"
              />
            </div>
            <p class="mt-2.5 text-xs text-[var(--ad-text-muted)]">
              {{ t("teams.drawer.noBotShared") }}
            </p>
          </template>
          <template v-else>
            <ol ref="ownList" class="flex flex-col gap-2.5">
              <li v-for="(pick, index) in picks" :key="pickKey(pick)" :data-index="index" class="flex items-center gap-2">
                <span class="adt-team-handle icon-[material-symbols--drag-indicator] size-5 shrink-0 cursor-grab text-[#4d525d]" aria-hidden="true" />
                <span class="w-4 shrink-0 text-center text-[13px] font-extrabold text-[#707580]">{{ index + 1 }}</span>
                <span class="adt-team-tag">{{ pickName(pick) }}</span>
                <span class="text-xs font-bold text-[var(--ad-text-muted)]">{{ pickKind(pick) }}</span>
                <button @click="removePick(index)" :aria-label="t('common.remove', { name: pickName(pick) })" class="ml-auto grid size-8 place-items-center rounded-lg text-[#707580] hover:bg-white/10 hover:text-white" type="button">
                  <span class="icon-[material-symbols--close-rounded] size-5" />
                </button>
              </li>
            </ol>
            <p v-if="!picks.length" class="text-[13px] text-[var(--ad-text-muted)]">
              {{ t("teams.drawer.emptyOwn") }}
            </p>
          </template>
        </section>

        <section v-if="format === 'own'">
          <h3 class="mb-2 flex items-baseline justify-between gap-3 text-sm font-bold">
            {{ t("teams.drawer.sections.inThisLobby") }} <small class="text-xs font-semibold text-[var(--ad-text-muted)]">{{ t("teams.drawer.hints.tapToAdd") }}</small>
          </h3>
          <div class="flex flex-wrap gap-1.5">
            <TeamNameChip
              @add="pickSeat(seat)"
              v-for="seat in lobbySeats"
              :key="seat.id"
              :disabled="Boolean(seat.team) || picks.length >= MAX_PLAYERS"
              :name="seat.name"
              :team="seat.team"
            />
          </div>
        </section>

        <section v-if="format === 'own'">
          <h3 class="mb-2 flex items-baseline justify-between gap-3 text-sm font-bold">
            {{ t("teams.drawer.sections.newPlayers") }} <small class="text-xs font-semibold text-[var(--ad-text-muted)]">{{ t("teams.drawer.hints.joinAsGuests") }}</small>
          </h3>
          <form @submit.prevent="addTyped" class="relative">
            <span class="icon-[material-symbols--search-rounded] pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#707580]" aria-hidden="true" />
            <input
              v-model="query"
              :aria-label="t('teams.drawer.searchOrAdd')"
              :disabled="picks.length >= MAX_PLAYERS"
              :placeholder="t('teams.drawer.searchOrAdd')"
              autocomplete="off"
              class="adt-team-field has-icon"
              spellcheck="false"
              type="text"
            >
          </form>
          <div v-if="ownChips.length" class="mt-2.5 flex flex-wrap gap-1.5">
            <TeamNameChip
              @add="addPlayer(chip)"
              @forget="forget(chip)"
              v-for="chip in ownChips"
              :key="chip"
              :disabled="picks.length >= MAX_PLAYERS"
              :forgettable="forgettable.has(chip)"
              :name="chip"
            />
          </div>
        </section>

        <section v-if="format === 'own'">
          <h3 class="mb-2 flex items-baseline justify-between gap-3 text-sm font-bold">
            {{ t("teams.drawer.sections.bots") }} <small class="text-xs font-semibold text-[var(--ad-text-muted)]">{{ t("teams.drawer.hints.joinAtLevel") }}</small>
          </h3>
          <div class="flex items-center gap-2">
            <select v-model.number="botLevel" :aria-label="t('teams.drawer.botLevel')" :disabled="!state.botsOk || picks.length >= MAX_PLAYERS" class="adt-team-field adt-team-select">
              <option v-for="level in BOT_LEVELS" :key="level" :value="level">
                {{ t("teams.drawer.levelOption", { level, ppr: botPpr(level) }) }}
              </option>
            </select>
            <button @click="addBotPick" :disabled="!state.botsOk || picks.length >= MAX_PLAYERS" class="adt-team-button h-11 shrink-0 px-5 text-sm" type="button">
              {{ t("teams.drawer.addBot") }}
            </button>
          </div>
          <p v-if="!state.botsOk" class="mt-1.5 text-xs text-[var(--ad-text-muted)]">
            {{ problemText(BOTS_ONLY) }}
          </p>
        </section>
      </div>

      <footer class="flex shrink-0 flex-col gap-2 border-t border-white/10 px-6 pb-6 pt-4">
        <p v-if="error" class="text-[13px] font-semibold text-[var(--ad-text-destructive)]" role="alert">
          {{ problemText(error) }}
        </p>
        <button @click="submit" :disabled="pending" class="adt-team-button h-12 w-full text-[15px]" type="button">
          {{ state.editing ? t("common.save") : t("teams.lobby.addTeam") }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import Sortable from "sortablejs";

import TeamNameChip from "./TeamNameChip.vue";

import type { DrawerState, SeatChoice } from "./teams";
import type { OwnPick, SavedTeam, TeamsProblem } from "@/utils/teams";

import SchemePicker from "@/components/Settings/Colors/SchemePicker.vue";
import ConfirmDeleteButton from "@/components/Settings/Library/ConfirmDeleteButton.vue";
import { CARD_PRESETS, SITE_CARD, gradient } from "@/utils/colors";
import { LAYERS } from "@/utils/layers";
import { BOTS_ONLY, BOT_LEVELS, LEGS_ONLY, MAX_NAME_LENGTH, MAX_PLAYERS, botName, botPpr, nextFreeColour, normalizeName } from "@/utils/teams";
import { problemText, suggestName } from "@/utils/teams-text";

const props = defineProps<{ state: DrawerState }>();

const { t } = useI18n();

const titleId = "adt-team-drawer-title";
const nameId = "adt-team-drawer-name";

const panel = ref<HTMLElement>();
const nameInput = ref<HTMLInputElement>();
const list = ref<HTMLElement>();
const players = ref<string[]>([ ...(props.state.editing?.players ?? []) ]);
const colour = ref({ ...(props.state.editing?.colour ?? nextFreeColour(props.state.takenColours)) });
const name = ref(props.state.editing?.name ?? suggestName(colour.value, props.state.reservedNames));
/** Once typed into, the name no longer follows the colour. */
const nameTouched = ref(Boolean(props.state.editing));
const query = ref("");
/** What went wrong, or what to know, as a message: worded when it is shown, so it follows a change of language. */
const error = ref<TeamsProblem>();
const pending = ref(false);
const format = ref<"shared" | "own">(props.state.lockedFormat ?? "shared");
const picks = ref<OwnPick[]>(props.state.editingSeats.map(id => ({ seatId: id, name: props.state.seats.find(seat => seat.id === id)?.name ?? "" })));
const ownList = ref<HTMLElement>();
const botLevel = ref(5);
/** Tells two new bots of one level apart in the list. */
let botCount = 0;
let sorter: Sortable | undefined;
let ownSorter: Sortable | undefined;

/** Taken presets for the picker; a custom pair is compared by its colours instead, at the check. */
const takenPresets = computed(() => props.state.takenColours.filter(taken => taken.preset !== "custom").map(taken => taken.preset));
/** The offered names the search leaves, minus the team's own players. */
const chips = computed(() => {
  const typed = normalizeName(query.value);
  return props.state.offered
    .filter(offered => !players.value.includes(offered) && (!typed || offered.includes(typed)))
    .map(offered => ({ name: offered, team: props.state.playerTeams[offered] }));
});
const formats = computed(() => [
  { id: "shared" as const, label: t("teams.drawer.tabs.shared"), disabled: Boolean(props.state.lockedFormat && props.state.lockedFormat !== "shared") },
  { id: "own" as const, label: t("teams.drawer.tabs.own"), disabled: props.state.setsLobby || Boolean(props.state.lockedFormat && props.state.lockedFormat !== "own") },
]);
const formatNote = computed(() => {
  if (props.state.setsLobby && format.value !== "own" && !props.state.lockedFormat) return problemText(LEGS_ONLY);
  if (!props.state.lockedFormat || !props.state.formatTeam || props.state.editing) return "";
  return props.state.lockedFormat === "own"
    ? t("teams.drawer.formatNote.own", { team: props.state.formatTeam })
    : t("teams.drawer.formatNote.shared", { team: props.state.formatTeam });
});
const ownLine = computed(() => props.state.legs > 0
  ? t("teams.drawer.ownLine.legs", { count: props.state.legs })
  : t("teams.drawer.ownLine.target"));
/** The lobby's seats not picked yet, the ones on another team greyed. */
const lobbySeats = computed(() => props.state.seats.filter(seat => !picks.value.some(pick => "seatId" in pick && pick.seatId === seat.id)));
/** Saved and recent names for new guests, minus anyone in the lobby or picked already. */
/** The chips a ✕ can delete. */
const forgettable = computed(() => new Set(props.state.forgettable));
const ownChips = computed(() => {
  const typed = normalizeName(query.value);
  const seated = new Set(props.state.seats.map(seat => seat.name));
  const picked = new Set(picks.value.map(pickName));
  return props.state.offered.filter(name => !seated.has(name) && !picked.has(name) && (!typed || name.includes(typed)));
});

onMounted(() => {
  // The keyboard comes up only for a mouse and keys, and only when there's no
  // saved team to tap first: on a phone it covered half the sheet at once.
  // Focus still moves into the dialog either way.
  if (!props.state.savedTeams.length && matchMedia("(pointer: fine)").matches) nameInput.value?.focus();
  else panel.value?.focus();
});

watch(colour, (value) => {
  if (!nameTouched.value) name.value = suggestName(value, props.state.reservedNames);
});

// Each list gets its Sortable once it is on screen: the tabs show one of them at a time.
watch(list, (element) => {
  sorter?.destroy();
  sorter = element
    ? sortable(element, (from, to) => {
      const next = [ ...players.value ];
      next.splice(to, 0, ...next.splice(from, 1));
      players.value = next;
    })
    : undefined;
});
watch(ownList, (element) => {
  ownSorter?.destroy();
  ownSorter = element
    ? sortable(element, (from, to) => {
      const next = [ ...picks.value ];
      next.splice(to, 0, ...next.splice(from, 1));
      picks.value = next;
    })
    : undefined;
});

onBeforeUnmount(() => {
  sorter?.destroy();
  ownSorter?.destroy();
});

/** A list dragged by its handles, handing the move back to be made in the array. */
function sortable(element: HTMLElement, move: (from: number, to: number) => void): Sortable {
  return Sortable.create(element, {
    animation: 150,
    handle: ".adt-team-handle",
    draggable: "[data-index]",
    onEnd({ from, item, oldIndex, newIndex }) {
      if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;
      // Back where Vue left it; Vue moves it once the array changes.
      from.removeChild(item);
      from.insertBefore(item, from.children[oldIndex] ?? null);
      move(oldIndex, newIndex);
    },
  });
}

/** Puts a player in the team, or says why not. Whether they are in it now. */
function addPlayer(raw: string): boolean {
  if (format.value === "own") {
    const guest = normalizeName(raw);
    error.value = undefined;
    if (!guest) return false;
    if (picks.value.some(pick => pickName(pick) === guest)) return true;
    if (picks.value.length >= MAX_PLAYERS) {
      error.value = { key: "teams.problems.tooMany", params: { count: MAX_PLAYERS } };
      return false;
    }
    picks.value = [ ...picks.value, { guest } ];
    query.value = "";
    return true;
  }
  const player = normalizeName(raw);
  error.value = undefined;
  if (!player) return false;
  if (players.value.includes(player)) return true;
  if (props.state.playerTeams[player]) {
    error.value = { key: "teams.problems.onTeam", params: { name: player, team: props.state.playerTeams[player] } };
    return false;
  }
  if (players.value.length >= MAX_PLAYERS) {
    error.value = { key: "teams.problems.tooMany", params: { count: MAX_PLAYERS } };
    return false;
  }
  players.value = [ ...players.value, player ];
  query.value = "";
  return true;
}

function addTyped(): boolean {
  return addPlayer(query.value);
}

function removePlayer(index: number) {
  players.value = players.value.filter((_, i) => i !== index);
}

function pickKey(pick: OwnPick) {
  if ("seatId" in pick) return `seat:${pick.seatId}`;
  if ("bot" in pick) return `bot:${pick.key}`;
  return `guest:${pick.guest}`;
}

function pickName(pick: OwnPick) {
  if ("seatId" in pick) return pick.name;
  return normalizeName("bot" in pick ? pick.name : pick.guest);
}

function pickKind(pick: OwnPick) {
  if ("bot" in pick) return t("teams.drawer.kinds.newBot", { ppr: pick.bot });
  if (!("seatId" in pick)) return t("teams.drawer.kinds.newGuest");
  const kind = props.state.seats.find(seat => seat.id === pick.seatId)?.kind;
  return kind === "bot" ? t("teams.drawer.kinds.bot") : kind === "account" ? t("teams.drawer.kinds.ownBoard") : t("teams.drawer.kinds.guest");
}

function pickSeat(seat: SeatChoice) {
  error.value = undefined;
  if (seat.team || picks.value.length >= MAX_PLAYERS) return;
  picks.value = [ ...picks.value, { seatId: seat.id, name: seat.name } ];
}

function removePick(index: number) {
  picks.value = picks.value.filter((_, i) => i !== index);
}

/** A new bot at the picked level, added to the team's list; it joins the lobby with Add Team. */
function addBotPick() {
  error.value = undefined;
  if (picks.value.length >= MAX_PLAYERS) {
    error.value = { key: "teams.problems.tooMany", params: { count: MAX_PLAYERS } };
    return;
  }
  picks.value = [ ...picks.value, { bot: botPpr(botLevel.value), name: botName(botLevel.value), key: `bot-${++botCount}` } ];
}

function deleteSaved(team: SavedTeam) {
  props.state.deleteSaved(team).catch(e => console.error(e));
}

function forget(name: string) {
  props.state.forget(name).catch(e => console.error(e));
}

async function run(task: () => Promise<TeamsProblem>) {
  if (pending.value) return;
  pending.value = true;
  error.value = undefined;
  try {
    error.value = await task();
  } finally {
    pending.value = false;
  }
}

function submit() {
  // A name still in the field joins the team first. One that can't, being on
  // another team say, stops here with its reason, rather than the team being
  // added without it.
  if (query.value.trim() && !addTyped()) return;
  if (format.value === "own") {
    run(() => props.state.submitOwn({ name: name.value, colour: colour.value, picks: picks.value }));
    return;
  }
  run(() => props.state.submit({ name: name.value, players: players.value, colour: colour.value }));
}

function addSaved(team: SavedTeam) {
  run(() => props.state.addSaved(team));
}

/** Tab stays inside the dialog while it is open. */
function trapFocus(event: KeyboardEvent) {
  const focusable = [ ...(panel.value?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled)") ?? []) ];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = (panel.value?.getRootNode() as ShadowRoot | Document).activeElement as HTMLElement | null;
  // From the dialog itself, where focus starts when saved teams show, Tab goes
  // to the first control and Shift+Tab to the last, as from anywhere outside them.
  if (!active || !focusable.includes(active)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
</script>

<style scoped>
.adt-team-drawer { position: fixed; inset: 0; font-family: var(--ad-font-body); }

/* the site's light search field */
.adt-team-field {
  width: 100%; height: 44px; border-radius: 18px; padding: 0 16px;
  background: var(--ad-ink-100); color: var(--ad-text-on-light);
  font-size: 14px; font-weight: 700; outline: none; border: 0;
}
/* room for the magnifier, which a utility class would lose to the padding above */
.adt-team-field.has-icon { padding-left: 44px; }
.adt-team-field::placeholder { color: #707580; font-weight: 600; }
.adt-team-field:focus-visible { box-shadow: var(--ad-focus-ring); }
.adt-team-field[readonly] { background: var(--ad-ink-300); cursor: default; }
.adt-team-field:disabled { opacity: .5; }

/* a player, as the site's NameTag without the avatar: Bebas on the black tag with its slanted end */
.adt-team-tag {
  display: inline-flex; align-items: center; height: 32px; padding: 2px 18px 0 14px;
  background: #01040b; color: var(--ad-ink-200); font-family: var(--ad-font-display);
  font-size: 20px; line-height: 1; text-transform: uppercase;
  clip-path: polygon(0 0, 100% 0, calc(100% - 10px) 100%, 0 100%);
}

/* the light field as a picker: the site's own chevron, drawn here */
.adt-team-select {
  appearance: none; padding-right: 40px; cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23707580' d='M12 15.4 6 9.4 7.4 8l4.6 4.6L16.6 8 18 9.4z'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 14px center; background-size: 18px;
}

/* the site's pill tabs */
.adt-team-tab { height: 32px; padding: 0 16px; border-radius: 999px; font-size: 13px; font-weight: 700; color: var(--ad-text-muted); }
.adt-team-tab[aria-selected="true"] { background: var(--ad-ink-100); color: var(--ad-text-on-light); }
.adt-team-tab:disabled { opacity: .4; cursor: not-allowed; }

/* the site's secondary button: blue-60, bold, 12px radius */
.adt-team-button {
  display: inline-flex; align-items: center; justify-content: center; border-radius: 12px;
  background: var(--ad-blue-600); color: #f0f5fd; font-weight: 700;
  transition: var(--ad-transition-interactive);
}
.adt-team-button:hover:not(:disabled) { opacity: .9; }
.adt-team-button:active:not(:disabled) { background: #003eb3; }
.adt-team-button:disabled { background: var(--ad-ink-750); color: var(--ad-ink-300); }
</style>
