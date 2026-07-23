import { customerPost, publicGet } from "./api";

export type SubscribeResult =
  | { status: "subscribed" }
  | { status: "unsupported" }
  | { status: "denied" }
  | { status: "error"; message: string };

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function isLikelyInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Line\/|FBAN|FBAV|Instagram/i.test(navigator.userAgent);
}

export async function subscribeWebPush(): Promise<SubscribeResult> {
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return { status: "unsupported" };
  }

  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch (err) {
    return { status: "error", message: errorMessage(err) };
  }
  if (permission !== "granted") {
    return { status: "denied" };
  }

  try {
    const { data } = await publicGet<{ publicKey: string }>("/public/vapid");
    if (!data.publicKey) {
      return { status: "error", message: "ไม่พบ VAPID public key จากเซิร์ฟเวอร์" };
    }
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey) as BufferSource,
    });
    const json = subscription.toJSON();
    await customerPost("/public/me/push", {
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    });
    return { status: "subscribed" };
  } catch (err) {
    return { status: "error", message: errorMessage(err) };
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "unknown error";
}
