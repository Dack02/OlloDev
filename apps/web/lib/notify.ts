import { toast } from "sonner";
import {
  useNotificationStore,
  type NotificationType,
} from "@/stores/notification-store";

function fire(
  type: NotificationType,
  title: string,
  message?: string,
  options?: { duration?: number }
) {
  // Fire Sonner toast
  toast[type](title, {
    description: message,
    duration: options?.duration,
  });

  // Persist to notification store
  useNotificationStore.getState().add({ type, title, message });
}

export const notify = {
  success: (title: string, message?: string, options?: { duration?: number }) =>
    fire("success", title, message, options),

  error: (title: string, message?: string, options?: { duration?: number }) =>
    fire("error", title, message, options),

  warning: (title: string, message?: string, options?: { duration?: number }) =>
    fire("warning", title, message, options),

  info: (title: string, message?: string, options?: { duration?: number }) =>
    fire("info", title, message, options),

  /** Promise-based toast that also logs the result to the notification store */
  promise: <T>(
    promise: Promise<T>,
    msgs: { loading: string; success: string; error: string }
  ) => {
    toast.promise(promise, msgs);
    promise
      .then(() =>
        useNotificationStore
          .getState()
          .add({ type: "success", title: msgs.success })
      )
      .catch(() =>
        useNotificationStore
          .getState()
          .add({ type: "error", title: msgs.error })
      );
    return promise;
  },
};
