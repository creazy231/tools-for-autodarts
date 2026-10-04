<template>
  <div v-if="view.show" :aria-label="title" class="adt-invite" role="region">
    <div class="adt-invite-head">
      <div>
        <p class="adt-invite-title">
          {{ title }}
        </p>
        <p class="adt-invite-sub">
          {{ t("teams.online.invitation.lobby", { host: view.host, details }) }}
        </p>
      </div>
      <button @click="view.dismiss()" :aria-label="t('teams.online.invitation.dismiss')" class="adt-invite-x" type="button">
        <span aria-hidden="true" class="icon-[material-symbols--close-rounded]" />
      </button>
    </div>
    <div class="adt-invite-picks">
      <button
        @click="view.join(team)"
        v-for="team in view.saved"
        :key="team.name"
        :disabled="view.busy"
        class="adt-invite-pick is-go"
        type="button"
      >
        <i :style="{ backgroundImage: gradient(team.colour) }" />{{ t("teams.online.invitation.join", { team: team.name }) }}<small>{{ team.players.join(" ▸ ") }}</small>
      </button>
      <button @click="view.newTeam()" :disabled="view.busy" class="adt-invite-pick" type="button">
        {{ t("teams.online.invitation.newTeam") }}
      </button>
      <span v-for="team in view.other" :key="team.name" class="adt-invite-pick is-dim">
        <i :style="{ backgroundImage: gradient(team.colour) }" />{{ team.name }}
      </span>
    </div>
    <p v-for="reason in view.reasons" :key="reason" class="adt-invite-why">
      {{ reason === "sets" ? t("teams.online.invitation.setsLobby") : t("teams.online.invitation.otherFormat", { format: formatText }) }}
    </p>
    <p v-if="view.busy || view.problem" class="adt-invite-note" aria-live="polite">
      {{ view.busy ? t("teams.online.invitation.busy") : problem }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { InviteView } from "./teams";

import { gradient } from "@/utils/colors";
import { list } from "@/utils/i18n";
import { problemText } from "@/utils/teams-text";
import { inviteGame } from "@/utils/team-room";

const props = defineProps<{ view: InviteView }>();

const { t } = useI18n();

const title = computed(() => t("teams.online.invitation.title", { teams: list(props.view.teams.map(team => team.name)), count: props.view.teams.length }));
/** The lobby's game in the site's own words (utils/team-room.ts `inviteGame`), and what wins it. */
const details = computed(() => {
  const { legs, sets } = props.view.game;
  const name = inviteGame(props.view.game);
  const game = "text" in name ? name.text : t(name.key);
  return sets ? t("teams.online.invitation.sets", { game, count: sets }) : t("teams.online.invitation.legs", { game, count: legs });
});
const formatText = computed(() => t(props.view.format === "own" ? "teams.online.invitation.formats.own" : "teams.online.invitation.formats.shared"));
const problem = computed(() => (props.view.problem ? problemText(props.view.problem) : ""));
</script>

<style scoped>
.adt-invite {
  box-sizing: border-box; margin: 0 0 16px; padding: 12px 14px; border-radius: 14px; color: #f7f8fa;
  background: linear-gradient(100deg, rgb(106 22 36 / 55%), rgb(184 50 63 / 35%)); border: 1px solid rgb(184 50 63 / 60%);
  font-family: var(--ad-font-body, Manrope, system-ui, sans-serif);
}
.adt-invite-head { display: flex; justify-content: space-between; gap: 12px; }
.adt-invite-title { margin: 0; font-size: 14px; font-weight: 800; }
.adt-invite-sub { margin: 2px 0 10px; font-size: 12px; color: #dbe1eb; }
.adt-invite-x { align-self: flex-start; border: 0; background: none; color: #dbe1eb; cursor: pointer; display: inline-flex; padding: 2px; }
.adt-invite-picks { display: flex; flex-wrap: wrap; gap: 8px; }
.adt-invite-pick {
  display: inline-flex; align-items: center; gap: 7px; padding: 7px 11px 7px 8px; border: 0; border-radius: 9px;
  font-size: 12px; font-weight: 700; color: #f7f8fa; background: rgb(0 0 0 / 35%); cursor: pointer;
}
.adt-invite-pick:disabled { opacity: .6; cursor: default; }
.adt-invite-pick.is-go { background: #0b55df; }
.adt-invite-pick.is-dim { opacity: .45; cursor: default; }
.adt-invite-pick i { width: 14px; height: 14px; border-radius: 4px; display: inline-block; }
.adt-invite-pick small { font-size: 10.5px; font-weight: 600; opacity: .8; }
.adt-invite-note { margin: 8px 0 0; font-size: 12px; color: #ffd7dd; }
.adt-invite-why { margin: 8px 0 0; font-size: 11.5px; color: #dbe1eb; }
</style>
