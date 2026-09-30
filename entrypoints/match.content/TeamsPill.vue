<template>
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
.adt-teams-status {
  display: flex; align-items: center; gap: 14px; width: 100%; box-sizing: border-box;
  padding: 0 16px 8px; font-family: var(--ad-font-body);
}
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
