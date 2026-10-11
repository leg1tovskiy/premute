/**
 * Custom event helper for real-time synchronization of action logs across the app.
 */
export function notifyActionLogUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("action-log-updated"));
    // Secondary ping after 500ms to catch any slightly delayed DB writes
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("action-log-updated"));
    }, 500);
  }
}
