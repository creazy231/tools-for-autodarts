<template>
  <div>
    <!-- Confirmation Dialog -->
    <ConfirmDialog
      @confirm="confirmDialogConfirm"
      @cancel="confirmDialogCancel"
      :show="confirmDialog.show"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-text="confirmDialog.confirmText"
      :cancel-text="confirmDialog.cancelText"
    />

    <!-- Notification -->
    <AppNotification
      @close="hideNotification"
      :show="notification.show"
      :message="notification.message"
      :type="notification.type"
    />

    <div class="mx-auto mb-16 max-w-[1366px] space-y-8">
      <div class="space-y-4">
        <div class="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div class="flex items-center">
            <AppButton
              @click="goBack()"
              class="mr-4 aspect-square size-10 p-0"
            >
              <span class="icon-[pixelarticons--arrow-left]" />
            </AppButton>
            <h1 class="text-xl font-bold sm:text-2xl md:text-3xl">
              Autodarts Tools
            </h1>
          </div>
          <div class="mt-2 grid grid-cols-2 items-center gap-2 sm:mt-0 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <AppButton
              @click="exportSettings"
              title="Download settings as file"
            >
              <span class="icon-[pixelarticons--calendar-export] mr-2" />
              <span>Export</span>
            </AppButton>
            <AppButton
              @click="importSettings"
              title="Import settings from file"
            >
              <span class="icon-[pixelarticons--calendar-import] mr-2" />
              <span>Import</span>
            </AppButton>
            <AppButton
              @click="copyToClipboard"
              title="Copy settings to clipboard"
            >
              <span class="icon-[pixelarticons--copy] mr-2" />
              <span>Copy</span>
            </AppButton>
            <AppButton
              @click="pasteFromClipboard"
              title="Paste settings from clipboard"
            >
              <span class="icon-[pixelarticons--calendar-import] mr-2" />
              <span>Paste</span>
            </AppButton>
            <AppButton
              @click="toggleDangerZone"
              title="Advanced settings"
              class="aspect-square size-10 p-0"
            >
              <span class="icon-[material-symbols--settings-suggest-outline]" />
            </AppButton>
            <input @change="handleImportFile" ref="importFileInput" type="file" accept=".json,.txt" class="hidden">
          </div>
        </div>

        <!-- Tabs Component -->
        <AppTabs
          v-if="!showDangerZone"
          v-model="activeTab"
          :tabs="tabs"
        />

        <!-- Danger Zone -->
        <div v-if="showDangerZone" class="adt-container space-y-6">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-red-400">
              Danger Zone
            </h2>
            <AppButton @click="toggleDangerZone" auto class="text-white/70 hover:text-white">
              <span class="icon-[pixelarticons--close]" />
            </AppButton>
          </div>
          <div class="space-y-4">
            <p class="text-white/70">
              These actions are destructive and cannot be undone. Please proceed with caution and may export your settings before proceeding.
            </p>
            <div class="rounded border border-red-500/30 bg-red-500/5 p-4">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-semibold text-red-300">
                    Reset All Settings
                  </h3>
                  <p class="text-sm text-white/60">
                    This will reset all settings to their default values. All your customizations will be lost.
                  </p>
                </div>
                <AppButton
                  @click="resetAllSettings"
                  auto
                  class="border-red-500/30 bg-red-500/20 hover:bg-red-500/40"
                >
                  Reset All Settings
                </AppButton>
              </div>
            </div>
          </div>
        </div>

        <!-- Feature cards and settings grid for Lobbies tab -->
        <div
          v-if="activeTab === 0 && !showDangerZone"
          class="grid grid-cols-1 gap-5 lg:grid-cols-2"
        >
          <!-- First row of feature cards -->
          <DiscordWebhooks class="feature-card" data-feature-index="1" />
          <!-- Settings panel for DiscordWebhooks (only on small screens) -->
          <div v-if="isSettingInGroup(activeSettings, featureGroups[0]) && getComponentForSetting(activeSettings) && activeSettings === 'discord-webhooks'" class="lg:hidden" :data-settings-id="activeSettings">
            <component :is="getComponentForSetting(activeSettings)" />
          </div>
          <AutoStart class="feature-card" data-feature-index="2" />

          <!-- Settings panel for first row (only if active setting has settings) - only on large screens -->
          <div v-if="isSettingInGroup(activeSettings, featureGroups[0]) && getComponentForSetting(activeSettings)" class="hidden lg:col-span-2 lg:block" :data-settings-id="activeSettings">
            <component :is="getComponentForSetting(activeSettings)" />
          </div>

          <!-- Second row of feature cards -->
          <RecentLocalPlayers class="feature-card" data-feature-index="3" />
          <!-- Settings panel for RecentLocalPlayers (only on small screens) -->
          <div v-if="isSettingInGroup(activeSettings, featureGroups[1]) && getComponentForSetting(activeSettings) && activeSettings === 'recent-local-players'" class="lg:hidden" :data-settings-id="activeSettings">
            <component :is="getComponentForSetting(activeSettings)" />
          </div>

          <ShufflePlayers class="feature-card" data-feature-index="4" />

          <!-- Settings panel for second row (only if active setting has settings) - only on large screens -->
          <div v-if="isSettingInGroup(activeSettings, featureGroups[1]) && getComponentForSetting(activeSettings)" class="hidden lg:col-span-2 lg:block" :data-settings-id="activeSettings">
            <component :is="getComponentForSetting(activeSettings)" />
          </div>

          <!-- Third row of feature cards -->
          <TeamLobby class="feature-card" data-feature-index="5" />
          <div class="feature-card" data-feature-index="6">
            <!-- Placeholder for future feature -->
          </div>

          <!-- Settings panel for third row (only if active setting has settings) -->
          <div v-if="isSettingInGroup(activeSettings, featureGroups[2]) && getComponentForSetting(activeSettings)" class="col-span-1 lg:col-span-2" :data-settings-id="activeSettings">
            <component :is="getComponentForSetting(activeSettings)" />
          </div>
        </div>

        <!-- Feature cards and settings grid for Matches tab -->
        <div
          v-if="activeTab === 1 && !showDangerZone"
          class="grid grid-cols-1 gap-5 lg:grid-cols-2"
        >
          <!-- First row of feature cards -->
          <DisableTakeoutRecognition class="feature-card" data-feature-index="7" />
          <Colors class="feature-card" data-feature-index="8" />
          <!-- Settings panel for Colors (only on small screens) -->
          <div v-if="isSettingInGroup(activeSettings, featureGroups[3]) && getComponentForSetting(activeSettings) && activeSettings === 'colors'" class="lg:hidden" :data-settings-id="activeSettings">
            <component :is="getComponentForSetting(activeSettings)" />
          </div>

          <!-- Settings panel for first row (only if active setting has settings) - only on large screens -->
          <div v-if="isSettingInGroup(activeSettings, featureGroups[3]) && getComponentForSetting(activeSettings)" class="hidden lg:col-span-2 lg:block" :data-settings-id="activeSettings">
            <component :is="getComponentForSetting(activeSettings)" />
          </div>

          <!-- Second row of feature cards -->
          <TakeoutNotification class="feature-card" data-feature-index="9" />
          <NextPlayerOnTakeoutStuck class="feature-card" data-feature-index="10" />
          <!-- Settings panel for NextPlayerOnTakeoutStuck (only on small screens) -->
          <div v-if="isSettingInGroup(activeSettings, featureGroups[4]) && getComponentForSetting(activeSettings) && activeSettings === 'next-player-on-takeout-stuck'" class="lg:hidden" :data-settings-id="activeSettings">
            <component :is="getComponentForSetting(activeSettings)" />
          </div>

          <!-- Settings panel for second row (only if active setting has settings) - only on large screens -->
          <div v-if="isSettingInGroup(activeSettings, featureGroups[4]) && getComponentForSetting(activeSettings)" class="hidden lg:col-span-2 lg:block" :data-settings-id="activeSettings">
            <component :is="getComponentForSetting(activeSettings)" />
          </div>

          <!-- Third row of feature cards -->
          <AutomaticNextLeg class="feature-card" data-feature-index="11" />
          <!-- Settings panel for AutomaticNextLeg (only on small screens) -->
          <div v-if="isSettingInGroup(activeSettings, featureGroups[5]) && getComponentForSetting(activeSettings) && activeSettings === 'automatic-next-leg'" class="lg:hidden" :data-settings-id="activeSettings">
            <component :is="getComponentForSetting(activeSettings)" />
          </div>
          <SmallerScores class="feature-card" data-feature-index="12" />

          <!-- Settings panel for third row (only if active setting has settings) - only on large screens -->
          <div v-if="isSettingInGroup(activeSettings, featureGroups[5]) && getComponentForSetting(activeSettings)" class="hidden lg:col-span-2 lg:block" :data-settings-id="activeSettings">
            <component :is="getComponentForSetting(activeSettings)" />
          </div>

          <!-- Fourth row of feature cards -->
          <HideMenuInMatch class="feature-card" data-feature-index="13" />
          <StreamingMode class="feature-card" data-feature-index="14" />
          <!-- Settings panel for StreamingMode (only on small screens) -->
          <div v-if="isSettingInGroup(activeSettings, featureGroups[6]) && getComponentForSetting(activeSettings) && activeSettings === 'streaming-mode'" class="lg:hidden" :data-settings-id="activeSettings">
            <component :is="getComponentForSetting(activeSettings)" />
          </div>

          <!-- Settings panel for fourth row (only if active setting has settings) - only on large screens -->
          <div v-if="isSettingInGroup(activeSettings, featureGroups[6]) && getComponentForSetting(activeSettings)" class="hidden lg:col-span-2 lg:block" :data-settings-id="activeSettings">
            <component :is="getComponentForSetting(activeSettings)" />
          </div>

          <!-- Fifth row of feature cards -->
          <LargerLegsSets class="feature-card" data-feature-index="15" />
          <!-- Settings panel for LargerLegsSets (only on small screens) -->
          <div v-if="isSettingInGroup(activeSettings, featureGroups[7]) && getComponentForSetting(activeSettings) && activeSettings === 'larger-legs-sets'" class="lg:hidden" :data-settings-id="activeSettings">
            <component :is="getComponentForSetting(activeSettings)" />
          </div>
          <LargerPlayerMatchData class="feature-card" data-feature-index="16" />
          <!-- Settings panel for LargerPlayerMatchData (only on small screens) -->
          <div v-if="isSettingInGroup(activeSettings, featureGroups[7]) && getComponentForSetting(activeSettings) && activeSettings === 'larger-player-match-data'" class="lg:hidden" :data-settings-id="activeSettings">
            <component :is="getComponentForSetting(activeSettings)" />
          </div>

          <!-- Settings panel for fifth row (only if active setting has settings) - only on large screens -->
          <div v-if="isSettingInGroup(activeSettings, featureGroups[7]) && getComponentForSetting(activeSettings)" class="hidden lg:col-span-2 lg:block" :data-settings-id="activeSettings">
            <component :is="getComponentForSetting(activeSettings)" />
          </div>

          <!-- Sixth row of feature cards -->
          <WinnerAnimation class="feature-card" data-feature-index="17" />
          <ShowThrownDarts class="feature-card" data-feature-index="18" />

          <!-- Settings panel for sixth row (only if active setting has settings) -->
          <div v-if="isSettingInGroup(activeSettings, featureGroups[8]) && getComponentForSetting(activeSettings)" class="col-span-1 lg:col-span-2" :data-settings-id="activeSettings">
            <component :is="getComponentForSetting(activeSettings)" />
          </div>

          <!-- Seventh row of feature cards -->
          <AutomaticNextPlayerAfter3Darts class="feature-card" data-feature-index="19" />
          <Ring class="feature-card" data-feature-index="20" />
          <!-- Settings panel for Ring (only on small screens) -->
          <div v-if="isSettingInGroup(activeSettings, featureGroups[9]) && getComponentForSetting(activeSettings) && activeSettings === 'ring'" class="lg:hidden" :data-settings-id="activeSettings">
            <component :is="getComponentForSetting(activeSettings)" />
          </div>

          <!-- Settings panel for seventh row (only if active setting has settings) - only on large screens -->
          <div v-if="isSettingInGroup(activeSettings, featureGroups[9]) && getComponentForSetting(activeSettings)" class="hidden lg:col-span-2 lg:block" :data-settings-id="activeSettings">
            <component :is="getComponentForSetting(activeSettings)" />
          </div>
        </div>

        <!-- Feature cards and settings grid for Boards tab -->
        <div
          v-if="activeTab === 2 && !showDangerZone"
          class="grid grid-cols-1 gap-5 lg:grid-cols-2"
        >
          <!-- First row of feature cards -->
          <ExternalBoards class="feature-card" data-feature-index="21" />
          <div class="feature-card" data-feature-index="22">
            <!-- Placeholder for future feature -->
          </div>

          <!-- Settings panel for first row (only if active setting has settings) -->
          <div v-if="isSettingInGroup(activeSettings, featureGroups[10]) && getComponentForSetting(activeSettings)" class="col-span-1 lg:col-span-2" :data-settings-id="activeSettings">
            <component :is="getComponentForSetting(activeSettings)" />
          </div>
        </div>

        <div
          v-if="activeTab === 3 && config && !showDangerZone"
        >
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="col-span-1 space-y-4 rounded border border-white/10 p-4 md:col-span-2">
              <div>
                <h2 class="text-lg font-semibold">
                  Caller
                </h2>
                <p class="max-w-2xl text-white/40">
                  Adds a caller.
                </p>
              </div>
              <div class="grid grid-cols-[5rem_auto_50px] items-center gap-4">
                <AppToggle v-model="config.caller.enabled" />
                <div />
                <button
                  @click="callerConfig = defaultCallerConfig"
                  v-if="config.caller.enabled"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                >
                  <span class="icon-[pixelarticons--reload] -scale-x-100 text-xl" />
                </button>
              </div>
              <div v-if="config.caller.enabled && callerConfig">
                <div class="grid gap-4">
                  <div
                    v-for="(_, index) in callerConfig.caller"
                    :key="index"
                    class="grid items-center gap-4 lg:grid-cols-[5rem_50px_2fr_5fr_1fr_1fr_50px_50px] lg:grid-rows-1"
                  >
                    <div>Caller {{ index + 1 }}</div>
                    <button
                      @click="setActive(index)"
                      :disabled="!callerConfig.caller[index].url"
                      :class="twMerge(
                        'flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10',
                        !callerConfig.caller[index].url && 'bg-white/2 hover:bg-white/2',
                        callerConfig.caller[index].isActive && 'border-cyan-600 bg-cyan-600',
                      )"
                    >
                      <span
                        class="icon-[pixelarticons--check] text-xl"
                        :class="twMerge(!callerConfig.caller[index].url && 'text-white/30')"
                      />
                    </button>
                    <input
                      v-model="callerConfig.caller[index].name"
                      type="text"
                      placeholder="Name (optional)"
                      class="w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none"
                    >
                    <input
                      v-model="callerConfig.caller[index].url"
                      type="text"
                      placeholder="URL of folder with caller sound files"
                      class="w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none"
                    >
                    <div>
                      <span>[filename]</span>
                    </div>
                    <input
                      v-model="callerConfig.caller[index].fileExt"
                      type="text"
                      placeholder=".mp3"
                      class="w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none"
                    >
                    <button
                      @click="playCallerSound(index)"
                      :disabled="!callerConfig.caller[index].url"
                      :class="twMerge(
                        'flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10',
                        !callerConfig.caller[index].url && 'bg-white/2 hover:bg-white/2',
                      )"
                    >
                      <span
                        class="icon-[pixelarticons--play] text-xl"
                        :class="twMerge(!callerConfig.caller[index].url && 'text-white/30')"
                      />
                    </button>
                    <button
                      @click="callerConfig.caller.splice(index, 1)"
                      class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                    >
                      <span class="icon-[pixelarticons--trash] text-lg" />
                    </button>
                  </div>

                  <div class="grid items-center gap-4 lg:grid-cols-[5rem_2fr_5fr_1fr_1fr_50px_50px] lg:grid-rows-1">
                    <button
                      @click="callerConfig.caller.push({ url: '' })"
                      class="flex flex-nowrap items-center  justify-center rounded-md border border-white/10 bg-white/5 p-2 outline-none"
                    >
                      <span class="icon-[pixelarticons--plus]" />
                    </button>
                    <div />
                    <div />
                    <div class="col-span-5 text-white/40">
                      [filename] => 0-180, 'gameshot', 'gameshot and the match'
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-span-1 space-y-4 rounded border border-white/10 p-4 md:col-span-2">
              <div>
                <h2 class="text-lg font-semibold">
                  Sounds
                </h2>
              </div>
              <div class="grid grid-cols-[5rem_auto_50px] items-center gap-4">
                <AppToggle v-model="config.sounds.enabled" />
                <div />
                <button
                  @click="soundsConfig = defaultSoundsConfig"
                  v-if="config.sounds.enabled"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                >
                  <span class="icon-[pixelarticons--reload] -scale-x-100 text-xl" />
                </button>
              </div>
              <div v-if="config.sounds.enabled && soundsConfig" class="grid gap-4">
                <div class="grid items-center gap-4 lg:grid-cols-[5rem_auto_50px_50px_50px_50px] lg:grid-rows-1">
                  <div>Triple</div>
                  <input
                    v-model="soundsConfig.T.info"
                    type="text"
                    :disabled="!!soundsConfig.T.data"
                    :class="twMerge(
                      'w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none',
                      !!soundsConfig.T.data && 'text-white/40',
                    )"
                  >
                  <button
                    @click="playSound('T')"
                    title="Play sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--play] text-xl" />
                  </button>
                  <button
                    @click="handleSoundUpload('T')"
                    title="Upload sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--upload] text-lg" />
                  </button>
                  <button
                    @click="handleSoundReset('T')"
                    title="Reset sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--reload] -scale-x-100 text-xl" />
                  </button>
                  <button
                    @click="handleSoundRemove('T')"
                    title="Remove sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--trash] text-lg" />
                  </button>
                </div>
                <div
                  v-for="tripleCount in tripleCountArr"
                  :key="tripleCount"
                  class="grid items-center gap-4 lg:grid-cols-[5rem_auto_50px_50px_50px_50px] lg:grid-rows-1"
                >
                  <div>T{{ tripleCount }}</div>
                  <input
                    v-model="soundsConfig[`T${tripleCount}`].info"
                    type="text"
                    :disabled="!!soundsConfig[`T${tripleCount}`].data"
                    :class="twMerge(
                      'w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none',
                      !!soundsConfig[`T${tripleCount}`].data && 'text-white/40',
                    )"
                  >
                  <button
                    @click="playSound(`T${tripleCount}`)"
                    title="Play sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--play] text-xl" />
                  </button>
                  <button
                    @click="handleSoundUpload(`T${tripleCount}`)"
                    title="Upload sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--upload] text-lg" />
                  </button>
                  <button
                    @click="handleSoundReset(`T${tripleCount}`)"
                    title="Reset sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--reload] -scale-x-100 text-xl" />
                  </button>
                  <button
                    @click="handleSoundRemove(`T${tripleCount}`)"
                    title="Remove sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--trash] text-lg" />
                  </button>
                </div>
                <div class="grid items-center gap-4 lg:grid-cols-[5rem_auto_50px_50px_50px_50px] lg:grid-rows-1">
                  <div>Bull</div>
                  <input
                    v-model="soundsConfig.bull.info"
                    type="text"
                    :disabled="!!soundsConfig.bull.data"
                    :class="twMerge(
                      'w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none',
                      !!soundsConfig.bull.data && 'text-white/40',
                    )"
                  >
                  <button
                    @click="playSound('bull')"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--play] text-xl" />
                  </button>
                  <button
                    @click="handleSoundUpload('bull')"
                    title="Upload sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--upload] text-lg" />
                  </button>
                  <button
                    @click="handleSoundReset('bull')"
                    title="Reset sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--reload] -scale-x-100 text-xl" />
                  </button>
                  <button
                    @click="handleSoundRemove('bull')"
                    title="Remove sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--trash] text-lg" />
                  </button>
                </div>
                <div class="grid items-center gap-4 lg:grid-cols-[5rem_auto_50px_50px_50px_50px] lg:grid-rows-1">
                  <div>Bust</div>
                  <input
                    v-model="soundsConfig.bust.info"
                    type="text"
                    :disabled="!!soundsConfig.bust.data"
                    :class="twMerge(
                      'w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none',
                      !!soundsConfig.bust.data && 'text-white/40',
                    )"
                  >
                  <button
                    @click="playSound('bust')"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--play] text-xl" />
                  </button>
                  <button
                    @click="handleSoundUpload('bust')"
                    title="Upload sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--upload] text-lg" />
                  </button>
                  <button
                    @click="handleSoundReset('bust')"
                    title="Reset sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--reload] -scale-x-100 text-xl" />
                  </button>
                  <button
                    @click="handleSoundRemove('bust')"
                    title="Remove sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--trash] text-lg" />
                  </button>
                </div>
                <div class="grid items-center gap-4 lg:grid-cols-[5rem_auto_50px_50px_50px_50px] lg:grid-rows-1">
                  <div>Breakfast</div>
                  <input
                    v-model="soundsConfig.breakfast.info"
                    type="text"
                    :disabled="!!soundsConfig.breakfast.data"
                    :class="twMerge(
                      'w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none',
                      !!soundsConfig.breakfast.data && 'text-white/40',
                    )"
                  >
                  <button
                    @click="playSound('breakfast')"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--play] text-xl" />
                  </button>
                  <button
                    @click="handleSoundUpload('breakfast')"
                    title="Upload sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--upload] text-lg" />
                  </button>
                  <button
                    @click="handleSoundReset('breakfast')"
                    title="Reset sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--reload] -scale-x-100 text-xl" />
                  </button>
                  <button
                    @click="handleSoundRemove('breakfast')"
                    title="Remove sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--trash] text-lg" />
                  </button>
                </div>

                <div class="grid items-center gap-4 lg:grid-cols-[7rem_auto_50px_50px_50px_50px] lg:grid-rows-1">
                  <div>Game on!</div>
                  <input
                    v-model="soundsConfig.gameOn.info"
                    placeholder="sound to play when the game starts"
                    type="text"
                    :disabled="!!soundsConfig.gameOn.data"
                    :class="twMerge(
                      'w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none',
                      !!soundsConfig.gameOn.data && 'text-white/40',
                    )"
                  >
                  <button
                    @click="playSound('gameOn')"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--play] text-xl" />
                  </button>
                  <button
                    @click="handleSoundUpload('gameOn')"
                    title="Upload sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--upload] text-lg" />
                  </button>
                  <button
                    @click="handleSoundReset('gameOn')"
                    title="Reset sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--reload] -scale-x-100 text-xl" />
                  </button>
                  <button
                    @click="handleSoundRemove('gameOn')"
                    title="Remove sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--trash] text-lg" />
                  </button>
                </div>

                <div class="grid items-center gap-4 lg:grid-cols-[7rem_auto_50px_50px_50px_50px] lg:grid-rows-1">
                  <div>Ready. Throw!</div>
                  <input
                    v-model="soundsConfig.playerStart.info"
                    placeholder="sound to play when it's time to throw"
                    type="text"
                    :disabled="!!soundsConfig.playerStart.data"
                    :class="twMerge(
                      'w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none',
                      !!soundsConfig.playerStart.data && 'text-white/40',
                    )"
                  >
                  <button
                    @click="playSound('playerStart')"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--play] text-xl" />
                  </button>
                  <button
                    @click="handleSoundUpload('playerStart')"
                    title="Upload sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--upload] text-lg" />
                  </button>
                  <button
                    @click="handleSoundReset('playerStart')"
                    title="Reset sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--reload] -scale-x-100 text-xl" />
                  </button>
                  <button
                    @click="handleSoundRemove('playerStart')"
                    title="Remove sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--trash] text-lg" />
                  </button>
                </div>

                <div class="mt-1.5">
                  <span class="font-semibold">
                    Miss sounds
                  </span>
                  <span class="text-white/40">
                    &nbsp;(random)
                  </span>
                </div>
                <div
                  v-for="(_, index) in soundsConfig.miss"
                  :key="index"
                  class="grid items-center gap-4 lg:grid-cols-[5rem_auto_50px_50px_50px_50px] lg:grid-rows-1"
                >
                  <div>Miss {{ index + 1 }}</div>
                  <input
                    v-model="soundsConfig.miss[index].info"
                    type="text"
                    :disabled="!!soundsConfig.miss[index].data"
                    :class="twMerge(
                      'w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none',
                      !!soundsConfig.miss[index].data && 'text-white/40',
                    )"
                  >
                  <button
                    @click="playSound('miss', 1, index)"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--play] text-xl" />
                  </button>
                  <button
                    @click="handleSoundUpload('miss', index)"
                    title="Upload sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--upload] text-lg" />
                  </button>
                  <button
                    @click="handleSoundReset('miss', index)"
                    v-if="index <= 2"
                    title="Reset sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--reload] -scale-x-100 text-xl" />
                  </button>
                  <div v-else />
                  <button
                    @click="soundsConfig.miss.splice(index, 1)"
                    title="Remove sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--trash] text-lg" />
                  </button>
                </div>
                <div class="grid items-center gap-4 lg:grid-cols-[50px_auto] lg:grid-rows-1">
                  <button
                    @click="soundsConfig.miss.push({ info: '' })"
                    class="flex flex-nowrap items-center  justify-center rounded-md border border-white/10 bg-white/5 p-2 outline-none"
                  >
                    <span class="icon-[pixelarticons--plus]" />
                  </button>
                </div>
                <div class="mt-1.5">
                  <span class="font-semibold">Bot throw sound</span>
                </div>
                <div class="grid items-center gap-4 lg:grid-cols-[5rem_auto_50px_50px_50px_50px] lg:grid-rows-1">
                  <div>Hit</div>
                  <input
                    v-model="soundsConfig.bot.info"
                    type="text"
                    :disabled="!!soundsConfig.bot.data"
                    :class="twMerge(
                      'w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none',
                      !!soundsConfig.bot.data && 'text-white/40',
                    )"
                  >
                  <button
                    @click="playSound('bot')"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--play] text-xl" />
                  </button>
                  <button
                    @click="handleSoundUpload('bot')"
                    title="Upload sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--upload] text-lg" />
                  </button>
                  <button
                    @click="handleSoundReset('bot')"
                    title="Reset sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--reload] -scale-x-100 text-xl" />
                  </button>
                  <button
                    @click="handleSoundRemove('bot')"
                    title="Remove sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--trash] text-lg" />
                  </button>
                </div>
                <div class="grid items-center gap-4 lg:grid-cols-[5rem_auto_50px_50px_50px_50px] lg:grid-rows-1">
                  <div>Miss</div>
                  <input
                    v-model="soundsConfig.botOutside.info"
                    type="text"
                    :disabled="!!soundsConfig.botOutside.data"
                    :class="twMerge(
                      'w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none',
                      !!soundsConfig.botOutside.data && 'text-white/40',
                    )"
                  >
                  <button
                    @click="playSound('botOutside')"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--play] text-xl" />
                  </button>
                  <button
                    @click="handleSoundUpload('botOutside')"
                    title="Upload sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--upload] text-lg" />
                  </button>
                  <button
                    @click="handleSoundReset('botOutside')"
                    title="Reset sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--reload] -scale-x-100 text-xl" />
                  </button>
                  <button
                    @click="handleSoundRemove('botOutside')"
                    title="Remove sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--trash] text-lg" />
                  </button>
                </div>
                <div class="mt-1.5">
                  <span class="font-semibold">Cricket sounds</span>
                </div>
                <div class="grid items-center gap-4 lg:grid-cols-[5rem_auto_50px_50px_50px_50px] lg:grid-rows-1">
                  <div>Hit</div>
                  <input
                    v-model="soundsConfig.cricketHit.info"
                    type="text"
                    :disabled="!!soundsConfig.cricketHit.data"
                    :class="twMerge(
                      'w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none',
                      !!soundsConfig.cricketHit.data && 'text-white/40',
                    )"
                  >
                  <button
                    @click="playSound('cricketHit')"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--play] text-xl" />
                  </button>
                  <button
                    @click="handleSoundUpload('cricketHit')"
                    title="Upload sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--upload] text-lg" />
                  </button>
                  <button
                    @click="handleSoundReset('cricketHit')"
                    title="Reset sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--reload] -scale-x-100 text-xl" />
                  </button>
                  <button
                    @click="handleSoundRemove('cricketHit')"
                    title="Remove sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--trash] text-lg" />
                  </button>
                </div>
                <div class="grid items-center gap-4 lg:grid-cols-[5rem_auto_50px_50px_50px_50px] lg:grid-rows-1">
                  <div>Miss</div>
                  <input
                    v-model="soundsConfig.cricketMiss.info"
                    type="text"
                    :disabled="!!soundsConfig.cricketMiss.data"
                    :class="twMerge(
                      'w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none',
                      !!soundsConfig.cricketMiss.data && 'text-white/40',
                    )"
                  >
                  <button
                    @click="playSound('cricketMiss')"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--play] text-xl" />
                  </button>
                  <button
                    @click="handleSoundUpload('cricketMiss')"
                    title="Upload sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--upload] text-lg" />
                  </button>
                  <button
                    @click="handleSoundReset('cricketMiss')"
                    title="Reset sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--reload] -scale-x-100 text-xl" />
                  </button>
                  <button
                    @click="handleSoundRemove('cricketMiss')"
                    title="Remove sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--trash] text-lg" />
                  </button>
                </div>
                <div class="mt-1.5">
                  <span class="font-semibold">Winner sounds</span>
                </div>
                <div
                  v-for="(_, index) in soundsConfig.winner.slice(1)"
                  :key="index"
                  class="grid items-center gap-4 lg:grid-cols-[200px_auto_50px_50px_50px_50px] lg:grid-rows-1"
                >
                  <input
                    v-model="soundsConfig.winner[index + 1].name"
                    placeholder="Player name"
                    type="text"
                    class="w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none"
                  >
                  <input
                    v-model="soundsConfig.winner[index + 1].info"
                    placeholder="URL of sound file"
                    type="text"
                    :disabled="!!soundsConfig.winner[index + 1].data"
                    :class="twMerge(
                      'w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none',
                      !!soundsConfig.winner[index + 1].data && 'text-white/40',
                    )"
                  >
                  <button
                    @click="playSound('winner', 1, index + 1)"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--play] text-xl" />
                  </button>
                  <button
                    @click="handleSoundUpload('winner', index + 1)"
                    title="Upload sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--upload] text-lg" />
                  </button>
                  <div />
                  <button
                    @click="soundsConfig.winner.splice(index + 1, 1)"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--trash] text-lg" />
                  </button>
                </div>
                <div class="grid items-center gap-4 lg:grid-cols-[200px_auto_50px_50px_50px_50px] lg:grid-rows-1">
                  <div>Fallback</div>
                  <input
                    v-model="soundsConfig.winner[0].info"
                    type="text"
                    :disabled="!!soundsConfig.winner[0].data"
                    :class="twMerge(
                      'w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none',
                      !!soundsConfig.winner[0].data && 'text-white/40',
                    )"
                  >
                  <button
                    @click="playSound('winner', 1, 0)"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--play] text-xl" />
                  </button>
                  <button
                    @click="handleSoundUpload('winner', 0)"
                    title="Upload sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--upload] text-lg" />
                  </button>
                  <button
                    @click="handleSoundReset('winner', 0)"
                    title="Reset sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                  >
                    <span class="icon-[pixelarticons--reload] -scale-x-100 text-xl" />
                  </button>
                  <button
                    @click="handleSoundRemove('winner', 0)"
                    title="Remove sound"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--trash] text-lg" />
                  </button>
                </div>

                <div class="grid items-center gap-4 lg:grid-cols-[50px_138px_300px_50px_auto] lg:grid-rows-1">
                  <button
                    @click="soundsConfig.winner.push({ name: '', info: '' })"
                    class="flex flex-nowrap items-center  justify-center rounded-md border border-white/10 bg-white/5 p-2 outline-none"
                  >
                    <span class="icon-[pixelarticons--plus]" />
                  </button>
                  <div />
                  <div>Play winner sound after every leg</div>
                  <AppToggle v-model="winnerSoundOnLegWin" />
                </div>
              </div>
            </div>
            <div class="col-span-1 space-y-4 rounded border border-white/10 p-4 md:col-span-2">
              <div>
                <h2 class="text-lg font-semibold">
                  Animations
                </h2>
              </div>
              <div class="grid grid-cols-[5rem_auto_50px] items-center gap-4">
                <AppToggle v-model="config.animations.enabled" />
                <div />
                <button
                  @click="config.animations = defaultConfig.animations"
                  v-if="config.animations.enabled"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                >
                  <span class="icon-[pixelarticons--reload] -scale-x-100 text-xl" />
                </button>
              </div>
              <div v-if="config.animations.enabled" class="grid gap-4">
                <div>Start delay</div>
                <input
                  v-model="config.animations.startDelay"
                  placeholder="Time in seconds"
                  type="number"
                  :class="twMerge(
                    'w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none',
                    !!config.animations.startDelay && 'text-white/40',
                  )"
                >
                <div>End delay</div>
                <input
                  v-model="config.animations.endDelay"
                  placeholder="Time in seconds"
                  type="number"
                  :class="twMerge(
                    'w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none',
                    !!config.animations.startDelay && 'text-white/40',
                  )"
                >
                <div>Image fit</div>
                <select
                  v-model="config.animations.objectFit"
                  :class="twMerge(
                    'w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none',
                  )"
                >
                  <option value="cover">
                    Cover (fill screen, may crop)
                  </option>
                  <option value="contain">
                    Contain (show full image)
                  </option>
                </select>
                <div class="mt-1.5">
                  <span class="font-semibold">Winner animations</span>
                </div>
                <div
                  v-for="(animation, index) in config.animations.winner"
                  :key="index"
                  class="grid items-center gap-4 lg:grid-cols-[200px_auto_50px] lg:grid-rows-1"
                >
                  <img :src="animation.info">
                  <input
                    v-model="animation.info"
                    placeholder="URL of gif file"
                    type="text"
                    :disabled="!!animation.data"
                    :class="twMerge(
                      'w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none',
                      !!animation.data && 'text-white/40',
                    )"
                  >
                  <button
                    @click="config.animations.winner.splice(index, 1)"
                    class="flex h-10 flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--trash] text-lg" />
                  </button>
                </div>
                <div class="grid items-center gap-4 lg:grid-cols-[50px_138px_300px_50px_auto] lg:grid-rows-1">
                  <button
                    @click="config.animations.winner.push({ info: '' })"
                    class="flex flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 p-2 outline-none"
                  >
                    <span class="icon-[pixelarticons--plus]" />
                  </button>
                  <div />
                </div>
              </div>
              <div v-if="config.animations.enabled" class="grid gap-4">
                <div class="mt-1.5">
                  <span class="font-semibold">Bull animations</span>
                </div>
                <div
                  v-for="(animation, index) in config.animations.bull"
                  :key="index"
                  class="grid items-center gap-4 lg:grid-cols-[200px_auto_50px] lg:grid-rows-1"
                >
                  <img :src="animation.info">
                  <input
                    v-model="animation.info"
                    placeholder="URL of gif file"
                    type="text"
                    :disabled="!!animation.data"
                    :class="twMerge(
                      'w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none',
                      !!animation.data && 'text-white/40',
                    )"
                  >
                  <button
                    @click="config.animations.bull.splice(index, 1)"
                    class="flex h-10 flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--trash] text-lg" />
                  </button>
                </div>
                <div class="grid items-center gap-4 lg:grid-cols-[50px_138px_300px_50px_auto] lg:grid-rows-1">
                  <button
                    @click="config.animations.bull.push({ info: '' })"
                    class="flex flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 p-2 outline-none"
                  >
                    <span class="icon-[pixelarticons--plus]" />
                  </button>
                  <div />
                </div>
              </div>
              <div v-if="config.animations.enabled" class="grid gap-4">
                <div class="mt-1.5">
                  <span class="font-semibold">180 animations</span>
                </div>
                <div
                  v-for="(animation, index) in config.animations.oneEighty"
                  :key="index"
                  class="grid items-center gap-4 lg:grid-cols-[200px_auto_50px] lg:grid-rows-1"
                >
                  <img :src="animation.info">
                  <input
                    v-model="animation.info"
                    placeholder="URL of gif file"
                    type="text"
                    :disabled="!!animation.data"
                    :class="twMerge(
                      'w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none',
                      !!animation.data && 'text-white/40',
                    )"
                  >
                  <button
                    @click="config.animations.oneEighty.splice(index, 1)"
                    class="flex h-10 flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--trash] text-lg" />
                  </button>
                </div>
                <div class="grid items-center gap-4 lg:grid-cols-[50px_138px_300px_50px_auto] lg:grid-rows-1">
                  <button
                    @click="config.animations.oneEighty.push({ info: '' })"
                    class="flex flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 p-2 outline-none"
                  >
                    <span class="icon-[pixelarticons--plus]" />
                  </button>
                  <div />
                </div>
              </div>
              <div v-if="config.animations.enabled" class="grid gap-4">
                <div class="mt-1.5">
                  <span class="font-semibold">Miss animations</span>
                </div>
                <div
                  v-for="(animation, index) in config.animations.miss"
                  :key="index"
                  class="grid items-center gap-4 lg:grid-cols-[200px_auto_50px] lg:grid-rows-1"
                >
                  <img :src="animation.info">
                  <input
                    v-model="animation.info"
                    placeholder="URL of gif file"
                    type="text"
                    :disabled="!!animation.data"
                    :class="twMerge(
                      'w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none',
                      !!animation.data && 'text-white/40',
                    )"
                  >
                  <button
                    @click="config.animations.miss.splice(index, 1)"
                    class="flex h-10 flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--trash] text-lg" />
                  </button>
                </div>
                <div class="grid items-center gap-4 lg:grid-cols-[50px_138px_300px_50px_auto] lg:grid-rows-1">
                  <button
                    @click="config.animations.miss.push({ info: '' })"
                    class="flex flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 p-2 outline-none"
                  >
                    <span class="icon-[pixelarticons--plus]" />
                  </button>
                  <div />
                </div>
              </div>
              <div v-if="config.animations.enabled" class="grid gap-4">
                <div class="mt-1.5">
                  <span class="font-semibold">Bust animations</span>
                </div>
                <div
                  v-for="(animation, index) in config.animations.bust"
                  :key="index"
                  class="grid items-center gap-4 lg:grid-cols-[200px_auto_50px] lg:grid-rows-1"
                >
                  <img :src="animation.info">
                  <input
                    v-model="animation.info"
                    placeholder="URL of gif file"
                    type="text"
                    :disabled="!!animation.data"
                    :class="twMerge(
                      'w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none',
                      !!animation.data && 'text-white/40',
                    )"
                  >
                  <button
                    @click="config.animations.bust.splice(index, 1)"
                    class="flex h-10 flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[pixelarticons--trash] text-lg" />
                  </button>
                </div>
                <div class="grid items-center gap-4 lg:grid-cols-[50px_138px_300px_50px_auto] lg:grid-rows-1">
                  <button
                    @click="config.animations.bust.push({ info: '' })"
                    class="flex flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 p-2 outline-none"
                  >
                    <span class="icon-[pixelarticons--plus]" />
                  </button>
                  <div />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { twMerge } from "tailwind-merge";
import { useStorage } from "@vueuse/core";
import DiscordWebhooks from "./Settings/DiscordWebhooks.vue";
import AutoStart from "./Settings/AutoStart.vue";
import RecentLocalPlayers from "./Settings/RecentLocalPlayers.vue";
import ShufflePlayers from "./Settings/ShufflePlayers.vue";
import TeamLobby from "./Settings/TeamLobby.vue";
import DisableTakeoutRecognition from "./Settings/DisableTakeoutRecognition.vue";
import Colors from "./Settings/Colors.vue";
import TakeoutNotification from "./Settings/TakeoutNotification.vue";
import NextPlayerOnTakeoutStuck from "./Settings/NextPlayerOnTakeoutStuck.vue";
import AutomaticNextLeg from "./Settings/AutomaticNextLeg.vue";
import SmallerScores from "./Settings/SmallerScores.vue";
import StreamingMode from "./Settings/StreamingMode.vue";
import HideMenuInMatch from "./Settings/HideMenuInMatch.vue";
import LargerLegsSets from "./Settings/LargerLegsSets.vue";
import LargerPlayerMatchData from "./Settings/LargerPlayerMatchData.vue";
import WinnerAnimation from "./Settings/WinnerAnimation.vue";
import ShowThrownDarts from "./Settings/ShowThrownDarts.vue";
import AutomaticNextPlayerAfter3Darts from "./Settings/AutomaticNextPlayerAfter3Darts.vue";
import Ring from "./Settings/Ring.vue";
import ExternalBoards from "@/components/Settings/ExternalBoards.vue";
import AppToggle from "@/components/AppToggle.vue";
import type { IConfig } from "@/utils/storage";
import type { ICallerConfig } from "@/utils/callerStorage";
import { AutodartsToolsConfig, defaultConfig } from "@/utils/storage";
import AppButton from "@/components/AppButton.vue";
import { AutodartsToolsCallerConfig, defaultCallerConfig } from "@/utils/callerStorage";
import type { ISoundsConfig, TSoundData } from "@/utils/soundsStorage";
import { AutodartsToolsSoundsConfig, defaultSoundsConfig } from "@/utils/soundsStorage";
import { playPointsSound, playSound } from "@/utils/playSound";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import AppNotification from "@/components/AppNotification.vue";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { useNotification } from "@/composables/useNotification";
import AppTabs from "@/components/AppTabs.vue";

// Define feature groups
const featureGroups = [
  {
    // First row - Lobbies tab
    id: "row1",
    tab: 0,
    features: [
      { id: "discord-webhooks", component: DiscordWebhooks, hasSettings: true },
      { id: "auto-start", component: AutoStart, hasSettings: false },
    ],
    settingIds: [ "discord-webhooks" ],
  },
  {
    // Second row - Lobbies tab
    id: "row2",
    tab: 0,
    features: [
      { id: "recent-local-players", component: RecentLocalPlayers, hasSettings: true },
      { id: "shuffle-players", component: ShufflePlayers, hasSettings: false },
    ],
    settingIds: [ "recent-local-players" ],
  },
  {
    // Third row - Lobbies tab
    id: "row3",
    tab: 0,
    features: [
      { id: "team-lobby", component: TeamLobby, hasSettings: false },
      { id: "placeholder", component: null, hasSettings: false }, // Placeholder for future feature
    ],
    settingIds: [],
  },
  {
    // First row - Matches tab
    id: "matches-row1",
    tab: 1,
    features: [
      { id: "disable-takeout-recognition", component: DisableTakeoutRecognition, hasSettings: false },
      { id: "colors", component: Colors, hasSettings: true },
    ],
    settingIds: [ "colors" ],
  },
  {
    // Second row - Matches tab
    id: "matches-row2",
    tab: 1,
    features: [
      { id: "takeout-notification", component: TakeoutNotification, hasSettings: false },
      { id: "next-player-on-takeout-stuck", component: NextPlayerOnTakeoutStuck, hasSettings: true },
    ],
    settingIds: [ "next-player-on-takeout-stuck" ],
  },
  {
    // Third row - Matches tab
    id: "matches-row3",
    tab: 1,
    features: [
      { id: "automatic-next-leg", component: AutomaticNextLeg, hasSettings: true },
      { id: "smaller-scores", component: SmallerScores, hasSettings: false },
    ],
    settingIds: [ "automatic-next-leg" ],
  },
  {
    // Fourth row - Matches tab
    id: "matches-row4",
    tab: 1,
    features: [
      { id: "hide-menu-in-match", component: HideMenuInMatch, hasSettings: false },
      { id: "streaming-mode", component: StreamingMode, hasSettings: true },
    ],
    settingIds: [ "streaming-mode" ],
  },
  {
    // Fifth row - Matches tab
    id: "matches-row5",
    tab: 1,
    features: [
      { id: "larger-legs-sets", component: LargerLegsSets, hasSettings: true },
      { id: "larger-player-match-data", component: LargerPlayerMatchData, hasSettings: true },
    ],
    settingIds: [ "larger-legs-sets", "larger-player-match-data" ],
  },
  {
    // Sixth row - Matches tab
    id: "matches-row6",
    tab: 1,
    features: [
      { id: "winner-animation", component: WinnerAnimation, hasSettings: false },
      { id: "show-thrown-darts", component: ShowThrownDarts, hasSettings: false },
    ],
    settingIds: [],
  },
  {
    // Seventh row - Matches tab
    id: "matches-row7",
    tab: 1,
    features: [
      { id: "automatic-next-player-after-3-darts", component: AutomaticNextPlayerAfter3Darts, hasSettings: false },
      { id: "ring", component: Ring, hasSettings: true },
    ],
    settingIds: [ "ring" ],
  },
  {
    // First row - Boards tab
    id: "boards-row1",
    tab: 2,
    features: [
      { id: "external-boards", component: ExternalBoards, hasSettings: false },
      { id: "placeholder", component: null, hasSettings: false }, // Placeholder for future feature
    ],
    settingIds: [],
  },
];

// Tabs component data
const tabs = ref([ "Lobbies", "Matches", "Boards", "Sounds & Animations" ]);
const activeSettings = useStorage("adt:active-settings", "discord-webhooks");
const activeTab = useStorage("adt:active-tab", 0);

// Add refs for settings sections
const settingsSections = ref({});

// Function to check if a setting belongs to a group
function isSettingInGroup(settingId, group) {
  return group.settingIds.includes(settingId) && group.tab === activeTab.value;
}

// Function to get the component for a setting
function getComponentForSetting(settingId) {
  for (const group of featureGroups) {
    if (group.tab === activeTab.value) {
      const feature = group.features.find(f => f.id === settingId && f.hasSettings);
      if (feature) {
        return feature.component;
      }
    }
  }
  return null;
}

const config = ref<IConfig>();
const callerConfig = ref<ICallerConfig>();
const soundsConfig = ref<ISoundsConfig>();
const importFileInput = ref() as Ref<HTMLInputElement>;
const tripleCountArr = [ 15, 16, 17, 18, 19, 20 ];

// Use the composables
const { confirmDialog, showConfirmDialog, confirmDialogConfirm, confirmDialogCancel } = useConfirmDialog();
const { notification, showNotification, hideNotification } = useNotification();

function setActive(index: number) {
  callerConfig?.value?.caller.forEach((caller, i) => {
    caller.isActive = i === index;
  });
}

function playCallerSound(index: number) {
  const caller = callerConfig?.value?.caller[index];
  let callerServerUrl = caller?.url || "";
  if (callerServerUrl.at(-1) !== "/") callerServerUrl += "/";
  const callerFileExt = caller?.fileExt || ".mp3";
  const random = Math.floor(Math.random() * 180).toString();
  playPointsSound(callerServerUrl, callerFileExt, random);
}

function goBack() {
  window.history.back();
  window.history.back();
}

onMounted(async () => {
  config.value = await AutodartsToolsConfig.getValue();
  callerConfig.value = await AutodartsToolsCallerConfig.getValue();
  soundsConfig.value = await AutodartsToolsSoundsConfig.getValue();
});

watch(config, async () => {
  await AutodartsToolsConfig.setValue({
    ...JSON.parse(JSON.stringify(defaultConfig)),
    ...JSON.parse(JSON.stringify(config.value)),
  });
}, { deep: true });

watch(callerConfig, async () => {
  await AutodartsToolsCallerConfig.setValue({
    ...JSON.parse(JSON.stringify(defaultCallerConfig)),
    ...JSON.parse(JSON.stringify(callerConfig.value)),
  });
}, { deep: true });

watch(soundsConfig, async () => {
  await AutodartsToolsSoundsConfig.setValue({
    ...JSON.parse(JSON.stringify(defaultSoundsConfig)),
    ...JSON.parse(JSON.stringify(soundsConfig.value)),
  });
}, { deep: true });

function getSoundConfig(configKey: string, arrIndex?: number): TSoundData | null {
  let soundConfig = soundsConfig.value![configKey];
  if (typeof arrIndex === "number") soundConfig = soundConfig[arrIndex];
  if (!soundConfig) return null;
  return soundConfig;
}

function handleSoundUpload(configKey: string, arrIndex?: number) {
  const soundConfig = getSoundConfig(configKey, arrIndex);
  if (!soundConfig) return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "audio/*";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const fileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      soundConfig.data = reader.result as string;
      soundConfig.info = fileName;
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function handleSoundRemove(configKey: string, arrIndex?: number) {
  const soundConfig = getSoundConfig(configKey, arrIndex);
  if (!soundConfig) return;
  soundConfig.info = "";
  soundConfig.data = "";
}

function handleSoundReset(configKey: string, arrIndex?: number) {
  const soundConfig = getSoundConfig(configKey, arrIndex);
  if (!soundConfig) return;
  soundConfig.info = defaultSoundsConfig[configKey].info;
  soundConfig.data = "";
}

function exportSettings() {
  if (!config.value || !callerConfig.value || !soundsConfig.value) return;

  const exportData = {
    config: config.value,
    callerConfig: callerConfig.value,
    soundsConfig: soundsConfig.value,
    exportDate: new Date().toISOString(),
    version: "1.0",
  };

  // Convert to JSON and then to base64
  const jsonString = JSON.stringify(exportData);
  const base64String = btoa(unescape(encodeURIComponent(jsonString)));

  // Create a download link
  const element = document.createElement("a");
  element.setAttribute("href", `data:text/plain;charset=utf-8,${encodeURIComponent(base64String)}`);
  element.setAttribute("download", `autodarts-tools-settings-${new Date().toISOString().slice(0, 10)}.txt`);

  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);

  showNotification("Settings exported successfully");
}

function importSettings() {
  if (importFileInput.value) {
    importFileInput.value.click();
  }
}

function handleImportFile(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const base64String = e.target?.result as string;
      const jsonString = decodeURIComponent(escape(atob(base64String)));
      const importedData = JSON.parse(jsonString);

      // Validate the imported data
      if (!importedData.config || !importedData.callerConfig || !importedData.soundsConfig) {
        showNotification("Invalid import data format", "error");
        return;
      }

      // Show confirmation dialog
      showConfirmDialog(
        "Import Settings",
        "This will overwrite your current settings. Are you sure you want to continue?",
        () => {
          // Apply the imported settings
          config.value = {
            ...JSON.parse(JSON.stringify(defaultConfig)),
            ...JSON.parse(JSON.stringify(importedData.config)),
          };

          callerConfig.value = {
            ...JSON.parse(JSON.stringify(defaultCallerConfig)),
            ...JSON.parse(JSON.stringify(importedData.callerConfig)),
          };

          soundsConfig.value = {
            ...JSON.parse(JSON.stringify(defaultSoundsConfig)),
            ...JSON.parse(JSON.stringify(importedData.soundsConfig)),
          };

          showNotification("Settings imported successfully.<br>Reloading page to apply settings...");
          // Add a small delay before reloading to allow the notification to be seen
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        },
      );
    } catch (error) {
      console.error("Import error:", error);
      showNotification("Failed to import settings. The file might be corrupted or in an invalid format.", "error");
    }

    // Reset the file input
    if (importFileInput.value) {
      importFileInput.value.value = "";
    }
  };

  reader.readAsText(file);
}

function copyToClipboard() {
  if (!config.value || !callerConfig.value || !soundsConfig.value) return;

  const exportData = {
    config: config.value,
    callerConfig: callerConfig.value,
    soundsConfig: soundsConfig.value,
    exportDate: new Date().toISOString(),
    version: "1.0",
  };

  // Convert to JSON and then to base64
  const jsonString = JSON.stringify(exportData);
  const base64String = btoa(unescape(encodeURIComponent(jsonString)));

  // Copy to clipboard
  navigator.clipboard.writeText(base64String)
    .then(() => {
      showNotification("Settings copied to clipboard");
    })
    .catch((err) => {
      console.error("Failed to copy settings to clipboard:", err);
      showNotification("Failed to copy settings to clipboard", "error");
    });
}

function pasteFromClipboard() {
  navigator.clipboard.readText()
    .then((text) => {
      if (!text) {
        showNotification("Clipboard is empty", "error");
        return;
      }

      try {
        const jsonString = decodeURIComponent(escape(atob(text)));
        const importedData = JSON.parse(jsonString);

        // Validate the imported data
        if (!importedData.config || !importedData.callerConfig || !importedData.soundsConfig) {
          showNotification("Invalid import data format", "error");
          return;
        }

        // Show confirmation dialog
        showConfirmDialog(
          "Import Settings from Clipboard",
          "This will overwrite your current settings. Are you sure you want to continue?",
          () => {
            // Apply the imported settings
            config.value = {
              ...JSON.parse(JSON.stringify(defaultConfig)),
              ...JSON.parse(JSON.stringify(importedData.config)),
            };

            callerConfig.value = {
              ...JSON.parse(JSON.stringify(defaultCallerConfig)),
              ...JSON.parse(JSON.stringify(importedData.callerConfig)),
            };

            soundsConfig.value = {
              ...JSON.parse(JSON.stringify(defaultSoundsConfig)),
              ...JSON.parse(JSON.stringify(importedData.soundsConfig)),
            };

            showNotification("Settings imported successfully.<br>Reloading page to apply settings...");
            // Add a small delay before reloading to allow the notification to be seen
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          },
        );
      } catch (error) {
        console.error("Paste error:", error);
        showNotification("Failed to import settings from clipboard. The data might be corrupted or in an invalid format.", "error");
      }
    })
    .catch((err) => {
      console.error("Failed to read from clipboard:", err);
      showNotification("Failed to read from clipboard", "error");
    });
}

// Computed property for winnerSoundOnLegWin
const winnerSoundOnLegWin = computed({
  get: () => soundsConfig.value?.winnerSoundOnLegWin || false,
  set: (value) => {
    if (soundsConfig.value) {
      soundsConfig.value.winnerSoundOnLegWin = value;
    }
  },
});

// State for danger zone
const showDangerZone = ref(false);

function toggleDangerZone() {
  showDangerZone.value = !showDangerZone.value;
}

function resetAllSettings() {
  showConfirmDialog(
    "Reset All Settings",
    "This will reset all settings to their default values. All your customizations will be lost. Are you sure you want to continue?",
    () => {
      config.value = JSON.parse(JSON.stringify(defaultConfig));
      callerConfig.value = JSON.parse(JSON.stringify(defaultCallerConfig));
      soundsConfig.value = JSON.parse(JSON.stringify(defaultSoundsConfig));
      showNotification("All settings have been reset to default.<br>Reloading page to apply settings...");
      // Add a small delay before reloading to allow the notification to be seen
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    },
  );
}
</script>

<style>
input[type="color"] {
  -webkit-appearance: none;
  border: none;
}

input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 0;
}

input[type="color"]::-webkit-color-swatch {
  border: none;
}

.gradient-mask-left {
  mask-image: linear-gradient(to right, transparent 10%, black 60%);
  -webkit-mask-image: linear-gradient(to right, transparent 10%, black 60%);
}
</style>
