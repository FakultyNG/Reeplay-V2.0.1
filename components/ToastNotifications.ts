export type ToastType = 'success' | 'error' | 'info';

export type AppToastPayload = {
  type: ToastType;
  text: string;
};

type Listener = (toast: AppToastPayload | null) => void;

let listener: Listener | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
const VISIBILITY_MS = 4000;

const FALLBACK_MESSAGES: Record<ToastType, string> = {
  success: 'Done',
  info: 'Updated',
  error: 'Please try again.',
};

function formatMessage(type: ToastType, text?: string) {
  if (typeof text !== 'string') return FALLBACK_MESSAGES[type];

  const message = text
    .trim()
    .replace(/^(server\s+error|axioserror|error)\s*:\s*/i, '')
    .replace(/^opps!?/i, 'Sorry,');

  if (!message || /^(undefined|null|failed|\[object Object\])$/i.test(message)) {
    return FALLBACK_MESSAGES[type];
  }

  if (
    type === 'error' &&
    /(network request failed|failed to fetch|network error|service timeout|timed?\s*out)/i.test(
      message,
    )
  ) {
    return 'Check your connection and try again.';
  }

  if (
    type === 'error' &&
    /(unauthorized|jwt expired|token expired|invalid token|session expired)/i.test(
      message,
    )
  ) {
    return 'Your session has expired. Please sign in again.';
  }

  if (
    type === 'error' &&
    /^(something went wrong|internal server error|request failed with status code \d+|http error.*)\.?$/i.test(
      message,
    )
  ) {
    return 'Please try again.';
  }

  return message;
}

export function subscribeAppToast(next: Listener) {
  listener = next;
  return () => {
    if (listener === next) {
      listener = null;
    }
  };
}

export function hideAppToast() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  listener?.(null);
}

const ToastNotification = (type: ToastType, text?: string) => {
  const message = formatMessage(type, text);

  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }

  listener?.({ type, text: message });
  hideTimer = setTimeout(() => {
    hideTimer = null;
    listener?.(null);
  }, VISIBILITY_MS);
};

export default ToastNotification;
