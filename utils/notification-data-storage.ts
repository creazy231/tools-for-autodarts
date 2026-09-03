/**
 * The last notification the site received over `autodarts.notifications`.
 *
 * The site subscribes to this channel for the signed-in user on every page,
 * and each frame is one notification: a friend request, a lobby invite, a
 * tournament invite, or — the one Sound FX listens for — the ready-up call for
 * a tournament match. Every frame names its kind in `type`, which is the same
 * string in every language the site is displayed in; the words the site draws
 * for it are not, which is why the ready-up sound no longer looks for them.
 *
 * `receivedAt` is ours. Two ready-up calls in a row would otherwise be equal
 * values, and a storage watcher only wakes for a change.
 */
export interface INotification {
  id?: string;
  /** e.g. `tournament:match-ready`, `lobby:invite`, `friend-list:request`. */
  type: string;
  level?: string;
  createdAt?: string;
  expiresAt?: string;
  body?: Record<string, any>;
  receivedAt: number;
}

/** A tournament match of yours is ready and waiting for you to mark ready. */
export const NOTIFICATION_TOURNAMENT_MATCH_READY = "tournament:match-ready";

export const AutodartsToolsNotificationData: WxtStorageItem<INotification | undefined, any> = storage.defineItem(
  "local:notification-data",
  {
    defaultValue: undefined,
  },
);
