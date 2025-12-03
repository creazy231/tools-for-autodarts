import { AutodartsToolsConfig } from "@/utils/storage";
import type { IConfig } from "@/utils/storage";
import { AutodartsToolsGameData } from "@/utils/game-data-storage";
import { backgroundFetch, safeClone } from "@/utils/helpers";
import type { IMatch } from "@/utils/websocket-helpers";

let unwatchGameData: (() => void) | null = null;
let lastMatchId: string | null = null;
let lastMatchSnapshot = "";
const processedThrowIds = new Set<string>();
const processedThrowIdsQueue: string[] = [];
const MAX_TRACKED_THROWS = 500;

export async function initWebhooks() {
  if (unwatchGameData) return;

  unwatchGameData = AutodartsToolsGameData.watch(handleGameDataUpdate);
}

export function removeWebhooks() {
  if (unwatchGameData) {
    unwatchGameData();
    unwatchGameData = null;
  }

  processedThrowIds.clear();
  processedThrowIdsQueue.length = 0;
  lastMatchId = null;
  lastMatchSnapshot = "";
}

async function handleGameDataUpdate(current: { match?: IMatch }) {
  const config = await AutodartsToolsConfig.getValue();
  const webhookConfig = config?.webhooks;
  if (!webhookConfig?.enabled || !webhookConfig.url) return;

  const match = current?.match;
  if (!match) return;

  if (lastMatchId && match.id !== lastMatchId) {
    processedThrowIds.clear();
    processedThrowIdsQueue.length = 0;
    lastMatchSnapshot = "";
  }
  lastMatchId = match.id;

  if (webhookConfig.payloadTypes.match) {
    const snapshot = JSON.stringify(match);
    if (snapshot && snapshot !== lastMatchSnapshot) {
      lastMatchSnapshot = snapshot;
      dispatchWebhook("match_state", { match: safeClone(match) }, webhookConfig);
    }
  }

  if (webhookConfig.payloadTypes.throws) {
    processThrows(match, webhookConfig);
  }
}

function processThrows(match: IMatch, webhookConfig: IConfig["webhooks"]) {
  const turns = match.turns || [];
  for (const turn of turns) {
    const throws = turn.throws || [];
    for (let index = 0; index < throws.length; index += 1) {
      const throwData = throws[index];
      const throwKey = throwData.id ? `${turn.id}:${throwData.id}` : `${turn.id}:${index}:${throwData.createdAt}`;
      if (processedThrowIds.has(throwKey)) continue;

      processedThrowIds.add(throwKey);
      processedThrowIdsQueue.push(throwKey);
      if (processedThrowIdsQueue.length > MAX_TRACKED_THROWS) {
        const oldest = processedThrowIdsQueue.shift();
        if (oldest) processedThrowIds.delete(oldest);
      }

      dispatchWebhook(
        "throw",
        {
          matchId: match.id,
          turnId: turn.id,
          playerId: turn.playerId,
          playerName: match.players?.find(player => player.id === turn.playerId)?.name,
          leg: match.leg,
          set: match.set,
          round: turn.round,
          score: turn.score,
          throw: safeClone(throwData),
        },
        webhookConfig,
      );
    }
  }
}

async function dispatchWebhook(event: string, data: Record<string, any>, webhookConfig: IConfig["webhooks"]) {
  const payload = {
    event,
    timestamp: new Date().toISOString(),
    source: "Tools for Autodarts",
    matchId: data.match?.id ?? data.matchId,
    variant: (data.match as IMatch)?.variant || undefined,
    data,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-TARGET-URL": webhookConfig.url,
  };

  if (webhookConfig.token) {
    headers.Authorization = `Bearer ${webhookConfig.token}`;
    headers["X-Autodarts-Tools-Webhook-Token"] = webhookConfig.token;
  }

  const proxyUrl = "https://adt-proxy.tobias-thiele.de/webhook";

  try {
    const response = await backgroundFetch(proxyUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error(
        "Autodarts Tools: Webhook failed",
        event,
        webhookConfig.url,
        response.status,
        response.statusText ?? response.error,
      );
      return;
    }
    console.log(
      "Autodarts Tools: Sent webhook",
      event,
      webhookConfig.url,
      "status",
      response.status,
      response.statusText || response.error,
    );
  } catch (error) {
    console.error("Autodarts Tools: Webhook error", event, webhookConfig.url, error);
  }
}


