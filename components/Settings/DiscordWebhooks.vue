<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div v-if="config" class="adt-container">
      <div class="relative z-10 pr-2 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          {{ t("discordWebhooks.intro") }}
        </p>

        <section>
          <h3 class="adt-section-title">
            {{ t("discordWebhooks.panel.sections.options") }}
          </h3>
          <OptionRow stacked :title="t('discordWebhooks.panel.url.title')">
            <template #description>
              {{ t("discordWebhooks.panel.url.description", { path: t("discordWebhooks.panel.url.path") }) }}
            </template>
            <AppInput
              id="discord-webhook-url"
              v-model="config.discord.url"
              :aria-label="t('discordWebhooks.panel.url.title')"
              :placeholder="t('discordWebhooks.panel.url.placeholder')"
              type="url"
            >
              <template #icon>
                <span class="icon-[material-symbols--link-rounded]" />
              </template>
            </AppInput>
            <p v-if="urlHint" class="adt-field-hint !text-[var(--ad-warning)]">
              {{ urlHint }}
            </p>
          </OptionRow>
          <OptionRow
            :description="t('discordWebhooks.panel.send.description')"
            :title="t('discordWebhooks.panel.send.title')"
          >
            <AppRadioGroup v-model="config.discord.manually" :options="SEND_MODES" :aria-label="t('discordWebhooks.panel.send.title')" button-size="sm" />
          </OptionRow>
          <template v-if="config.discord.autoStartAfterTimer">
            <OptionRow
              :description="t('discordWebhooks.panel.countdown.description')"
              :title="t('discordWebhooks.panel.countdown.title')"
            >
              <AppToggle v-model="config.discord.autoStartAfterTimer.enabled" :aria-label="t('discordWebhooks.panel.countdown.title')" size="sm" />
            </OptionRow>
            <OptionRow v-if="config.discord.autoStartAfterTimer.enabled" :description="t('discordWebhooks.panel.countdown.minutes.description')" :title="t('discordWebhooks.panel.countdown.minutes.title')">
              <AppNumberInput
                v-model="config.discord.autoStartAfterTimer.minutes"
                :max="60"
                :min="1"
                :label="t('discordWebhooks.panel.countdown.minutes.title')"
                unit="min"
              />
            </OptionRow>
            <!--
              Disabled rather than hidden: the match half that would post the
              scores is not ported to the rebuilt site (match.content's
              PORTED_TO_V2 has no "discord"), so the switch could only fail
              silently. Same treatment as an unported feature card, and shown
              off whatever is stored, since off is what it is.
            -->
            <OptionRow
              :description="t('discordWebhooks.panel.liveScores.description')"
              :title="t('discordWebhooks.panel.liveScores.title')"
            >
              <AppToggle :model-value="false" :aria-label="t('discordWebhooks.panel.liveScores.title')" disabled size="sm" />
            </OptionRow>
          </template>
        </section>
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
            {{ t("features.discordWebhooks") }}
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>
          <p class="w-2/3 text-white/70">
            <AppTrans path="discordWebhooks.card" />
          </p>
        </div>
        <div class="flex">
          <div @click="$emit('toggle', 'discord-webhooks')" class="absolute inset-y-0 left-12 right-0 cursor-pointer" />
          <AppToggle
            @update:model-value="toggleFeature"
            v-model="config.discord.enabled"
          />
        </div>
      </div>
      <div class="gradient-mask-left absolute inset-y-0 right-0 w-2/3">
        <img :src="imageUrl" :alt="t('features.discordWebhooks')" class="size-full object-cover opacity-70">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppInput from "../AppInput.vue";
import AppNumberInput from "../AppNumberInput.vue";
import AppRadioGroup from "../AppRadioGroup.vue";
import AppToggle from "../AppToggle.vue";
import AppTrans from "../AppTrans.vue";

import OptionRow from "./Library/OptionRow.vue";

const emit = defineEmits([ "toggle" ]);

/** Discord's own webhook addresses, its test clients' and versioned ones (/api/v10/webhooks/) included. */
const DISCORD_WEBHOOK = /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api\/(?:v\d+\/)?webhooks\//i;

const { t } = useI18n();
const { config } = useConfig();
const imageUrl = browser.runtime.getURL("/images/discord-webhooks.png");

const SEND_MODES = computed(() => [
  { label: t("discordWebhooks.panel.send.options.automatic"), value: false },
  { label: t("discordWebhooks.panel.send.options.manual"), value: true },
]);

/** Said under the field: nothing is posted without a URL, and anything but a webhook is likely a paste gone wrong. */
const urlHint = computed(() => {
  const url = config.value?.discord.url?.trim() ?? "";
  if (!url) return t("discordWebhooks.panel.url.nothingPosted");
  if (!DISCORD_WEBHOOK.test(url)) return t("discordWebhooks.panel.url.notWebhook");
  return "";
});

async function toggleFeature() {
  if (!config.value) return;

  // Toggle the feature
  const wasEnabled = config.value.discord.enabled;
  config.value.discord.enabled = !wasEnabled;

  // If we're enabling the feature, open settings
  if (!wasEnabled) {
    await nextTick();
    emit("toggle", "discord-webhooks");
  }
}
</script>
