// Web Push subscription. On iPhone this only works once the app is added to the
// Home Screen (iOS 16.4+) and opened from there.
import { supabase, isDemo } from './supabase.js';

async function vapidPublicKey() {
  const { data, error } = await supabase.rpc('get_vapid_public_key');
  if (error) throw error;
  if (!data) throw new Error('Reminders are not set up on the server yet.');
  return data;
}

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function pushSupport() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (ios && !standalone) return 'Add this page to your Home Screen first, then open it from there.';
    return 'This browser does not support push notifications.';
  }
  if (isDemo) return 'Connect Supabase to turn on reminders.';
  return null;
}

export async function enablePush() {
  const problem = pushSupport();
  if (problem) throw new Error(problem);
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications were not allowed.');
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(await vapidPublicKey()) }));
  const { endpoint, keys } = sub.toJSON();
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ endpoint, p256dh: keys.p256dh, auth: keys.auth }, { onConflict: 'endpoint' });
  if (error) throw error;
}

export async function disablePush() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  if (supabase) await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

export async function sendTestPush() {
  const { data, error } = await supabase.functions.invoke('send-reminders', { body: { test: true } });
  if (error) throw error;
  if (!data?.sent) throw new Error('No device subscriptions found.');
}
