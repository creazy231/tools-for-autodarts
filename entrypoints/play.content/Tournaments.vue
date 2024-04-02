<template>
  <div class="mx-auto w-full max-w-[1366px] space-y-8 p-4 pr-8 lg:pr-4">
    <template v-if="view === 'tournaments'">
      <div class="flex items-center justify-between">
        <h1 class="text-3xl font-bold">
          Tournaments
        </h1>
        <AppButton
          @click="view = 'create-tournament'"
          auto
        >
          Create tournament
        </AppButton>
      </div>
    </template>
    <template v-if="view === 'create-tournament'">
      <TournamentsCreate
        @close="view = 'tournaments'"
        :sub="sub"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import AppButton from "@/components/AppButton.vue";
import TournamentsCreate from "@/components/Tournaments/TournamentsCreate.vue";

const view: Ref<"tournaments" | "create-tournament"> = ref("tournaments");
const sub = ref("");

onMounted(async () => {
  console.log("Tournaments page");

  const jwt = await browser.runtime.sendMessage("cookies:authorization");

  const jwtParts = jwt.split(".");
  const jwtPayload = JSON.parse(atob(jwtParts[1]));
  console.log(jwtPayload);

  sub.value = jwtPayload.sub;
});
</script>
