<template>
  <section>
    <!--
      Heading, search and filters stay in view while the list scrolls under
      them. The dialog body is the scroller, so this sticks to its top edge on
      the dialog's own colour, a pixel above, because the edge falls between
      pixels and a sliver of what scrolled under would show.
    -->
    <div class="sticky -top-px z-20 border-b border-[var(--ad-border-subtle)] bg-[var(--ad-surface-overlay)] pb-3 pt-px">
      <div class="flex min-h-12 items-center justify-between gap-3 pt-2">
        <h3 class="adt-section-title">
          {{ title }}
          <span v-if="entries.length" class="adt-section-count">· {{ entries.length }}</span>
        </h3>
        <div class="flex items-center gap-2">
          <slot name="actions" />
        </div>
      </div>
      <template v-if="entries.length">
        <AppSearchInput v-model="query" :placeholder="searchPlaceholder" class="mt-3" />
        <div v-if="showPills || filtering" class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <AppFilterPills v-if="showPills" v-model="filter" :options="pills" label="Show" />
          <p v-if="filtering" aria-live="polite" class="ml-auto text-sm font-semibold tabular-nums text-[var(--ad-text-muted)]">
            {{ shown.length }} of {{ entries.length }}
          </p>
        </div>
      </template>
    </div>

    <div ref="list" :class="listClass">
      <slot :entries="shown" :filtering="filtering" :query="query" />
    </div>

    <div v-if="!entries.length" class="flex flex-col items-center px-6 py-14 text-center">
      <span class="mb-4 text-5xl text-white/25" :class="[emptyIcon]" />
      <p class="text-lg font-bold text-white">
        {{ emptyTitle }}
      </p>
      <p class="mt-1 max-w-md text-sm text-[var(--ad-text-muted)]">
        {{ emptyText }}
      </p>
      <div v-if="$slots.empty" class="mt-6 flex flex-wrap justify-center gap-2">
        <slot name="empty" />
      </div>
    </div>

    <div v-else-if="!shown.length" class="flex flex-col items-center px-6 py-14 text-center">
      <span class="icon-[material-symbols--search-off-rounded] mb-4 text-5xl text-white/25" />
      <p class="text-lg font-bold text-white">
        Nothing matches
      </p>
      <p class="mt-1 max-w-md text-sm text-[var(--ad-text-muted)]">
        {{ noMatchText }}
      </p>
      <AppButton @click="reset" auto class="mt-6" size="sm">
        Clear the search
      </AppButton>
    </div>

    <p v-else-if="sortable && filtering && shown.length > 1" class="mt-4 text-center text-xs text-[var(--ad-text-muted)]">
      {{ dragHint }}
    </p>
  </section>
</template>

<script setup lang="ts">
import Sortable from "sortablejs";

import type { LibraryEntry, LibraryFilter, TriggerCategory } from "@/utils/library-search";

import AppButton from "@/components/AppButton.vue";
import AppFilterPills from "@/components/AppFilterPills.vue";
import AppSearchInput from "@/components/AppSearchInput.vue";
import { CATEGORY_LABELS, CATEGORY_ORDER, filterCounts, keptFilter, matchesFilter, searchLibrary, showsFilters } from "@/utils/library-search";

/**
 * A feature's list of items: the heading with its count and actions, the
 * search, the trigger filters, and the list itself, which the parent renders
 * through the default slot from the entries this hands it.
 *
 * Order is the user's own arrangement, since the engines pick at random among
 * matching items. So the list is filtered, never regrouped, and it can be
 * dragged whenever it shows everything.
 */
const props = withDefaults(defineProps<{
  title: string;
  entries: LibraryEntry[];
  emptyTitle: string;
  emptyText: string;
  emptyIcon?: string;
  searchPlaceholder?: string;
  /** Layout of the list: rows by default, a grid for pictures. */
  listClass?: string;
  categoryLabels?: Partial<Record<TriggerCategory, string>>;
  /** Whether items can be dragged into a new order. Not for a list kept in an order of its own, such as the saved players. */
  sortable?: boolean;
  /** Said when a search finds nothing. */
  noMatchText?: string;
}>(), {
  emptyIcon: "icon-[material-symbols--library-music-outline-rounded]",
  searchPlaceholder: "Search by name or trigger",
  listClass: "",
  categoryLabels: () => ({}),
  sortable: true,
  noMatchText: "No item has that in its name, triggers or source.",
});

const emit = defineEmits<{ reorder: [ from: number, to: number ] }>();

const query = ref("");
const filter = ref<LibraryFilter>("all");
const list = ref<HTMLElement>();
let sorter: Sortable | undefined;

const matching = computed(() => searchLibrary(props.entries, query.value));
const shown = computed(() => matching.value.filter(entry => matchesFilter(entry, filter.value)));
const filtering = computed(() => query.value.trim() !== "" || filter.value !== "all");
/** Which pills there are comes from the whole library, so they stay put while typing… */
const present = computed(() => filterCounts(props.entries));
/** …and their numbers from what the search leaves. */
const counts = computed(() => filterCounts(matching.value));
const showPills = computed(() => showsFilters(present.value));
/** What dragging needs: the whole list back. */
const dragHint = computed(() => {
  const searching = query.value.trim() !== "";
  if (searching && filter.value !== "all") return "Clear the search and pick All to drag items into a new order.";
  return searching ? "Clear the search to drag items into a new order." : "Pick All to drag items into a new order.";
});
const pills = computed(() => {
  const labels = { ...CATEGORY_LABELS, ...props.categoryLabels };
  const options = [ { value: "all", label: "All", count: counts.value.all } ];
  for (const category of CATEGORY_ORDER) {
    if (present.value[category]) options.push({ value: category, label: labels[category], count: counts.value[category] });
  }
  if (present.value.off) options.push({ value: "off", label: "Off", count: counts.value.off });
  return options;
});

onMounted(() => {
  if (!list.value || !props.sortable) return;
  sorter = Sortable.create(list.value, {
    animation: 150,
    handle: ".adt-drag-handle",
    draggable: "[data-index]",
    ghostClass: "adt-sortable-ghost",
    disabled: filtering.value,
    onEnd({ from, item, oldIndex, newIndex }) {
      if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;
      // Put the node back where Vue left it. Vue moves it itself once the array changes.
      from.removeChild(item);
      from.insertBefore(item, from.children[oldIndex] ?? null);
      emit("reorder", oldIndex, newIndex);
    },
  });
});

watch(filtering, (value) => {
  sorter?.option("disabled", value);
});

// A pill whose last item has gone (the last one off switched back on) goes back
// to All, and so does any pill once the whole row hides.
watch(present, (value) => {
  filter.value = keptFilter(filter.value, value);
});

onBeforeUnmount(() => sorter?.destroy());

function reset() {
  query.value = "";
  filter.value = "all";
}
</script>
