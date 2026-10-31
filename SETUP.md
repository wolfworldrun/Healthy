# Nutrient Journal — setup

Everything here runs on free tiers. Total cost: **$0/month** for one person.

| Piece | Service | Free limit (you'll use a tiny fraction) |
|---|---|---|
| Database, Google sign-in, reminder function | Supabase Free | 500 MB database, 50,000 monthly users, 500,000 function calls/month |
| Hosting (needs HTTPS for the home-screen app) | Vercel, Netlify, or Cloudflare Pages | Free hobby plans |
| Google sign-in credentials | Google Cloud Console | Free |
| Food data | USDA FoodData Central + Open Food Facts | Free (USDA key is free) |

One catch with the free Supabase tier: a project is **paused after 7 days without activity**. Daily use keeps it awake. If it ever pauses, click "Restore" in the dashboard. Your data is kept.

## 0. Try it locally first (no setup)

```bash
npm install
```

```bash
npm run dev
```

Without a `.env` file the app runs in **demo mode** and saves to the browser only. Everything works except sign-in, sync, and reminders.

## 1. Supabase project

1. Create a project at https://supabase.com/dashboard.
2. **SQL Editor** → paste and run `supabase/migrations/0001_init.sql`.
3. **Project Settings → API**: copy the Project URL and the `anon` public key.
4. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## 2. Google sign-in

1. In https://console.cloud.google.com create a project, then **APIs & Services → OAuth consent screen** (External, add your own email as a test user).
2. **Credentials → Create credentials → OAuth client ID** → *Web application*.
   - Authorized redirect URI: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
3. In Supabase: **Authentication → Sign In / Providers → Google** → paste the client ID and secret, then enable it.
4. **Authentication → URL Configuration**: set the Site URL to `https://healthy-journal.vercel.app`, and add both `https://healthy-journal.vercel.app` and `http://localhost:5173` under Redirect URLs.

## 3. Food search key

Get a free key at https://fdc.nal.usda.gov/api-key-signup and put it in `VITE_USDA_API_KEY`. (`DEMO_KEY` works but only allows about 30 searches an hour.)

## 4. Reminders (web push)

Already done for project `lsxzzzgkkphjauxcakog`:
- `0002_reminders.sql` enables `pg_cron` + `pg_net` and schedules the check every 15 minutes.
- `project_url` and `cron_secret` are stored in Supabase Vault (see the bottom of that file for the two one-time `vault.create_secret` lines).
- The `send-reminders` function (deployed with JWT verification off; it checks the cron secret or the user's login itself) creates its own push keys on its first run and keeps them in Vault. No keys go in `.env`.

To redeploy the function after editing it: `npx supabase functions deploy send-reminders --no-verify-jwt --project-ref lsxzzzgkkphjauxcakog`.

## 5. Host it

Live at **https://healthy-journal.vercel.app** (Vercel project `nutrient-journal`, built from the `main` branch of `wolfworldrun/Healthy`). The project already has the three `VITE_…` variables. `nutrient-journal.vercel.app` also still serves the same app.

## 6. Put it on your phone

**iPhone (iOS 16.4 or newer):** open the site in **Safari** → Share → **Add to Home Screen**. Open it from the home-screen icon, go to settings (gear) → turn on reminders → allow notifications. On iPhone, push notifications only work in the home-screen version, not in a Safari tab.

**Android:** open in Chrome → menu → **Install app**.

Use "send a test nudge" in settings to confirm notifications arrive.

## How the goals are calculated

- **Calories:** Mifflin–St Jeor BMR × activity level, −500 kcal/day to lose weight or +300 to gain. Never below 1,200 (1,500 for male). Half of the calories you burn exercising are added back.
- **Protein:** 1.6 g per kg of goal weight. **Fat:** 28% of calories. **Carbs:** the rest.
- **Water:** 35 ml per kg of body weight, plus about 350 ml for every 30 minutes of exercise.
- **Exercise burn:** MET values × body weight × time.
- Any goal can be overridden in settings.

**The doll** compares your progress on each goal to how far through your day you are (based on your reminder hours). She droops when you fall behind pace, and perks back up as you catch up.
