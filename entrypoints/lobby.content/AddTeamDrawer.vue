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
      <button @click="state.close()" class="absolute right-4 top-4 grid size-8 place-items-center rounded-lg text-[var(--ad-text-primary)] hover:bg-white/10" aria-label="Close" type="button">
        <span class="icon-[material-symbols--close-rounded] size-5" />
      </button>

      <header class="px-6 pb-1 pt-5">
        <h2 :id="titleId" class="text-lg font-bold text-white">
          {{ state.editing ? "Edit Team" : "Add Team" }}
        </h2>
        <p class="mt-0.5 text-[13px] text-[var(--ad-text-muted)]">
          The team plays as one player on your board, and its players take turns in this order.
        </p>
      </header>

      <div class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pb-6 pt-3">
        <section>
          <label :for="nameId" class="mb-2 block text-sm font-bold">Name</label>
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
            A team keeps its name: autodarts can't rename a player. To rename it, remove the team from the lobby and add it again.
          </p>
        </section>

        <section>
          <h3 class="mb-2 flex items-baseline justify-between gap-3 text-sm font-bold">
            Colour <small class="text-xs font-semibold text-[var(--ad-text-muted)]">the card's gradient while this team is up</small>
          </h3>
          <SchemePicker v-model="colour" :disabled-presets="takenPresets" :presets="CARD_PRESETS" :site="SITE_CARD" label="Team colour" />
        </section>

        <section>
          <h3 class="mb-2 flex items-baseline justify-between gap-3 text-sm font-bold">
            Players <small class="text-xs font-semibold text-[var(--ad-text-muted)]">drag to change the order</small>
          </h3>
          <ol ref="list" class="flex flex-col gap-2.5">
            <li v-for="(player, index) in players" :key="player" :data-index="index" class="flex items-center gap-2">
              <span class="adt-team-handle icon-[material-symbols--drag-indicator] size-5 shrink-0 cursor-grab text-[#4d525d]" aria-hidden="true" />
              <span class="w-4 shrink-0 text-center text-[13px] font-extrabold text-[#707580]">{{ index + 1 }}</span>
              <span class="adt-team-tag">{{ player }}</span>
              <button @click="removePlayer(index)" :aria-label="`Remove ${player}`" class="ml-auto grid size-8 place-items-center rounded-lg text-[#707580] hover:bg-white/10 hover:text-white" type="button">
                <span class="icon-[material-symbols--close-rounded] size-5" />
              </button>
            </li>
          </ol>
          <form @submit.prevent="addTyped" class="relative mt-3">
            <span class="icon-[material-symbols--search-rounded] pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#707580]" aria-hidden="true" />
            <input
              v-model="query"
              :disabled="players.length >= MAX_PLAYERS"
              aria-label="Search or add a player"
              autocomplete="off"
              class="adt-team-field has-icon"
              placeholder="Search or add a player"
              spellcheck="false"
              type="text"
            >
          </form>
          <div v-if="chips.length" class="mt-2.5 flex flex-wrap gap-1.5">
            <button
              @click="addPlayer(chip.name)"
              v-for="chip in chips"
              :key="chip.name"
              :disabled="Boolean(chip.team) || players.length >= MAX_PLAYERS"
              :title="chip.team ? `On ${chip.team}` : `Add ${chip.name}`"
              class="adt-team-offer"
              type="button"
            >
              {{ chip.name }}<small v-if="chip.team">{{ chip.team }}</small>
            </button>
          </div>
        </section>

        <section v-if="state.savedTeams.length">
          <h3 class="mb-2 text-sm font-bold">
            Saved teams
          </h3>
          <div class="flex flex-col gap-2.5">
            <div v-for="team in state.savedTeams" :key="team.name" class="flex items-center gap-3 rounded-2xl bg-white/10 p-3">
              <span :style="{ backgroundImage: gradient(team.colour) }" class="h-7 w-10 shrink-0 rounded-lg ring-1 ring-inset ring-white/15" />
              <span class="min-w-0 flex-1">
                <span class="block truncate font-[family-name:var(--ad-font-display)] text-lg uppercase leading-none">{{ team.name }}</span>
                <span class="block truncate text-xs text-[var(--ad-text-muted)]">{{ team.players.join(" ▸ ") }}</span>
              </span>
              <button @click="addSaved(team)" :disabled="pending" class="adt-team-button h-8 min-w-16 px-4 text-sm" type="button">
                Add
              </button>
            </div>
          </div>
        </section>
      </div>

      <footer class="flex shrink-0 flex-col gap-2 border-t border-white/10 px-6 pb-6 pt-4">
        <p v-if="error" class="text-[13px] font-semibold text-[var(--ad-text-destructive)]" role="alert">
          {{ error }}
        </p>
        <button @click="submit" :disabled="pending" class="adt-team-button h-12 w-full text-[15px]" type="button">
          {{ state.editing ? "Save" : "Add Team" }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import Sortable from "sortablejs";

import type { DrawerState } from "./teams";
import type { SavedTeam } from "@/utils/teams";

import SchemePicker from "@/components/Settings/Colors/SchemePicker.vue";
import { CARD_PRESETS, SITE_CARD, gradient } from "@/utils/colors";
import { LAYERS } from "@/utils/layers";
import { MAX_NAME_LENGTH, MAX_PLAYERS, nextFreeColour, normalizeName, suggestName } from "@/utils/teams";

const props = defineProps<{ state: DrawerState }>();

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
const error = ref("");
const pending = ref(false);
let sorter: Sortable | undefined;

/** Taken presets for the picker; a custom pair is compared by its colours instead, at the check. */
const takenPresets = computed(() => props.state.takenColours.filter(taken => taken.preset !== "custom").map(taken => taken.preset));
/** The offered names the search leaves, minus the team's own players. */
const chips = computed(() => {
  const typed = normalizeName(query.value);
  return props.state.offered
    .filter(offered => !players.value.includes(offered) && (!typed || offered.includes(typed)))
    .map(offered => ({ name: offered, team: props.state.playerTeams[offered] }));
});

onMounted(() => {
  nameInput.value?.focus();
  if (!list.value) return;
  sorter = Sortable.create(list.value, {
    animation: 150,
    handle: ".adt-team-handle",
    draggable: "[data-index]",
    onEnd({ from, item, oldIndex, newIndex }) {
      if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;
      // Back where Vue left it; Vue moves it once the array changes.
      from.removeChild(item);
      from.insertBefore(item, from.children[oldIndex] ?? null);
      const next = [ ...players.value ];
      next.splice(newIndex, 0, ...next.splice(oldIndex, 1));
      players.value = next;
    },
  });
});

watch(colour, (value) => {
  if (!nameTouched.value) name.value = suggestName(value, props.state.reservedNames);
});

onBeforeUnmount(() => sorter?.destroy());

function addPlayer(raw: string) {
  const player = normalizeName(raw);
  error.value = "";
  if (!player || players.value.includes(player) || players.value.length >= MAX_PLAYERS) return;
  if (props.state.playerTeams[player]) {
    error.value = `${player} is already on ${props.state.playerTeams[player]}.`;
    return;
  }
  players.value = [ ...players.value, player ];
  query.value = "";
}

function addTyped() {
  addPlayer(query.value);
}

function removePlayer(index: number) {
  players.value = players.value.filter((_, i) => i !== index);
}

async function run(task: () => Promise<string | undefined>) {
  if (pending.value) return;
  pending.value = true;
  error.value = "";
  try {
    error.value = (await task()) ?? "";
  } finally {
    pending.value = false;
  }
}

function submit() {
  if (query.value.trim()) addTyped();
  run(() => props.state.submit({ name: name.value, players: players.value, colour: colour.value }));
}

function addSaved(team: SavedTeam) {
  run(() => props.state.addSaved(team));
}

/** Tab stays inside the dialog while it is open. */
function trapFocus(event: KeyboardEvent) {
  const focusable = [ ...(panel.value?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)") ?? []) ];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = (panel.value?.getRootNode() as ShadowRoot | Document).activeElement;
  if (event.shiftKey && active === first) {
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

/* the saved-player chips, like the Saved players strip */
.adt-team-offer {
  display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px;
  border-radius: 10px; background: var(--ad-ink-750); color: var(--ad-text-primary);
  font-size: 13px; font-weight: 700;
}
.adt-team-offer:hover:not(:disabled) { background: var(--ad-ink-700); }
.adt-team-offer:disabled { opacity: .4; cursor: not-allowed; }
.adt-team-offer small { font-size: 11px; font-weight: 600; color: var(--ad-text-muted); }

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
