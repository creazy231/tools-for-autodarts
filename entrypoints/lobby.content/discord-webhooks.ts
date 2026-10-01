/**
 * Discord Webhooks — announce a lobby in a Discord channel.
 *
 * Two modes, from `config.discord.manually`:
 *   false — the webhook fires as soon as the lobby opens
 *   true  — a Discord button appears beside the site's own Shuffle button, and
 *           the host decides when to announce
 *
 * Once announced, the message is edited in place when the game starts, so the
 * channel does not fill up with stale "come and play" posts.
 *
 * The post is written in the language autodarts is showing for the host, with
 * the lobby's settings named as the site names them (utils/discord-announcement.ts).
 * The edit reuses the post's words, so one message stays in one language even if
 * the host picks another in between.
 */

import { startGameButton, waitForStartGameButton } from "./start-game";

import { waitForElement } from "@/utils";
import { settingName, settingValue } from "@/utils/discord-announcement";
import { onLanguageChange, t } from "@/utils/i18n";
import { SELECTORS, qs } from "@/utils/selectors";
import { AutodartsToolsLobbyData } from "@/utils/lobby-data-storage";
import { AutodartsToolsConfig } from "@/utils/storage";

const BUTTON_ID = "autodarts-tools-discord-button";
const LISTENER_FLAG = "data-autodarts-tools-listener";
/** Marks the Shuffle button whose `ml-auto` we took over, so it can be given back. */
const MOVED_MARGIN_FLAG = "data-autodarts-tools-moved-margin";

const ICON_DISCORD = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02M8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12m6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.83 2.12-1.89 2.12\"/></svg>";

const ICON_CHECK = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"m10 16.4l-4-4L7.4 11l2.6 2.6L16.6 7L18 8.4z\"/></svg>";

const ICON_ALERT = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2M12 20a8 8 0 1 1 0-16a8 8 0 0 1 0 16\"/></svg>";

/** How long the button stays in its "sent" state before returning to normal. */
const SENT_FEEDBACK_MS = 5000;

/** The emoji on both sides of the headline. Only its words are translated, so the emoji and the Markdown around them stay here. */
const TARGET = "🎯";

let autoStartTimer: number | null = null;
let headerObserver: MutationObserver | null = null;
let startButtonObserver: MutationObserver | null = null;
/** Rewrites the button's tooltip when the language changes. */
let stopLanguageListener: (() => void) | null = null;

/** Set once a message exists, so it can be edited when the game starts. */
let webhookMessageId: string | null = null;
let webhookUrl: string | null = null;
/** The lobby settings as they were announced, reused when editing the message. */
let announcedFields: EmbedField[] = [];
/**
 * The words of the post besides those settings, as they were written. The edit
 * reuses them rather than asking `t()` again, so a language picked between the
 * post and the edit does not leave one message half in each.
 */
let announcedWords: AnnouncementWords | null = null;
/** Guards against the timer and a manual click both editing the message. */
let messageUpdated = false;

interface EmbedField { name: string; value: string; inline: boolean }

/** What the announcement says besides the lobby's settings, in the language of the moment it is written. */
interface AnnouncementWords { headline: string; embedTitle: string; started: string }

export async function discordWebhooks() {
  console.log("Autodarts Tools: Discord Webhooks - Starting");

  const config = await AutodartsToolsConfig.getValue();

  watchForStartButton();

  if (config.discord.manually) {
    await mountButton();
  } else {
    await sendWebhook();
  }
}

export async function onRemove() {
  headerObserver?.disconnect();
  headerObserver = null;
  startButtonObserver?.disconnect();
  startButtonObserver = null;
  stopLanguageListener?.();
  stopLanguageListener = null;

  if (autoStartTimer !== null) {
    clearTimeout(autoStartTimer);
    autoStartTimer = null;
  }

  document.getElementById(BUTTON_ID)?.remove();
  restoreShuffleMargin();

  webhookMessageId = null;
  webhookUrl = null;
  announcedFields = [];
  announcedWords = null;
  messageUpdated = false;
}

// ------------------------------------------------------------------- button

/**
 * Put the button in the lobby's "Players" header, to the left of Shuffle.
 *
 * The header re-renders whenever the player count changes, which throws our
 * button away, so this watches the card and re-inserts rather than running
 * once.
 */
async function mountButton() {
  await waitForElement(SELECTORS.lobby.playersCardHeader, 10000);
  inject();

  // Going from one lobby straight into another re-runs the feature without a
  // teardown in between, and this observer watches the whole document — leaving
  // the previous one connected means every lobby of a session adds another
  // full-page observer that fires on every DOM change for as long as the tab
  // lives. Reported by @MaB-MaN in #230.
  headerObserver?.disconnect();
  headerObserver = new MutationObserver(() => inject());
  headerObserver.observe(document.body, { childList: true, subtree: true });

  // The button's tooltip is written once, when it is built. One listener for
  // the lobby, not one per button: the header throws the button away and
  // `inject` builds another every time it re-renders, and the listener finds
  // whichever one is there.
  stopLanguageListener?.();
  stopLanguageListener = onLanguageChange(() => {
    const button = document.getElementById(BUTTON_ID);
    if (button) button.title = t("discordWebhooks.button.title");
  });
}

function inject() {
  if (document.getElementById(BUTTON_ID)) return;

  const shuffle = qs<HTMLButtonElement>(SELECTORS.lobby.shuffleButton);
  if (!shuffle) return;

  const button = buildButton(shuffle);
  shuffle.before(button);
  takeShuffleMargin(shuffle, button);
}

/**
 * Clone the site's own button so the result inherits whatever autodarts
 * currently uses — height, radius, hover glow, focus ring. If they restyle
 * their buttons, ours restyles with them. The clone carries no React fiber, so
 * it has none of the original's behaviour.
 */
function buildButton(template: HTMLButtonElement): HTMLButtonElement {
  const button = template.cloneNode(false) as HTMLButtonElement;

  button.id = BUTTON_ID;
  button.type = "button";
  button.title = t("discordWebhooks.button.title");
  setContent(button, ICON_DISCORD, "Discord");

  button.addEventListener("click", async () => {
    if (button.disabled) return;
    button.disabled = true;

    // Report what actually happened: a missing or rejected webhook URL is
    // otherwise silent, and the host has no way to tell the channel got nothing.
    const sent = await sendWebhook();
    const showResult = () => setContent(
      button,
      sent ? ICON_CHECK : ICON_ALERT,
      sent ? t("discordWebhooks.button.sent") : t("discordWebhooks.button.failed"),
    );
    showResult();
    // The word stays for a few seconds: follow a language picked meanwhile.
    const stopFollowing = onLanguageChange(showResult);

    setTimeout(() => {
      stopFollowing();
      setContent(button, ICON_DISCORD, "Discord");
      button.disabled = false;
    }, SENT_FEEDBACK_MS);
  });

  return button;
}

/**
 * The site sizes icons with `[&_svg:not([class*='size-'])]:size-4`, so an
 * unclassed svg picks up the right size for free.
 */
function setContent(button: HTMLButtonElement, icon: string, label: string) {
  button.innerHTML = icon;
  button.append(label);
}

/**
 * Shuffle carries `ml-auto`, which is what pushes it to the right of the
 * header. Inserting before it would strand our button next to the player
 * count, so the margin moves to ours and the two sit together.
 */
function takeShuffleMargin(shuffle: HTMLButtonElement, button: HTMLButtonElement) {
  if (!shuffle.classList.contains("ml-auto")) return;
  shuffle.classList.remove("ml-auto");
  shuffle.setAttribute(MOVED_MARGIN_FLAG, "true");
  button.classList.add("ml-auto");
}

function restoreShuffleMargin() {
  for (const el of document.querySelectorAll(`[${MOVED_MARGIN_FLAG}]`)) {
    el.classList.add("ml-auto");
    el.removeAttribute(MOVED_MARGIN_FLAG);
  }
}

// -------------------------------------------------------------- game start

/**
 * Watch for the Start Game button so a manual start can edit the message.
 *
 * The button is found by where it sits, not by its label — see start-game.ts
 * — so the listener goes on while the lobby is still filling up and the button
 * still says so, and in whatever language the site is shown in.
 */
function watchForStartButton() {
  const attach = () => {
    for (const button of findStartButtons()) {
      if (button.hasAttribute(LISTENER_FLAG)) continue;
      button.setAttribute(LISTENER_FLAG, "true");
      button.addEventListener("click", onGameStarted);
    }
  };

  // Same as the header observer above: one per lobby entered, never released.
  startButtonObserver?.disconnect();
  startButtonObserver = new MutationObserver(attach);
  startButtonObserver.observe(document.body, { childList: true, subtree: true });
  attach();
}

function findStartButtons(): HTMLButtonElement[] {
  const button = startGameButton();
  return button ? [ button ] : [];
}

async function onGameStarted() {
  if (messageUpdated) return;

  if (autoStartTimer !== null) {
    clearTimeout(autoStartTimer);
    autoStartTimer = null;
  }

  if (!webhookMessageId || !webhookUrl) return;

  try {
    await markMessageStarted();
    messageUpdated = true;
  } catch (error) {
    console.error("Autodarts Tools: Discord Webhooks - Error updating message on start:", error);
  }
}

/** Auto-start: wait, then press the site's own Start Game button. */
function startAutoStartTimer(minutes: number) {
  if (autoStartTimer !== null) clearTimeout(autoStartTimer);

  console.log(`Autodarts Tools: Discord Webhooks - Auto-start in ${minutes} minutes`);

  autoStartTimer = window.setTimeout(async () => {
    try {
      const button = await waitForStartGameButton(5000);
      if (!button) throw new Error("no Start Game button on this page");
      // The site disables it while the lobby cannot start; a click would be silent.
      if (button.disabled) throw new Error("the lobby is not ready to start");
      button.click();

      if (webhookMessageId && webhookUrl && !messageUpdated) {
        await markMessageStarted();
        messageUpdated = true;
      }
    } catch (error) {
      console.error("Autodarts Tools: Discord Webhooks - Auto-start failed:", error);
    } finally {
      autoStartTimer = null;
    }
  }, minutes * 60 * 1000);
}

// ------------------------------------------------------------------ webhook

/**
 * The lobby's share link.
 *
 * v1 read this out of a text field on the page; v2 has no such field, and the
 * lobby URL is the share link, so the address bar is both simpler and immune
 * to layout changes.
 */
function lobbyLink(): string {
  const url = new URL(window.location.href);
  url.hash = "";
  url.search = "";
  return url.toString();
}

async function sendWebhook() {
  try {
    const config = await AutodartsToolsConfig.getValue();
    if (!config.discord.url) {
      console.warn("Autodarts Tools: Discord Webhooks - No webhook URL configured");
      return null;
    }

    const link = lobbyLink();
    await rememberMatchId(link);

    const fields = await buildLobbyFields();
    const words = announcementWords();
    const embedFields = [ ...fields ];

    if (config.discord.autoStartAfterTimer?.enabled) {
      const startsAt = Math.floor(Date.now() / 1000) + config.discord.autoStartAfterTimer.minutes * 60;
      embedFields.push(spacerField(), {
        name: "",
        value: t("discordWebhooks.message.autoStart", { time: `<t:${startsAt}:R>` }),
        inline: false,
      });
    }

    messageUpdated = false;

    const response = await fetch(`${config.discord.url}?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `${TARGET} **${words.headline}** ${TARGET}\n\n${link}\n_ _`,
        embeds: [ embed(words.embedTitle, embedFields, 8902706) ],
        username: "Autodarts Tools",
        avatar_url: "https://lh3.googleusercontent.com/YwAEtrxsMxCS_nQpaTE96s4lBqmcGAI1MyI88-4E1vXK4EFoe3kTInegjd-7P2bRsWFPN1bRW5dVKBTcX8oQbeEg",
        attachments: [],
      }),
    });

    const { id } = await response.json();
    console.log("Autodarts Tools: Discord Webhooks - Message ID:", id);

    webhookMessageId = id;
    webhookUrl = config.discord.url;
    announcedFields = fields;
    announcedWords = words;

    if (config.discord.autoStartAfterTimer?.enabled) {
      startAutoStartTimer(config.discord.autoStartAfterTimer.minutes);
    }

    return id;
  } catch (e) {
    console.error("Autodarts Tools: Discord Webhooks - Error sending webhook:", e);
    return null;
  }
}

/** Edit the announcement in place: the lobby is no longer open to join. */
async function markMessageStarted() {
  const words = announcedWords;
  if (!webhookMessageId || !webhookUrl || !words) return;

  const config = await AutodartsToolsConfig.getValue();

  const fields = config.discord.autoStartAfterTimer?.enabled
    ? [ ...announcedFields, spacerField(), { name: "", value: words.started, inline: false } ]
    : [];

  const response = await fetch(`${webhookUrl}/messages/${webhookMessageId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: `${TARGET} **${words.headline}** ${TARGET}\n\n_ _`,
      // Red, so a started game reads differently at a glance in the channel.
      embeds: [ embed(words.embedTitle, fields, 15158332) ],
    }),
  });

  const { id } = await response.json();
  await patchConfig({ messageId: id });
  console.log("Autodarts Tools: Discord Webhooks - Message updated:", id);
}

/** The announcement's own words, in the language autodarts is showing now. The edit reuses what the post wrote. */
function announcementWords(): AnnouncementWords {
  return {
    headline: t("discordWebhooks.message.headline"),
    embedTitle: t("discordWebhooks.message.embedTitle"),
    started: t("discordWebhooks.message.started"),
  };
}

function embed(title: string, fields: EmbedField[], color: number) {
  return {
    title,
    color,
    fields,
    image: { url: "https://i.imgur.com/lnkebyw.png" },
  };
}

/** Discord renders an empty field as a blank line; the value must be non-empty. */
function spacerField(): EmbedField {
  return { name: "\u200B", value: "\u200B", inline: false };
}

// -------------------------------------------------------------- lobby data

/** Host, then the game settings, as inline embed fields. */
async function buildLobbyFields(): Promise<EmbedField[]> {
  const lobbyData = await AutodartsToolsLobbyData.getValue();
  if (!lobbyData) return [];

  const fields: EmbedField[] = [];

  if (lobbyData.host?.name) {
    fields.push({ name: t("discordWebhooks.message.host"), value: lobbyData.host.name, inline: true });
  }

  for (const [ key, value ] of Object.entries(lobbyData.settings ?? {})) {
    if (typeof value === "object") continue;
    fields.push({ name: settingName(key, t), value: settingValue(key, value, t), inline: true });
  }

  // Bookkeeping the channel does not need.
  const skip = new Set([ "host", "settings", "players", "createdAt", "id", "isPrivate" ]);
  for (const [ key, value ] of Object.entries(lobbyData)) {
    if (skip.has(key) || typeof value === "object") continue;
    fields.push({ name: settingName(key, t), value: settingValue(key, value, t), inline: true });
  }

  return fields;
}

// ------------------------------------------------------------------ config

async function rememberMatchId(link: string) {
  await patchConfig({ matchId: link });
}

/** Merge into `discord.autoStartAfterTimer` without dropping the other keys. */
async function patchConfig(patch: { matchId?: string; messageId?: string }) {
  const config = await AutodartsToolsConfig.getValue();
  const current = config.discord.autoStartAfterTimer;

  await AutodartsToolsConfig.setValue({
    ...config,
    discord: {
      ...config.discord,
      autoStartAfterTimer: {
        enabled: current?.enabled ?? false,
        minutes: current?.minutes ?? 5,
        stream: current?.stream ?? false,
        matchId: patch.matchId ?? current?.matchId ?? "",
        messageId: patch.messageId ?? current?.messageId ?? "",
      },
    },
  });
}
