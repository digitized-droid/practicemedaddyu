import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cronSecret = Deno.env.get("PUSH_CRON_SECRET")!;
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";
webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) return new Response("Unauthorized", { status: 401 });
  const now = new Date().toISOString();
  const { data: jobs, error } = await admin.from("eunify_notification_jobs").select("id,user_id,title,body,dedupe_key").eq("status", "pending").lte("scheduled_at", now).order("scheduled_at", { ascending: true }).limit(100);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  let sent = 0, failed = 0, noDevice = 0;
  for (const job of jobs || []) {
    const { data: devices, error: deviceError } = await admin.from("eunify_push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", job.user_id);
    if (deviceError) { failed++; continue; }
    if (!devices?.length) { noDevice++; await admin.from("eunify_notification_jobs").update({ status: "failed" }).eq("id", job.id); continue; }
    let delivered = false;
    for (const device of devices) {
      try {
        await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, JSON.stringify({ title: job.title, body: job.body, tag: job.dedupe_key }), { TTL: 86400 });
        delivered = true;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) await admin.from("eunify_push_subscriptions").delete().eq("id", device.id);
        console.error("Push delivery failed", statusCode, err);
      }
    }
    if (delivered) { await admin.from("eunify_notification_jobs").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", job.id); sent++; }
    else { await admin.from("eunify_notification_jobs").update({ status: "failed" }).eq("id", job.id); failed++; }
  }
  return Response.json({ checked: jobs?.length || 0, sent, failed, noDevice });
});
