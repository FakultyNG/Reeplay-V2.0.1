export type ToastType = 'success' | 'error' | 'info';

export type AppToastPayload = {
  type: ToastType;
  text: string;
};

type Listener = (toast: AppToastPayload | null) => void;

let listener: Listener | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
const VISIBILITY_MS = 4000;

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
  const message =
    typeof text === 'string' && text.trim() && text !== 'undefined'
      ? text.trim()
      : type === 'success'
        ? 'SUCCESSFULL'
        : type === 'info'
          ? 'UPDATED'
          : 'FAILED';

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
