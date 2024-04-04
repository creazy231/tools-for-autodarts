<template>
  <div class="mb-16 space-y-8">
    <div class="space-y-4">
      <div class="flex items-center">
        <AppButton
          @click="goBack()"
          class="mr-4 h-9 w-8 rounded-md border border-white/10 bg-transparent p-0 pt-[0.2rem] text-xl hover:bg-white/10"
        >
          <span class="icon-[mdi-light--chevron-left]" />
        </AppButton>
        <h1 class="text-3xl font-bold">
          Autodarts Tools
        </h1>
      </div>

      <template v-if="config">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="space-y-4 rounded border border-white/10 p-4">
            <div>
              <h2 class="text-lg font-semibold">
                Discord Webhooks
              </h2>
              <p class="max-w-2xl text-white/40">
                Whenever a <b>private</b> lobby opens, it sends the invitation link to your discord server using a webhook.
              </p>
            </div>
            <div class="grid grid-cols-[5rem_auto] items-center gap-4">
              <AppToggle v-model="config.discord.enabled" />
              <input
                v-model="config.discord.url"
                type="text"
                class="w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none"
              >
            </div>
            <template v-if="config.discord.enabled">
              <div class="grid grid-cols-[5rem_auto] items-center gap-4">
                <AppToggle v-model="config.discord.manually" text-on="MAN" text-off="AUT" />
                <p>Toggles between sending the invitation link automatically or manually.</p>
              </div>
            </template>
          </div>

          <div class="space-y-4 rounded border border-white/10 p-4">
            <div>
              <h2 class="text-lg font-semibold">
                Autostart
              </h2>
              <p class="max-w-2xl text-white/40">
                Displays a button to enable autostart on the lobby page. If autostart is enabled, it will automatically start the game after <b>3 seconds</b> once a player joins the lobby.
              </p>
            </div>
            <div class="grid grid-cols-[5rem_auto] items-center gap-4">
              <AppToggle v-model="config.autoStart.enabled" />
            </div>
          </div>

          <div class="space-y-4 rounded border border-white/10 p-4">
            <div>
              <h2 class="text-lg font-semibold">
                Colors
              </h2>
              <p class="max-w-2xl text-white/40">
                Changes the colors of dart throws and scores.
              </p>
            </div>
            <div class="grid grid-cols-[5rem_auto] items-center gap-4">
              <AppToggle v-model="config.colors.enabled" />
            </div>
            <div v-if="config.colors.enabled" class="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div class="relative min-h-14 w-full">
                <input
                  v-model="config.colors.background"
                  type="color"
                  class="size-full overflow-hidden rounded-md border-none border-transparent p-0 outline-none"
                >
                <span class="pointer-events-none absolute inset-0 flex items-center justify-center p-2 text-center text-xs drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">Click here to change color</span>
              </div>
              <div class="relative min-h-14 w-full">
                <input
                  v-model="config.colors.text"
                  type="color"
                  class="size-full overflow-hidden rounded-md border-none border-transparent p-0 outline-none"
                >
                <span class="pointer-events-none absolute inset-0 flex items-center justify-center p-2 text-center text-xs drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">Click here to change color</span>
              </div>
              <div
                class="col-span-2 flex h-14 w-full items-center justify-center rounded-md text-5xl font-bold"
                :style="{
                  backgroundColor: config.colors.background,
                  color: config.colors.text,
                }"
              >
                501
              </div>
            </div>
          </div>

          <div class="space-y-4 rounded border border-white/10 p-4">
            <div>
              <h2 class="text-lg font-semibold">
                Extend recent Local Players
              </h2>
              <p class="max-w-2xl text-white/40">
                Default recent local players capped at 5, this will extend it to infinite.
              </p>
            </div>
            <div class="grid grid-cols-[5rem_auto] items-center gap-4">
              <AppToggle v-model="config.recentLocalPlayers.enabled" />
            </div>
            <div v-if="config.recentLocalPlayers.enabled" class="grid grid-cols-[5rem_auto] items-center gap-4">
              <input
                v-model="config.recentLocalPlayers.cap"
                placeholder="10"
                type="number"
                class="w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none placeholder:opacity-50"
              >
              <p>Maximum recent players you want to store</p>
            </div>
          </div>

          <div class="space-y-4 rounded border border-white/10 p-4">
            <div>
              <h2 class="text-lg font-semibold">
                Takeout Notification
              </h2>
              <p class="max-w-2xl text-white/40">
                Displays a notification when ever takeout of darts is in progress.
              </p>
            </div>
            <div class="grid grid-cols-[5rem_auto] items-center gap-4">
              <AppToggle v-model="config.takeout.enabled" />
            </div>
          </div>

          <div class="space-y-4 rounded border border-white/10 p-4">
            <div>
              <h2 class="text-lg font-semibold">
                Smaller Scores
              </h2>
              <p class="max-w-2xl text-white/40">
                Reduces the font-size of the score of inactive players.
              </p>
            </div>
            <div class="grid grid-cols-[5rem_auto] items-center gap-4">
              <AppToggle v-model="config.inactiveSmall.enabled" />
            </div>
          </div>

          <div class="space-y-4 rounded border border-white/10 p-4">
            <div>
              <h2 class="text-lg font-semibold">
                Shuffle Players
              </h2>
              <p class="max-w-2xl text-white/40">
                Adds a button to the lobby page to shuffle the players in the lobby.
              </p>
            </div>
            <div class="grid grid-cols-[5rem_auto] items-center gap-4">
              <AppToggle v-model="config.shufflePlayers.enabled" />
            </div>
          </div>

          <div class="space-y-4 rounded border border-white/10 p-4">
            <div>
              <h2 class="text-lg font-semibold">
                Streaming Mode
              </h2>
              <p class="max-w-2xl text-white/40">
                Adds a button to the game page to enable streaming mode. If streaming mode is enabled, it will displays a green overlay with stats and scores which then can be captured by OBS or any other streaming software.
              </p>
            </div>
            <div class="grid grid-cols-[5rem_auto] items-center gap-4">
              <AppToggle v-model="config.streamingMode.enabled" />
            </div>
            <template v-if="config.streamingMode.enabled">
              <div class="grid grid-cols-[5rem_auto] items-center gap-4">
                <AppToggle v-model="config.streamingMode.backgroundImage" text-on="IMG" text-off="CK" />
                <p>Toggles the Background between Chrome Key and Image</p>
              </div>
              <div v-if="!config.streamingMode.backgroundImage" class="grid grid-cols-[5rem_auto] items-center gap-4">
                <input
                  v-model="config.streamingMode.chromaKeyColor"
                  type="color"
                  class="size-full overflow-hidden rounded border-none border-transparent p-0 outline-none"
                >
                <p>Chroma Key Color</p>
              </div>
              <div v-else class="grid grid-cols-[5rem_auto] items-center gap-4">
                <div
                  @click="handleStreamingModeBackgroundFileSelect"
                  class="aspect-square w-full cursor-pointer overflow-hidden rounded-md border border-dashed border-white/15"
                >
                  <img
                    v-if="config.streamingMode.image"
                    :src="config.streamingMode.image"
                    class="size-full object-cover"
                  >
                  <div class="flex size-full items-center justify-center opacity-15">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h9v2H5v14h14v-9h2v9q0 .825-.587 1.413T19 21zM17 9V7h-2V5h2V3h2v2h2v2h-2v2zM6 17h12l-3.75-5l-3 4L9 13zM5 5v14z" /></svg>
                  </div>
                </div>
                <div class="flex items-center gap-4">
                  <AppButton
                    @click="handleStreamingModeBackgroundFileSelect"
                    auto
                  >
                    Change Image
                  </AppButton>
                  <AppButton
                    @click="handleStreamingModeBackgroundReset"
                    auto
                  >
                    Reset
                  </AppButton>
                </div>
                <input
                  @change="handleStreamingModeBackgroundFileSelected"
                  ref="streamingModeBackgroundFileSelect"
                  class="hidden"
                  type="file"
                >
              </div>
              <div v-if="config.streamingMode.enabled" class="grid grid-cols-[5rem_auto] items-center gap-4">
                <AppToggle v-model="config.streamingMode.throws" />
                <p>Display Throws</p>
              </div>
              <div v-if="config.streamingMode.enabled" class="grid grid-cols-[5rem_auto] items-center gap-4">
                <AppToggle v-model="config.streamingMode.board" />
                <p>Display the Board</p>
              </div>
              <div v-if="config.streamingMode.enabled && config.streamingMode.board" class="grid grid-cols-[5rem_auto] items-center gap-4">
                <AppToggle v-model="config.streamingMode.boardImage" text-on="LIVE" text-off="IMG" />
                <p>Toggles the Board between Live and Image mode</p>
              </div>
              <input
                v-model="config.streamingMode.footerText"
                placeholder="Bottom text of the streaming overlay"
                class="col-span-2 w-full rounded-md border border-white/10 bg-transparent px-2 py-1 outline-none placeholder:opacity-50"
              >
            </template>
          </div>

          <div class="space-y-4 rounded border border-white/10 p-4">
            <div>
              <h2 class="text-lg font-semibold">
                External Boards
              </h2>
              <p class="max-w-2xl text-white/40">
                Allows you to save external Boards to easily follow them.
              </p>
            </div>
            <div class="grid grid-cols-[5rem_auto] items-center gap-4">
              <AppToggle v-model="config.externalBoards.enabled" />
            </div>
          </div>

          <div class="space-y-4 rounded border border-white/10 p-4">
            <div>
              <h2 class="text-lg font-semibold">
                Hide Menu in Match
              </h2>
              <p class="max-w-2xl text-white/40">
                Hide the menu during the match to have more space.
              </p>
            </div>
            <div class="grid grid-cols-[5rem_auto] items-center gap-4">
              <AppToggle v-model="config.menuDisabled" />
            </div>
          </div>

          <div class="space-y-4 rounded border border-white/10 p-4">
            <div>
              <h2 class="text-lg font-semibold">
                Larger Legs & Sets
              </h2>
              <p class="max-w-2xl text-white/40">
                Increases the font-size of the legs and sets on the match page.
              </p>
            </div>
            <div class="grid grid-cols-[5rem_5rem_5rem] items-center gap-4">
              <AppToggle v-model="config.legsSetsLarger.enabled" />
              <span v-if="config.legsSetsLarger.enabled" class="text-right">size</span>
              <input
                v-if="config.legsSetsLarger.enabled"
                v-model="config.legsSetsLarger.value"
                type="text"
                class="rounded-md border border-white/10 bg-transparent px-2 py-1 text-center outline-none"
              >
            </div>
          </div>

          <div class="space-y-4 rounded border border-white/10 p-4">
            <div>
              <h2 class="text-lg font-semibold">
                Larger Player Match Data
              </h2>
              <p class="max-w-2xl text-white/40">
                Increases the font-size of the player match data on the match page.
              </p>
            </div>
            <div class="grid grid-cols-[5rem_5rem_5rem] items-center gap-4">
              <AppToggle v-model="config.playerMatchData.enabled" />
              <span v-if="config.playerMatchData.enabled" class="text-right">size</span>
              <input
                v-if="config.playerMatchData.enabled"
                v-model="config.playerMatchData.value"
                type="text"
                class="rounded-md border border-white/10 bg-transparent px-2 py-1 text-center outline-none"
              >
            </div>
          </div>

          <div class="space-y-4 rounded border border-white/10 p-4">
            <div>
              <h2 class="text-lg font-semibold">
                Automatic next Leg
              </h2>
              <p class="max-w-2xl text-white/40">
                Automatically starts the next leg x seconds <span class="font-semibold text-white/60">after takeout</span>.<br>
                Disabled while playing against logged in opponents.
              </p>
            </div>
            <div class="grid grid-cols-[5rem_5rem_auto] items-center gap-4">
              <AppToggle v-model="config.automaticNextLeg.enabled" />
              <input
                v-if="config.automaticNextLeg.enabled"
                v-model="config.automaticNextLeg.sec"
                type="text"
                class="rounded-md border border-white/10 bg-transparent px-2 py-1 text-center outline-none"
              >
              <span v-if="config.automaticNextLeg.enabled">seconds</span>
            </div>
          </div>

          <div class="space-y-4 rounded border border-white/10 p-4">
            <div>
              <h2 class="text-lg font-semibold">
                Winner animation
              </h2>
              <p class="max-w-2xl text-white/40">
                Shows an animation around player card when a player wins a leg.
              </p>
            </div>
            <div class="grid grid-cols-[5rem_5rem_auto] items-center gap-4">
              <AppToggle v-model="config.winnerAnimation.enabled" />
            </div>
          </div>

          <div class="space-y-4 rounded border border-white/10 p-4">
            <div>
              <h2 class="text-lg font-semibold">
                Show thrown darts
              </h2>
              <p class="max-w-2xl text-white/40">
                Shows number of thrown darts after a player wins a leg.
              </p>
            </div>
            <div class="grid grid-cols-[5rem_5rem_auto] items-center gap-4">
              <AppToggle v-model="config.thrownDartsOnWin.enabled" />
            </div>
          </div>

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
                <span class="icon-[mdi-light--refresh] -scale-x-100 text-xl" />
              </button>
            </div>
            <div v-if="config.caller.enabled && callerConfig">
              <div class="grid gap-4">
                <div v-for="(_, index) in callerConfig.caller" :key="index" class="grid items-center gap-4 lg:grid-cols-[5rem_50px_2fr_5fr_1fr_1fr_50px_50px] lg:grid-rows-1">
                  <div>Caller {{ index + 1 }}</div>
                  <button
                    @click="setActive(index)"
                    :disabled="!callerConfig.caller[index].url"
                    :class="twMerge(
                      'flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10',
                      !callerConfig.caller[index].url && 'bg-white/2 hover:bg-white/2',
                      callerConfig.caller[index].isActive && 'bg-cyan-600 border-cyan-600',
                    )"
                  >
                    <span :class="twMerge('icon-[mdi-light--check] text-xl', !callerConfig.caller[index].url && 'text-white/30')" />
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
                    <span :class="twMerge('icon-[mdi-light--play] text-xl', !callerConfig.caller[index].url && 'text-white/30')" />
                  </button>
                  <button
                    @click="callerConfig.caller.splice(index, 1)"
                    class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                  >
                    <span class="icon-[mdi-light--delete] text-lg" />
                  </button>
                </div>

                <div class="grid items-center gap-4 lg:grid-cols-[5rem_2fr_5fr_1fr_1fr_50px_50px] lg:grid-rows-1">
                  <button
                    @click="callerConfig.caller.push({ url: '' })"
                    class="flex flex-nowrap items-center  justify-center rounded-md border border-white/10 bg-white/5 p-2 outline-none"
                  >
                    <span class="icon-[mdi-light--plus]" />
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
                <span class="icon-[mdi-light--refresh] -scale-x-100 text-xl" />
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
                  <span class="icon-[mdi-light--play] text-xl" />
                </button>
                <button
                  @click="handleSoundUpload('T')"
                  title="Upload sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                >
                  <span class="icon-[mdi-light--upload] text-lg" />
                </button>
                <button
                  @click="handleSoundReset('T')"
                  title="Reset sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                >
                  <span class="icon-[mdi-light--refresh] -scale-x-100 text-xl" />
                </button>
                <button
                  @click="handleSoundRemove('T')"
                  title="Remove sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                >
                  <span class="icon-[mdi-light--delete] text-lg" />
                </button>
              </div>
              <div v-for="tripleCount in tripleCountArr" :key="tripleCount" class="grid items-center gap-4 lg:grid-cols-[5rem_auto_50px_50px_50px_50px] lg:grid-rows-1">
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
                  <span class="icon-[mdi-light--play] text-xl" />
                </button>
                <button
                  @click="handleSoundUpload(`T${tripleCount}`)"
                  title="Upload sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                >
                  <span class="icon-[mdi-light--upload] text-lg" />
                </button>
                <button
                  @click="handleSoundReset(`T${tripleCount}`)"
                  title="Reset sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                >
                  <span class="icon-[mdi-light--refresh] -scale-x-100 text-xl" />
                </button>
                <button
                  @click="handleSoundRemove(`T${tripleCount}`)"
                  title="Remove sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                >
                  <span class="icon-[mdi-light--delete] text-lg" />
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
                  <span class="icon-[mdi-light--play] text-xl" />
                </button>
                <button
                  @click="handleSoundUpload('bull')"
                  title="Upload sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                >
                  <span class="icon-[mdi-light--upload] text-lg" />
                </button>
                <button
                  @click="handleSoundReset('bull')"
                  title="Reset sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                >
                  <span class="icon-[mdi-light--refresh] -scale-x-100 text-xl" />
                </button>
                <button
                  @click="handleSoundRemove('bull')"
                  title="Remove sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                >
                  <span class="icon-[mdi-light--delete] text-lg" />
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
                  <span class="icon-[mdi-light--play] text-xl" />
                </button>
                <button
                  @click="handleSoundUpload('bust')"
                  title="Upload sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                >
                  <span class="icon-[mdi-light--upload] text-lg" />
                </button>
                <button
                  @click="handleSoundReset('bust')"
                  title="Reset sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                >
                  <span class="icon-[mdi-light--refresh] -scale-x-100 text-xl" />
                </button>
                <button
                  @click="handleSoundRemove('bust')"
                  title="Remove sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                >
                  <span class="icon-[mdi-light--delete] text-lg" />
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
                  <span class="icon-[mdi-light--play] text-xl" />
                </button>
                <button
                  @click="handleSoundUpload('gameOn')"
                  title="Upload sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                >
                  <span class="icon-[mdi-light--upload] text-lg" />
                </button>
                <button
                  @click="handleSoundReset('gameOn')"
                  title="Reset sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                >
                  <span class="icon-[mdi-light--refresh] -scale-x-100 text-xl" />
                </button>
                <button
                  @click="handleSoundRemove('gameOn')"
                  title="Remove sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                >
                  <span class="icon-[mdi-light--delete] text-lg" />
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
                  <span class="icon-[mdi-light--play] text-xl" />
                </button>
                <button
                  @click="handleSoundUpload('playerStart')"
                  title="Upload sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                >
                  <span class="icon-[mdi-light--upload] text-lg" />
                </button>
                <button
                  @click="handleSoundReset('playerStart')"
                  title="Reset sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                >
                  <span class="icon-[mdi-light--refresh] -scale-x-100 text-xl" />
                </button>
                <button
                  @click="handleSoundRemove('playerStart')"
                  title="Remove sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                >
                  <span class="icon-[mdi-light--delete] text-lg" />
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
              <div v-for="(_, index) in soundsConfig.miss" :key="index" class="grid items-center gap-4 lg:grid-cols-[5rem_auto_50px_50px_50px_50px] lg:grid-rows-1">
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
                  <span class="icon-[mdi-light--play] text-xl" />
                </button>
                <button
                  @click="handleSoundUpload('miss', index)"
                  title="Upload sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                >
                  <span class="icon-[mdi-light--upload] text-lg" />
                </button>
                <button
                  @click="handleSoundReset('miss', index)"
                  v-if="index <= 2"
                  title="Reset sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                >
                  <span class="icon-[mdi-light--refresh] -scale-x-100 text-xl" />
                </button>
                <div v-else />
                <button
                  @click="soundsConfig.miss.splice(index, 1)"
                  title="Remove sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                >
                  <span class="icon-[mdi-light--delete] text-lg" />
                </button>
              </div>
              <div class="grid items-center gap-4 lg:grid-cols-[50px_auto] lg:grid-rows-1">
                <button
                  @click="soundsConfig.miss.push({ info: '' })"
                  class="flex flex-nowrap items-center  justify-center rounded-md border border-white/10 bg-white/5 p-2 outline-none"
                >
                  <span class="icon-[mdi-light--plus]" />
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
                  <span class="icon-[mdi-light--play] text-xl" />
                </button>
                <button
                  @click="handleSoundUpload('bot')"
                  title="Upload sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                >
                  <span class="icon-[mdi-light--upload] text-lg" />
                </button>
                <button
                  @click="handleSoundReset('bot')"
                  title="Reset sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                >
                  <span class="icon-[mdi-light--refresh] -scale-x-100 text-xl" />
                </button>
                <button
                  @click="handleSoundRemove('bot')"
                  title="Remove sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                >
                  <span class="icon-[mdi-light--delete] text-lg" />
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
                  <span class="icon-[mdi-light--play] text-xl" />
                </button>
                <button
                  @click="handleSoundUpload('botOutside')"
                  title="Upload sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                >
                  <span class="icon-[mdi-light--upload] text-lg" />
                </button>
                <button
                  @click="handleSoundReset('botOutside')"
                  title="Reset sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                >
                  <span class="icon-[mdi-light--refresh] -scale-x-100 text-xl" />
                </button>
                <button
                  @click="handleSoundRemove('botOutside')"
                  title="Remove sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                >
                  <span class="icon-[mdi-light--delete] text-lg" />
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
                  <span class="icon-[mdi-light--play] text-xl" />
                </button>
                <button
                  @click="handleSoundUpload('cricketHit')"
                  title="Upload sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                >
                  <span class="icon-[mdi-light--upload] text-lg" />
                </button>
                <button
                  @click="handleSoundReset('cricketHit')"
                  title="Reset sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                >
                  <span class="icon-[mdi-light--refresh] -scale-x-100 text-xl" />
                </button>
                <button
                  @click="handleSoundRemove('cricketHit')"
                  title="Remove sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                >
                  <span class="icon-[mdi-light--delete] text-lg" />
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
                  <span class="icon-[mdi-light--play] text-xl" />
                </button>
                <button
                  @click="handleSoundUpload('cricketMiss')"
                  title="Upload sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                >
                  <span class="icon-[mdi-light--upload] text-lg" />
                </button>
                <button
                  @click="handleSoundReset('cricketMiss')"
                  title="Reset sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                >
                  <span class="icon-[mdi-light--refresh] -scale-x-100 text-xl" />
                </button>
                <button
                  @click="handleSoundRemove('cricketMiss')"
                  title="Remove sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                >
                  <span class="icon-[mdi-light--delete] text-lg" />
                </button>
              </div>
              <div class="mt-1.5">
                <span class="font-semibold">Winner sounds</span>
              </div>
              <div v-for="(_, index) in soundsConfig.winner.slice(1)" :key="index" class="grid items-center gap-4 lg:grid-cols-[200px_auto_50px_50px_50px_50px] lg:grid-rows-1">
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
                  <span class="icon-[mdi-light--play] text-xl" />
                </button>
                <button
                  @click="handleSoundUpload('winner', index + 1)"
                  title="Upload sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                >
                  <span class="icon-[mdi-light--upload] text-lg" />
                </button>
                <div />
                <button
                  @click="soundsConfig.winner.splice(index + 1, 1)"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                >
                  <span class="icon-[mdi-light--delete] text-lg" />
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
                  <span class="icon-[mdi-light--play] text-xl" />
                </button>
                <button
                  @click="handleSoundUpload('winner', 0)"
                  title="Upload sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                >
                  <span class="icon-[mdi-light--upload] text-lg" />
                </button>
                <button
                  @click="handleSoundReset('winner', 0)"
                  title="Reset sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none hover:bg-white/10"
                >
                  <span class="icon-[mdi-light--refresh] -scale-x-100 text-xl" />
                </button>
                <button
                  @click="handleSoundRemove('winner', 0)"
                  title="Remove sound"
                  class="flex h-full flex-nowrap items-center justify-center rounded-md border border-white/10 bg-white/5 outline-none"
                >
                  <span class="icon-[mdi-light--delete] text-lg" />
                </button>
              </div>
              <div class="grid items-center gap-4 lg:grid-cols-[50px_auto] lg:grid-rows-1">
                <button
                  @click="soundsConfig.winner.push({ name: '', info: '' })"
                  class="flex flex-nowrap items-center  justify-center rounded-md border border-white/10 bg-white/5 p-2 outline-none"
                >
                  <span class="icon-[mdi-light--plus]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { twMerge } from "tailwind-merge";
import AppToggle from "@/components/AppToggle.vue";
import type { IConfig } from "@/utils/storage";
import type { ICallerConfig } from "@/utils/callerStorage";
import { AutodartsToolsConfig, defaultConfig } from "@/utils/storage";
import AppButton from "@/components/AppButton.vue";
import { AutodartsToolsCallerConfig, defaultCallerConfig } from "@/utils/callerStorage";
import type { ISoundsConfig, TSoundData } from "@/utils/soundsStorage";
import { AutodartsToolsSoundsConfig, defaultSoundsConfig } from "@/utils/soundsStorage";
import { playPointsSound, playSound } from "@/utils/playSound";

const config = ref<IConfig>();
const callerConfig = ref<ICallerConfig>();
const soundsConfig = ref<ISoundsConfig>();
const streamingModeBackgroundFileSelect = ref() as Ref<HTMLInputElement>;
const tripleCountArr = [ 15, 16, 17, 18, 19, 20 ];

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

function handleStreamingModeBackgroundFileSelect() {
  streamingModeBackgroundFileSelect.value.click();
}

function handleStreamingModeBackgroundFileSelected() {
  const file = streamingModeBackgroundFileSelect.value.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    config.value!.streamingMode.image = reader.result as string;
    console.log(reader.result);
  };
  reader.readAsDataURL(file);

  streamingModeBackgroundFileSelect.value.value = "";
}

function handleStreamingModeBackgroundReset() {
  config.value!.streamingMode.image = "";
}

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
</style>
