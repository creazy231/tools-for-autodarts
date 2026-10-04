<template>
  <div class="adt-teams">
    <!--
      The site's StatusLine and StatusPill (Killer's "TOM to throw"), in the
      throwing team's gradient; with own scores, the teams' legs either side.
      One line, whatever it says, and never wrapping: see utils/teams-pill.ts.
    -->
    <div :class="{ 'has-tally': view.left.length, 'has-note': view.noteKind }" :style="{ '--adt-to': view.to }" class="adt-teams-status">
      <span class="adt-teams-line" aria-hidden="true" />
      <span v-for="team in view.left" :key="team.name" :aria-label="legsLabel(team)" class="adt-teams-tally-team" role="img">
        <i :style="{ backgroundImage: swatch(team) }" /><span class="adt-teams-tally-name">{{ team.name }}</span><b>{{ team.legs }}</b>
      </span>
      <div :class="view.noteKind ? `is-${view.noteKind}` : ''" class="adt-teams-pill" aria-live="polite">
        <TransitionGroup class="adt-teams-layers" name="adt-teams-fade" tag="span" aria-hidden="true">
          <i v-for="layer in layers" :key="layer.key" :style="{ backgroundImage: layer.gradient }" />
        </TransitionGroup>
        <Transition mode="out-in" name="adt-teams-slide">
          <span :key="view.turnKey" class="adt-teams-text">
            <span class="adt-teams-primary">{{ view.text }}</span><span v-if="view.detail" class="adt-teams-detail">{{ view.detail }}</span>
          </span>
        </Transition>
      </div>
      <span v-for="team in view.right" :key="team.name" :aria-label="legsLabel(team)" class="adt-teams-tally-team" role="img">
        <i :style="{ backgroundImage: swatch(team) }" /><span class="adt-teams-tally-name">{{ team.name }}</span><b>{{ team.legs }}</b>
      </span>
      <em v-if="view.target && view.left.length" class="adt-teams-target">{{ t("teams.pill.firstTo", { count: view.target }) }}</em>
      <span v-if="view.offline" :title="t('teams.online.offline.hint')" class="adt-teams-offline" role="status">{{ t("teams.online.offline.badge") }}</span>
      <span class="adt-teams-line" aria-hidden="true" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PillView, TallyTeam } from "@/utils/teams-pill";

const props = defineProps<{ view: PillView }>();

const { t } = useI18n();

/** One layer per gradient; a new one fades in over the one leaving. */
const layers = computed(() => [ {
  key: `${props.view.from}${props.view.to}`,
  gradient: `linear-gradient(to bottom right, ${props.view.from} 0%, ${props.view.to} 100%)`,
} ]);

function swatch(team: TallyTeam) {
  return `linear-gradient(to right, ${team.from}, ${team.to})`;
}

function legsLabel(team: TallyTeam) {
  return t("teams.pill.legs", { name: team.name, count: team.legs });
}
</script>

<style scoped>
/* Sized by its own width, so the narrow forms follow the row it sits in, not the window. */
.adt-teams { container-type: inline-size; padding-bottom: 8px; font-family: var(--ad-font-body); }
.adt-teams-status {
  display: flex; align-items: center; gap: 10px; height: 40px; width: 100%; box-sizing: border-box; padding: 0 16px;
}
.adt-teams-line {
  flex: 1 1 0; min-width: 0; height: 2px; background-color: var(--adt-to); opacity: .6;
  transition: background-color 450ms var(--ad-ease-standard);
}
.adt-teams-line:first-child { -webkit-mask: linear-gradient(to left, #000, transparent); mask: linear-gradient(to left, #000, transparent); }
.adt-teams-line:last-child { -webkit-mask: linear-gradient(to right, #000, transparent); mask: linear-gradient(to right, #000, transparent); }
.adt-teams-pill {
  position: relative; isolation: isolate; overflow: hidden; display: flex; align-items: center;
  flex: 0 1 auto; min-width: 0; height: 40px; box-sizing: border-box; padding: 0 22px; border-radius: 999px;
  background: var(--ad-ink-750); color: #f7f8fa; font-size: 16px; font-weight: 700; line-height: 20px; white-space: nowrap;
  transition: color 300ms var(--ad-ease-standard), box-shadow 300ms var(--ad-ease-standard);
}
/* The partner rule's lines: dark, ringed and coloured as the old note line was. */
.adt-teams-pill.is-rule { color: #ffd27a; box-shadow: inset 0 0 0 1.5px rgb(255 190 60 / 55%); }
.adt-teams-pill.is-bust { color: #ffb4b4; box-shadow: inset 0 0 0 1.5px rgb(255 90 90 / 60%); }
.adt-teams-layers { position: absolute; inset: 0; z-index: -1; transition: opacity 300ms var(--ad-ease-standard); }
.adt-teams-pill.is-rule .adt-teams-layers, .adt-teams-pill.is-bust .adt-teams-layers { opacity: 0; }
.adt-teams-layers i { position: absolute; inset: 0; }
/*
 * One line, with one ellipsis at its end: the detail gives way first, and the
 * news only once there's no room left for it. Two flex items with their own
 * ellipses cut the news short for a fraction of a pixel.
 */
.adt-teams-text { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.adt-teams-detail { margin-left: 8px; font-size: 13px; font-weight: 600; opacity: .75; }
.adt-teams-tally-team {
  flex: none; display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 11px 0 9px; box-sizing: border-box;
  border-radius: 999px; background: var(--ad-ink-800); color: #f7f8fa; font-size: 12px; font-weight: 800; white-space: nowrap;
}
.adt-teams-tally-team i { width: 9px; height: 9px; border-radius: 3px; }
/* A long team name gives way before the pill does: the pill says who's up. */
.adt-teams-tally-name { max-width: 7.5em; overflow: hidden; text-overflow: ellipsis; }
.adt-teams-tally-team b { font-size: 15px; }
.adt-teams-target { flex: none; font-style: normal; font-size: 11px; font-weight: 700; color: #a1a1a1; white-space: nowrap; }
@container (max-width: 799px) {
  /* The rule's reason is worth more than the teams' names, which their colours stand for. */
  .adt-teams-status.has-note .adt-teams-tally-name { display: none; }
}
@container (max-width: 639px) {
  .adt-teams-target { display: none; }
}
@container (max-width: 519px) {
  .adt-teams-tally-name { display: none; }
  .adt-teams-tally-team { padding: 0 10px 0 9px; }
  .adt-teams-status { gap: 8px; }
  .adt-teams-status.has-tally .adt-teams-line { display: none; }
  .adt-teams-pill { padding: 0 14px; font-size: 15px; }
  .adt-teams-pill:not(.is-rule, .is-bust) .adt-teams-detail { display: none; }
}
.adt-teams-fade-enter-active, .adt-teams-fade-leave-active { transition: opacity 450ms var(--ad-ease-standard); }
.adt-teams-fade-enter-from, .adt-teams-fade-leave-to { opacity: 0; }
.adt-teams-slide-enter-active { transition: transform 380ms var(--ad-ease-standard), opacity 380ms var(--ad-ease-standard); }
.adt-teams-slide-leave-active { transition: opacity 120ms linear; }
.adt-teams-slide-enter-from { transform: translateY(120%); opacity: 0; }
.adt-teams-slide-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .adt-teams-line, .adt-teams-pill, .adt-teams-layers, .adt-teams-fade-enter-active, .adt-teams-fade-leave-active,
  .adt-teams-slide-enter-active, .adt-teams-slide-leave-active { transition: none; }
}
/* Online Teams' outage, inside the one line: the board doesn't move when the room drops. */
.adt-teams-offline {
  flex: none; padding: 3px 8px; border-radius: 999px; white-space: nowrap;
  font-size: 10.5px; font-weight: 800; color: #ffb4c0; background: rgb(226 78 103 / 18%);
}
</style>
