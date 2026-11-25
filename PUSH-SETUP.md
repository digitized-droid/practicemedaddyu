# EUnify device push notification setup

**Push delivery requires this one-time Supabase setup.** A browser cannot reliably wake itself at a future time after it has been closed, so the server must send Web Push.

## Included behavior

- Device push, not Supabase Auth email.
- Each browser/device subscription belongs to exactly one signed-in account at a time. Signing in with another account automatically transfers that browser endpoint; signing out removes it from the old account while keeping the browser permission.
- Bill alerts use the due date and due time, the existing `Show reminder` interval, plus optional 24-hour, 12-hour, and 1-hour alerts.
- To-do alerts use 24 hours, 12 hours, and 1 hour before each actual occurrence’s due date/time. Daily, weekly, monthly, and custom recurrence intervals are respected; a weekly task does not generate daily alerts.
- Paid bills and completed tasks are excluded; pending jobs are rebuilt when saved.
- Existing repeating bill settings schedule the next 12 occurrences.
- Existing bills without a due time default to 9:00 AM.

Browser push services, browser permission, device power/network state and provider quotas still apply; literal unlimited or exact-second delivery cannot be guaranteed.

## 1. Generate VAPID keys

With Node.js/npm, run:

```bash
npx web-push generate-vapid-keys
```

Keep the private key secret. Put only the public key in `supabase-config.js`:

```js
window.EUNIFY_VAPID_PUBLIC_KEY = "YOUR_VAPID_PUBLIC_KEY";
```

Never place the VAPID private key or Supabase service-role key in browser code or the GitHub Pages repository.

## 2. Create database tables

Run `supabase/migrations/202611200001_eunify_push.sql` in the Supabase SQL Editor to create the subscriptions and scheduled-job tables. Then run `supabase/migrations/202611200002_eunify_push_account_isolation.sql` to enable safe per-device account reassignment and sign-out cleanup.

## 3. Deploy the Edge Function

Install and sign in to Supabase CLI, then:

```bash
supabase login
supabase link --project-ref ovpovvzyyiwxebdbwrzv
supabase functions deploy send-eunify-push --no-verify-jwt
```

Set these function secrets using your own values:

```bash
supabase secrets set \
  PUSH_CRON_SECRET="A_LONG_RANDOM_SECRET" \
  VAPID_PUBLIC_KEY="YOUR_VAPID_PUBLIC_KEY" \
  VAPID_PRIVATE_KEY="YOUR_VAPID_PRIVATE_KEY" \
  VAPID_SUBJECT="mailto:YOUR_REAL_CONTACT_EMAIL"
```

Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to hosted Edge Functions automatically. Do not add either key to browser files. If developing locally, configure the local Supabase environment according to the CLI documentation.

## 4. Schedule every minute

In the Supabase Dashboard's Edge Function scheduling/Cron area, schedule a `POST` request every minute (`* * * * *`) to:

`https://ovpovvzyyiwxebdbwrzv.supabase.co/functions/v1/send-eunify-push`

Headers:

- `Authorization: Bearer YOUR_PUSH_CRON_SECRET` (same value set above)
- `Content-Type: application/json`

Body: `{}`

Do not expose this cron secret in frontend code.

## 5. Publish and enable each device

Upload the updated website. Sign in, open **Settings → Device push notifications**, click **Enable on this device**, and grant browser permission. Repeat on each device/browser. Use HTTPS and a supported browser. On iPhone/iPad, Web Push requires adding the website to the Home Screen and granting permission from the installed web app.

## Notes

- Jobs are separate database rows, so the server can send them while the site is closed.
- If the SQL tables are missing, push setup will report an error; the expense tracker continues to work.
- The public VAPID key in `supabase-config.js` must match the public/private pair in Edge Function secrets.
- Cron runs every minute, so alerts are near their scheduled time, not guaranteed to the exact second.
