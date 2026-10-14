// Browser-only helper: registers this device for push notifications via Firebase.
export type PushResult =
  | { status: "registered"; token: string }
  | { status: "not-configured" | "unsupported" | "open-in-new-tab" | "denied" | "error" };

function config() {
  const appId = import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID'] as string | undefined;
  return {
    vapidKey: import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY'] as string | undefined,
    firebaseConfig: {
      apiKey: (import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY'] as string | undefined) ?? "",
      projectId: (import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID'] as string | undefined) ?? "",
      appId: appId ?? "",
      messagingSenderId: appId?.split(":")[1] ?? "",
    },
  };
}

export const pushSupported = () => typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;

// askPermission=false only refreshes the token when permission was already granted (no prompt).
export async function enablePush(askPermission = true): Promise<PushResult> {
  try {
    const { vapidKey, firebaseConfig } = config();
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId || !vapidKey || !firebaseConfig.messagingSenderId) {
      return { status: "not-configured" };
    }
    if (!pushSupported()) return { status: "unsupported" };
    const { isSupported, getMessaging, getToken, onMessage } = await import("firebase/messaging");
    const { initializeApp, getApps } = await import("firebase/app");
    if (!(await isSupported())) return { status: "unsupported" };
    if (window.top !== window.self) return { status: "open-in-new-tab" };

    let permission = Notification.permission;
    if (permission !== "granted") {
      if (!askPermission) return { status: "denied" };
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") return { status: "denied" };

    const query = new URLSearchParams(firebaseConfig).toString();
    const reg = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query}`);
    const app = getApps()[0] ?? initializeApp(firebaseConfig);
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: reg });
    // Show notifications even when the app is open on screen
    onMessage(messaging, (p) => {
      const n = p.notification ?? {};
      reg.showNotification(n.title ?? "Study Arena", { body: n.body ?? "", icon: "/icon-192.png" });
    });
    return token ? { status: "registered", token } : { status: "denied" };
  } catch (e) {
    console.error("push setup failed", e);
    return { status: "error" };
  }
}
