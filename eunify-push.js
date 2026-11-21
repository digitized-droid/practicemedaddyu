/* EUnify Web Push client. Requires the SQL + Edge Function setup in PUSH-SETUP.md. */
(() => {
  'use strict';
  const DAY = 86400000;
  const b64ToBytes = value => {
    const padding = '='.repeat((4 - value.length % 4) % 4);
    const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, c => c.charCodeAt(0));
  };
  const dueDate = (date, time='09:00') => {
    if (!date) return null;
    const d = new Date(`${date}T${time || '09:00'}:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const addMonths = (date, count) => {
    const d = new Date(date);
    const day = d.getDate();
    d.setDate(1); d.setMonth(d.getMonth() + count);
    const last = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
    d.setDate(Math.min(day, last));
    return d;
  };
  function billOccurrences(bill) {
    const first = dueDate(bill.dueDate, bill.dueTime || '09:00');
    if (!first) return [];
    const repeat = bill.repeat || 'once';
    if (repeat === 'once') return [first];
    const out = [];
    for (let i=0; i<12; i++) {
      let d;
      if (repeat === 'daily') d = new Date(first.getTime()+i*DAY);
      else if (repeat === 'weekdays') {
        d = new Date(first);
        let added=0, cursor=new Date(first);
        while (added<i) { cursor=new Date(cursor.getTime()+DAY); if (![0,6].includes(cursor.getDay())) added++; }
        d=cursor;
      } else if (repeat === 'weekly') d = new Date(first.getTime()+i*7*DAY);
      else if (repeat === 'monthly') d = addMonths(first,i);
      else if (repeat === 'yearly') { d=new Date(first); d.setFullYear(first.getFullYear()+i); }
      else d = first;
      if (d) out.push(d);
    }
    return out;
  }
  function buildJobs(state) {
    const prefs = state.notificationSettings || {notify24h:true, notify12h:true};
    const now = Date.now();
    const jobs = [];
    const add = (source, itemId, title, dueAt, offsetMs, label) => {
      const at = dueAt.getTime() - offsetMs;
      if (dueAt.getTime() <= now || at > dueAt.getTime()) return;
      // If a user adds/edits a reminder after its advance-alert time, queue it now
      // rather than silently losing that alert. The due event itself must still be future.
      const scheduled = new Date(Math.max(at, now)).toISOString();
      const dueLabel = dueAt.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
      const dedupe = `${source}:${itemId}:${dueAt.toISOString()}:${offsetMs}`;
      jobs.push({dedupe_key:dedupe,title:`EUnify · ${label}`,body:`${title} is due ${dueLabel}.`,scheduled_at:scheduled,status:'pending'});
    };
    for (const bill of (state.bills || [])) {
      if (bill.paid || !bill.dueDate) continue;
      for (const dueAt of billOccurrences(bill)) {
        const lead = Math.max(0, Number(bill.reminderLeadDays ?? 30) || 0);
        add('bill',bill.id,bill.name || 'Your reminder',dueAt,lead*DAY,lead===0?'Due date reminder':`${lead} day${lead===1?'':'s'} before`);
        if (prefs.notify24h !== false) add('bill',bill.id,bill.name || 'Your reminder',dueAt,DAY,'24-hour reminder');
        if (prefs.notify12h !== false) add('bill',bill.id,bill.name || 'Your reminder',dueAt,12*60*60*1000,'12-hour reminder');
      }
    }
    for (const task of (state.schedules || [])) {
      if (task.done || !task.date) continue;
      const dueAt = dueDate(task.date, task.time || '09:00');
      if (!dueAt) continue;
      if (prefs.notify24h !== false) add('task',task.id,task.title || 'Your task',dueAt,DAY,'24-hour task reminder');
      if (prefs.notify12h !== false) add('task',task.id,task.title || 'Your task',dueAt,12*60*60*1000,'12-hour task reminder');
    }
    const unique = new Map(jobs.map(job=>[job.dedupe_key,job]));
    return [...unique.values()];
  }
  function withTimeout(promise, label, ms=15000) {
    let timer;
    return Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} is taking too long. Please check your connection and try again.`)), ms); })
    ]).finally(() => clearTimeout(timer));
  }
  async function getPushRegistration() {
    // Prefer the registration for this app's own scope. Do not wait forever on
    // serviceWorker.ready if an install/update is stalled by an optional asset.
    let registration = await withTimeout(navigator.serviceWorker.getRegistration(new URL('./', location.href)), 'Checking this device’s service worker', 10000);
    if (!registration) registration = await withTimeout(navigator.serviceWorker.register('./service-worker.js'), 'Registering this device', 15000);
    if (registration.active) return registration;
    const worker = registration.installing || registration.waiting;
    if (worker) {
      await withTimeout(new Promise((resolve, reject) => {
        if (worker.state === 'activated') return resolve();
        const onState = () => {
          if (worker.state === 'activated') { worker.removeEventListener('statechange', onState); resolve(); }
          else if (worker.state === 'redundant') { worker.removeEventListener('statechange', onState); reject(new Error('The notification service worker could not activate. Reload EUnify and try again.')); }
        };
        worker.addEventListener('statechange', onState);
        onState();
      }), 'Activating the notification service worker', 15000);
      if (registration.active) return registration;
    }
    return withTimeout(navigator.serviceWorker.ready, 'Waiting for the notification service worker', 15000);
  }
  async function saveSubscriptionForUser(client, userId, subscription) {
    if (!client || !userId || !subscription) return false;
    const json = subscription.toJSON();
    const {error} = await withTimeout(client.rpc('register_eunify_push_subscription', {
      p_endpoint: json.endpoint,
      p_p256dh: json.keys?.p256dh,
      p_auth: json.keys?.auth
    }), 'Connecting this device to your EUnify account');
    if (error) throw new Error(`Could not assign this device to the signed-in account: ${error.message}. Apply the latest push SQL migration.`);
    return true;
  }
  async function bindExisting(client, userId) {
    if (!client || !userId || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    const registration = await getPushRegistration();
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return false;
    return saveSubscriptionForUser(client, userId, subscription);
  }
  async function disable(client, userId) {
    if (!client || !userId || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    const registration = await getPushRegistration();
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return false;
    const {error} = await client.rpc('unregister_eunify_push_subscription', {p_endpoint: subscription.endpoint});
    if (error) throw new Error(`Could not remove this device from the signed-out account: ${error.message}.`);
    // Keep the browser permission and PushSubscription. A later account can claim
    // this same endpoint after signing in, without asking for permission again.
    return true;
  }
  async function enable(client, userId) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('This browser does not support Web Push. Try installing EUnify in a supported browser.');
    if (!('Notification' in window)) throw new Error('This browser does not support device notifications.');
    const publicKey = window.EUNIFY_VAPID_PUBLIC_KEY;
    if (!publicKey || publicKey.includes('PASTE_')) throw new Error('Push setup is not finished: add the VAPID public key to supabase-config.js first.');
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Notification permission was not granted.');
    const registration = await getPushRegistration();
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) subscription = await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToBytes(publicKey)});
    await saveSubscriptionForUser(client, userId, subscription);
    return subscription;
  }
  async function syncJobs(client,userId,state) {
    if (!client || !userId) return;
    const jobs = buildJobs(state);
    // Never re-arm an alert that this account has already received.
    const {data:sentRows,error:sentError} = await client.from('eunify_notification_jobs').select('dedupe_key').eq('user_id',userId).eq('status','sent');
    if (sentError) throw sentError;
    const alreadySent = new Set((sentRows || []).map(row=>row.dedupe_key));
    const unsentJobs = jobs.filter(job=>!alreadySent.has(job.dedupe_key));
    // Rebuild pending jobs after every save so edits, paid bills and completed tasks cancel stale alerts.
    const {error:deleteError} = await client.from('eunify_notification_jobs').delete().eq('user_id',userId).eq('status','pending');
    if (deleteError) throw deleteError;
    if (!unsentJobs.length) return;
    const rows = unsentJobs.map(job=>({...job,user_id:userId}));
    const {error} = await client.from('eunify_notification_jobs').upsert(rows,{onConflict:'user_id,dedupe_key'});
    if (error) throw error;
  }
  window.EUnifyPush = {enable,bindExisting,disable,syncJobs,buildJobs};
})();
