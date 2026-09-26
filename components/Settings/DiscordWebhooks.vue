<template>
  <template v-if="!$attrs['data-feature-index']">
    <!-- Settings Panel -->
    <div v-if="config" class="adt-container">
      <div class="relative z-10 pr-2 text-[var(--ad-text-secondary)]">
        <p class="mb-6 max-w-3xl">
          Posts the invitation link of every private lobby you open to a Discord channel, and marks the post once the game has started.
        </p>

        <section>
          <h3 class="adt-section-title">
            Options
          </h3>
          <OptionRow stacked title="Webhook URL">
            <template #description>
              Where the invitation is posted. Discord makes one under a channel's Edit Channel › Integrations › Webhooks.
            </template>
            <AppInput
              id="discord-webhook-url"
              v-model="config.discord.url"
              aria-label="Webhook URL"
              placeholder="https://discord.com/api/webhooks/…"
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
            description="Automatic posts it as soon as the lobby opens. Manual adds a Discord button beside Shuffle, so you decide when."
            title="Send the invitation"
          >
            <AppRadioGroup v-model="config.discord.manually" :options="SEND_MODES" aria-label="Send the invitation" button-size="sm" />
          </OptionRow>
          <template v-if="config.discord.autoStartAfterTimer">
            <OptionRow
              description="Starts the game by itself a set time after the post, and the post says when."
              title="Start after a countdown"
            >
              <AppToggle v-model="config.discord.autoStartAfterTimer.enabled" aria-label="Start after a countdown" size="sm" />
            </OptionRow>
            <OptionRow v-if="config.discord.autoStartAfterTimer.enabled" description="From the post to the start of the game." title="Countdown">
              <AppNumberInput
                v-model="config.discord.autoStartAfterTimer.minutes"
                :max="60"
                :min="1"
                label="Countdown"
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
              description="Keeps a post in the channel updated with the scores while the game is on. Not available on the rebuilt site yet."
              title="Post live scores"
            >
              <AppToggle :model-value="false" aria-label="Post live scores" disabled size="sm" />
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
            Discord Webhooks
            <span class="icon-[material-symbols--settings-alert-outline-rounded] ml-2 size-5" />
          </h3>
          <p class="w-2/3 text-white/70">
            Whenever a <b>private</b> lobby opens, it sends the invitation link to your discord server using a
            webhook.
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
        <img :src="imageUrl" alt="Discord Webhooks" class="size-full object-cover opacity-70">
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import AppInput from "../AppInput.vue";
import AppNumberInput from "../AppNumberInput.vue";
import AppRadioGroup from "../AppRadioGroup.vue";
import AppToggle from "../AppToggle.vue";

import OptionRow from "./Library/OptionRow.vue";

const emit = defineEmits([ "toggle" ]);

const SEND_MODES = [
  { label: "Automatic", value: false },
  { label: "Manual", value: true },
];

/** Discord's own webhook addresses, its test clients' and versioned ones (/api/v10/webhooks/) included. */
const DISCORD_WEBHOOK = /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api\/(?:v\d+\/)?webhooks\//i;

const { config } = useConfig();
const imageUrl = browser.runtime.getURL("/images/discord-webhooks.png");

/** Said under the field: nothing is posted without a URL, and anything but a webhook is likely a paste gone wrong. */
const urlHint = computed(() => {
  const url = config.value?.discord.url?.trim() ?? "";
  if (!url) return "Nothing is posted until there is a URL here.";
  if (!DISCORD_WEBHOOK.test(url)) return "This isn't a Discord webhook URL, so the post may never arrive.";
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
