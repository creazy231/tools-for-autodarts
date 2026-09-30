<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <!-- Visible overflow so the list's heading can stick; see Wled.vue. -->
    <div v-if="config" class="adt-container !overflow-visible">
      <div class="relative z-10 pr-2 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          Teams share one score and take turns on it, like steel-tip doubles. Add one in a lobby you host with <b class="text-[var(--ad-text-primary)]">Add Team</b>, next to Add Player and Add Bot. In the match, the team that's up takes its colour, and a pill under the turn bar says whose turn it is. When someone else steps up, tap their name on the team's card.
        </p>

        <section class="mb-10">
          <h3 class="adt-section-title">
            Options
          </h3>
          <OptionRow description="Own scores, X01, two teams: nobody may check out while their partner has more left than both opponents together. A checkout that breaks it counts as a bust." title="Partner rule">
            <AppToggle v-model="config.teams.partnerRule" size="sm" />
          </OptionRow>
        </section>

        <!-- Not sortable: the drawer keeps these newest first. -->
        <LibrarySection
          :entries="entries"
          :sortable="false"
          empty-icon="icon-[material-symbols--groups-outline-rounded]"
          empty-text="Teams you add with Add Team in a lobby are kept here, with their players and colour, so a rematch or the next lobby knows them."
          empty-title="No saved teams yet"
          no-match-text="No saved team has that in its name or its players."
          search-placeholder="Search teams"
          title="Saved teams"
        >
          <template #default="{ entries: shown, query }">
            <LibraryItem
              @delete="removeTeam(entry.index)"
              v-for="entry in shown"
              :key="entry.name"
              :data-index="entry.index"
              :query="query"
              :title="entry.name"
              plain
            >
              <template #lead>
                <span :style="{ backgroundImage: gradient(saved[entry.index].colour) }" class="block h-6 w-9 rounded-[var(--ad-radius-sm)] ring-1 ring-inset ring-white/15" />
              </template>
              <template #meta>
                {{ saved[entry.index].players.join(" ▸ ") }}
              </template>
            </LibraryItem>
          </template>
        </LibrarySection>
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
            Teams
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>
          <p class="w-2/3 text-white/70">
            Play in teams that share a score, like steel-tip doubles. Add them in the lobby, and the match shows whose turn it is in each team's colours.
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'teams')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle
            @update:model-value="toggleFeature"
            v-model="config.teams.enabled"
          />
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" alt="Teams" class="size-full object-cover opacity-70">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppToggle from "../AppToggle.vue";

import LibraryItem from "./Library/LibraryItem.vue";
import LibrarySection from "./Library/LibrarySection.vue";
import OptionRow from "./Library/OptionRow.vue";

import type { LibraryEntry } from "@/utils/library-search";

import { gradient } from "@/utils/colors";
import { normalizeTeams } from "@/utils/teams";

const emit = defineEmits([ "toggle" ]);
const { config } = useConfig();
const imageUrl = browser.runtime.getURL("/images/teams.png");

const saved = computed(() => normalizeTeams(config.value?.teams).saved);
/** Found by name and by any of their players. */
const entries = computed<LibraryEntry[]>(() => saved.value
  .map((team, index) => ({ index, name: team.name, triggers: [], source: team.players.join(" "), enabled: true })));

function removeTeam(index: number) {
  if (!config.value) return;
  const teams = normalizeTeams(config.value.teams);
  teams.saved.splice(index, 1);
  config.value.teams = teams;
}

async function toggleFeature() {
  if (!config.value) return;

  const wasEnabled = config.value.teams.enabled;
  config.value.teams.enabled = !wasEnabled;

  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "teams");
  }
}
</script>
