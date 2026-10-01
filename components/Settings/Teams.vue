<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <!-- Visible overflow so the list's heading can stick; see Wled.vue. -->
    <div v-if="config" class="adt-container !overflow-visible">
      <div class="relative z-10 pr-2 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          <AppTrans :params="{ addTeam: t('teams.lobby.addTeam') }" class="adt-teams-intro" path="teams.intro" />
        </p>

        <!-- Not sortable: the drawer keeps these newest first. -->
        <LibrarySection
          :empty-text="t('teams.list.emptyText', { addTeam: t('teams.lobby.addTeam') })"
          :empty-title="t('teams.list.emptyTitle')"
          :entries="entries"
          :no-match-text="t('teams.list.noMatch')"
          :search-placeholder="t('teams.list.searchPlaceholder')"
          :sortable="false"
          :title="t('teams.savedTeams')"
          empty-icon="icon-[material-symbols--groups-outline-rounded]"
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
                <span class="mr-1.5 rounded bg-white/10 px-1.5 py-px text-[10.5px] font-extrabold tracking-wide">{{ saved[entry.index].format === "own" ? t("teams.formats.own") : t("teams.formats.shared") }}</span>{{ saved[entry.index].players.join(" ▸ ") }}
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
            {{ t("features.teams") }}
            <span class="adt-badge adt-badge-practice ml-2">BETA</span>
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>
          <p class="w-2/3 text-white/70">
            {{ t("teams.card") }}
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
        <img :src="imageUrl" :alt="t('features.teams')" class="size-full object-cover opacity-70">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppToggle from "../AppToggle.vue";
import AppTrans from "../AppTrans.vue";

import LibraryItem from "./Library/LibraryItem.vue";
import LibrarySection from "./Library/LibrarySection.vue";

import type { LibraryEntry } from "@/utils/library-search";

import { gradient } from "@/utils/colors";
import { normalizeTeams } from "@/utils/teams";

const emit = defineEmits([ "toggle" ]);
const { t } = useI18n();
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

<style scoped>
/* The intro is in the secondary text colour; the button it names, in bold, in the primary one. */
.adt-teams-intro :deep(b) { color: var(--ad-text-primary); }
</style>
