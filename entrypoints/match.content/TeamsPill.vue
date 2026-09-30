<template>
  <div class="adt-teams">
    <!-- The site's StatusLine and StatusPill (Killer's "TOM to throw"), in the throwing team's gradient. -->
    <div :style="{ '--adt-to': view.to }" class="adt-teams-status" aria-live="polite">
      <span class="adt-teams-line" aria-hidden="true" />
      <div class="adt-teams-pill">
        <TransitionGroup class="adt-teams-layers" name="adt-teams-fade" tag="span" aria-hidden="true">
          <i v-for="layer in layers" :key="layer.key" :style="{ backgroundImage: layer.gradient }" />
        </TransitionGroup>
        <Transition mode="out-in" name="adt-teams-slide">
          <span :key="view.turnKey" class="adt-teams-text">
            {{ view.text }}<span v-if="view.team" class="adt-teams-team">{{ view.team }}</span>
          </span>
        </Transition>
      </div>
      <span class="adt-teams-line" aria-hidden="true" />
    </div>
    <!-- Own scores: every team's legs against the target. -->
    <div v-if="view.tally.length" class="adt-teams-tally">
      <span v-for="team in view.tally" :key="team.name" class="adt-teams-tally-team">
        <i :style="{ backgroundImage: `linear-gradient(to right, ${team.from}, ${team.to})` }" aria-hidden="true" />{{ team.name }} <b>{{ team.legs }}</b>
      </span>
      <em v-if="view.target">first to {{ view.target }}</em>
    </div>
    <!-- Kept, empty, while the partner rule can come in, so the board doesn't move with it. -->
    <p v-if="view.note || view.noteSpace" :class="view.note ? `is-${view.noteKind}` : 'is-empty'" class="adt-teams-note" role="status">
      {{ view.note || "\u00A0" }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { PillView } from "./teams";

const props = defineProps<{ view: PillView }>();

/** One layer per gradient; a new one fades in over the one leaving. */
const layers = computed(() => [ {
  key: `${props.view.from}${props.view.to}`,
  gradient: `linear-gradient(to bottom right, ${props.view.from} 0%, ${props.view.to} 100%)`,
} ]);
</script>

<style scoped>
.adt-teams { display: flex; flex-direction: column; align-items: center; gap: 8px; padding-bottom: 8px; font-family: var(--ad-font-body); }
.adt-teams-status {
  display: flex; align-items: center; gap: 14px; width: 100%; box-sizing: border-box;
  padding: 0 16px; font-family: var(--ad-font-body);
}
.adt-teams-tally { display: flex; align-items: center; gap: 8px; }
.adt-teams-tally-team { display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 11px 0 9px; border-radius: 999px; background: var(--ad-ink-800, #16181c); color: #f7f8fa; font-size: 12px; font-weight: 800; }
.adt-teams-tally-team i { width: 9px; height: 9px; border-radius: 3px; }
.adt-teams-tally-team b { font-size: 15px; }
.adt-teams-tally em { font-style: normal; font-size: 11px; font-weight: 700; color: #a1a1a1; }
.adt-teams-note { margin: 0; max-width: 640px; padding: 8px 12px; border-radius: 10px; font-size: 13px; font-weight: 700; text-align: center; }
.adt-teams-note.is-rule { color: #ffd27a; background: rgb(255 190 60 / 10%); box-shadow: inset 0 0 0 1px rgb(255 190 60 / 35%); }
.adt-teams-note.is-bust { color: #ffb4b4; background: rgb(255 80 80 / 10%); box-shadow: inset 0 0 0 1px rgb(255 90 90 / 40%); }
.adt-teams-note.is-empty { visibility: hidden; }
.adt-teams-line {
  flex: 1; height: 2px; background-color: var(--adt-to); opacity: .6;
  transition: background-color 450ms var(--ad-ease-standard);
}
.adt-teams-line:first-child { -webkit-mask: linear-gradient(to left, #000, transparent); mask: linear-gradient(to left, #000, transparent); }
.adt-teams-line:last-child { -webkit-mask: linear-gradient(to right, #000, transparent); mask: linear-gradient(to right, #000, transparent); }
.adt-teams-pill {
  position: relative; isolation: isolate; overflow: hidden; border-radius: 999px;
  padding: 10px 22px; background: var(--ad-ink-750);
  color: #f7f8fa; font-size: 16px; font-weight: 700; line-height: 1.2; white-space: nowrap;
}
.adt-teams-layers i { position: absolute; inset: 0; z-index: -1; }
.adt-teams-text { display: inline-block; }
.adt-teams-team { margin-left: 8px; font-size: 13px; font-weight: 600; opacity: .75; }
.adt-teams-fade-enter-active, .adt-teams-fade-leave-active { transition: opacity 450ms var(--ad-ease-standard); }
.adt-teams-fade-enter-from, .adt-teams-fade-leave-to { opacity: 0; }
.adt-teams-slide-enter-active { transition: transform 380ms var(--ad-ease-standard), opacity 380ms var(--ad-ease-standard); }
.adt-teams-slide-leave-active { transition: opacity 120ms linear; }
.adt-teams-slide-enter-from { transform: translateY(120%); opacity: 0; }
.adt-teams-slide-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .adt-teams-line, .adt-teams-fade-enter-active, .adt-teams-fade-leave-active,
  .adt-teams-slide-enter-active, .adt-teams-slide-leave-active { transition: none; }
}
</style>
