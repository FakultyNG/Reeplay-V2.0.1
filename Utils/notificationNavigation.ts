export type NotificationOpenData = Record<string, string | undefined>;

type Handler = (data: NotificationOpenData) => void | Promise<void>;
type ReceivedHandler = (data: NotificationOpenData) => void | Promise<void>;

let handler: Handler | null = null;
let pending: NotificationOpenData | null = null;
let lastMessageId: string | undefined;
const receivedHandlers = new Set<ReceivedHandler>();

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

export function notifyNotificationReceived(data: NotificationOpenData = {}) {
  receivedHandlers.forEach(receivedHandler => receivedHandler(data));
}

export function registerNotificationReceivedHandler(nextHandler: ReceivedHandler) {
  receivedHandlers.add(nextHandler);
  return () => {
    receivedHandlers.delete(nextHandler);
  };
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
