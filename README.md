# wedding-photo-game

Photo game for Bára & Matěj's wedding. Guests join a team, spin a wheel of photo
tasks, snap pictures, and teammates sync in realtime.

Stack: Next.js (App Router) + Tailwind + shadcn/ui, Supabase (Postgres + Realtime),
Cloudflare R2 for image storage, hosted on Vercel.

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment variables

Fill in `.env.local`: Supabase URL + publishable anon key, Cloudflare R2
credentials (account ID, access key, secret, bucket) and the public r2.dev URL.
See `supabase/migrations` + `supabase/seed.sql` for the database bootstrap.

## Deploy

Import the repo into Vercel, paste the same env vars, deploy. HTTPS is required
for camera access.
