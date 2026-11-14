export type NotificationOpenData = Record<string, string | undefined>;

type Handler = (data: NotificationOpenData) => void | Promise<void>;

let handler: Handler | null = null;
let pending: NotificationOpenData | null = null;
let lastMessageId: string | undefined;

export function queueNotificationOpen(data?: NotificationOpenData | null) {
  if (!data) return;
  const messageId = data._messageId;
  if (messageId && messageId === lastMessageId) return;
  if (messageId) lastMessageId = messageId;

  if (handler) {
    handler(data);
  } else {
    pending = data;
  }
}

export function registerNotificationOpenHandler(nextHandler: Handler) {
  handler = nextHandler;
  if (pending) {
    const data = pending;
    pending = null;
    handler(data);
  }

  return () => {
    if (handler === nextHandler) handler = null;
  };
}
