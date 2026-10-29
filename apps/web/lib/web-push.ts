"use client";

const SERVICE_WORKER_URL = "/sw.js";

export type PushSupport = "supported" | "unsupported" | "needs-install";

/**
 * iOS only exposes the Push API to web apps added to the home screen, so a
 * regular Safari tab reports "needs-install" instead of "unsupported".
 */
export function getPushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";

  const supported =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (supported) return "supported";

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return isIos ? "needs-install" : "unsupported";
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register(SERVICE_WORKER_URL);
  return navigator.serviceWorker.ready;
}

export async function getCurrentPushEndpoint(): Promise<string | null> {
  if (getPushSupport() !== "supported") return null;
  const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_URL);
  const subscription = await registration?.pushManager.getSubscription();
  return subscription?.endpoint ?? null;
}

export type BrowserPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent: string;
};

/** Asks for permission and subscribes this browser. Throws if permission is denied. */
export async function subscribeBrowserToPush(publicKey: string): Promise<BrowserPushSubscription> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted. Allow it in your browser settings.");
  }

  const registration = await getRegistration();
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error("This browser returned an incomplete push subscription.");
  }

  return {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    userAgent: navigator.userAgent.slice(0, 512),
  };
}

export async function unsubscribeBrowserFromPush(): Promise<string | null> {
  const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_URL);
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return null;

  const { endpoint } = subscription;
  await subscription.unsubscribe();
  return endpoint;
}
