<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <!-- Visible overflow so the list's heading can stick; see Wled.vue. -->
    <div v-if="config" class="adt-container !overflow-visible">
      <div class="relative z-10 pr-2 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          Keeps the local players you enter, not only the six autodarts remembers, and puts them one click away in a strip under the lobby's player list.
        </p>

        <section class="mb-10">
          <h3 class="adt-section-title">
            Options
          </h3>
          <!-- No ceiling, as the lobby has none: one would trim a longer stored list at the next sync. -->
          <OptionRow description="Once the list is full, the oldest name makes room for a new one." title="Players to keep">
            <AppNumberInput
              v-model="config.recentLocalPlayers.cap"
              :min="1"
              label="Players to keep"
            />
          </OptionRow>
        </section>

        <!--
          Not sortable: the lobby rebuilds this order on every visit, newest
          first, from autodarts' own list and this one.
        -->
        <LibrarySection
          :entries="entries"
          :sortable="false"
          empty-icon="icon-[material-symbols--group-outline-rounded]"
          empty-text="Every local player you add to a lobby is saved here, and offered in a strip under the lobby's player list."
          empty-title="No saved players yet"
          no-match-text="No saved player has that in their name."
          search-placeholder="Search players"
          title="Saved players"
        >
          <template #actions>
            <AppMenu :items="moreActions">
              <template #trigger="{ open, toggle }">
                <button @click="toggle" :aria-expanded="open" aria-label="More actions" class="adt-icon-btn" title="More" type="button">
                  <span class="icon-[material-symbols--more-horiz]" />
                </button>
              </template>
            </AppMenu>
          </template>

          <template #default="{ entries: shown, query }">
            <LibraryItem
              @delete="removePlayer(entry.index)"
              v-for="entry in shown"
              :key="entry.name"
              :data-index="entry.index"
              :query="query"
              :title="entry.name"
              plain
            >
              <template #lead>
                <span class="icon-[material-symbols--person-outline-rounded] block text-lg text-[var(--ad-text-muted)]" />
              </template>
            </LibraryItem>
          </template>
        </LibrarySection>
      </div>
    </div>

    <!-- Delete all -->
    <AppModal @close="showDeleteAll = false" :show="showDeleteAll" :title="`Delete all ${config?.recentLocalPlayers.players.length ?? 0} saved players?`" ghost-close size="sm">
      <p class="text-sm text-[var(--ad-text-muted)]">
        They go from the lobby's strip and from autodarts' own Add Player list. This can't be undone.
      </p>
      <template #footer>
        <AppButton @click="showDeleteAll = false" auto>
          Cancel
        </AppButton>
        <AppButton @click="deleteAllPlayers" auto type="danger">
          Delete all
        </AppButton>
      </template>
    </AppModal>
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
            Recent Local Players
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>

          <p class="w-2/3 text-white/70">
            Autodarts remembers your last 6 local players and drops the rest for good. This keeps them all and puts them one click away in the lobby.
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'recent-local-players')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle
            @update:model-value="toggleFeature"
            v-model="config.recentLocalPlayers.enabled"
          />
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" alt="Recent Local Players" class="size-full object-cover opacity-70">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppButton from "../AppButton.vue";
import AppMenu from "../AppMenu.vue";
import AppModal from "../AppModal.vue";
import AppNumberInput from "../AppNumberInput.vue";
import AppToggle from "../AppToggle.vue";

import LibraryItem from "./Library/LibraryItem.vue";
import LibrarySection from "./Library/LibrarySection.vue";
import OptionRow from "./Library/OptionRow.vue";

import type { LibraryEntry } from "@/utils/library-search";

import { forgetGuestPlayers } from "@/utils/guest-players";

const emit = defineEmits([ "toggle" ]);
const { config } = useConfig();
const imageUrl = browser.runtime.getURL("/images/recent-local-players.png");

const showDeleteAll = ref(false);

/** Names only: nothing to trigger, switch or edit, so the library searches the name. */
const entries = computed<LibraryEntry[]>(() => (config.value?.recentLocalPlayers.players ?? [])
  .map((name, index) => ({ index, name, triggers: [], source: "", enabled: true })));

const moreActions = computed(() => [
  {
    label: "Delete all…",
    icon: "icon-[material-symbols--delete-outline-rounded]",
    danger: true,
    disabled: !config.value?.recentLocalPlayers.players.length,
    action: () => {
      showDeleteAll.value = true;
    },
  },
]);

/** From both lists, or the lobby's next sync brings the name back; see utils/guest-players.ts. */
function removePlayer(index: number) {
  const players = config.value?.recentLocalPlayers.players;
  if (!players?.[index]) return;
  forgetGuestPlayers([ players[index] ]);
  players.splice(index, 1);
}

function deleteAllPlayers() {
  if (!config.value) return;
  forgetGuestPlayers(config.value.recentLocalPlayers.players);
  config.value.recentLocalPlayers.players = [];
  showDeleteAll.value = false;
}

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.recentLocalPlayers.enabled;
  config.value.recentLocalPlayers.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "recent-local-players");
  }
}
</script>
