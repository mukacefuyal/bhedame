# bheda.me — Next.js satire board

A Pinterest-inspired **but intentionally distinct** satire/social board for `bheda.me`.

It supports:

- Photo + screenshot uploads
- Uploaded video
- YouTube / Vimeo embeds
- Text / hot-take cards
- Like + dislike reactions
- Comments + quick-comment chips
- Shareable post URLs at `/p/[id]`
- Search + category filters
- Responsive desktop masonry feed
- Full-width, uncropped mobile post feed
- Supabase Postgres + Supabase Storage
- Persistent serverless-safe rate limiting
- Duplicate/spam checks
- Vercel-ready Next.js App Router project

## 1. Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Without Supabase environment variables the homepage runs in demo mode. Publishing and real shared reactions/comments require Supabase.

## 2. Create or upgrade the Supabase backend

Open **Supabase → SQL Editor** and run the entire file:

```text
supabase/schema.sql
```

The SQL is idempotent, so you can run it over an existing bheda.me database. It creates/upgrades:

- `posts`
- `reactions`
- `comments`
- `rate_limit_events`
- `check_rate_limit(...)` PostgreSQL function
- public Storage bucket `media`
- indexes used by duplicate checks and rate limiting

**Important:** if you deploy this version without re-running `supabase/schema.sql`, publishing/comments/reactions will intentionally return a rate-limiter configuration error rather than silently running without protection.

## 3. Environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in:

```env
NEXT_PUBLIC_SITE_URL=https://bheda.me
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
RATE_LIMIT_SALT=YOUR_LONG_RANDOM_SECRET
```

Generate a salt with:

```bash
openssl rand -hex 32
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `RATE_LIMIT_SALT` to browser code and never prefix them with `NEXT_PUBLIC_`.

## 4. Abuse protection included

### Posts

- Maximum **4 post attempts per 10 minutes** per IP and visitor session
- Maximum **15 post attempts per day** per IP and visitor session
- Recent duplicate-post detection for the same publisher
- Repeated-character / repeated-word spam checks
- Link-count checks
- Basic embedded-HTML/script rejection
- Category allow-list
- Uploaded image/video URLs must come from the site's own Supabase `media` bucket
- Video embeds are restricted to valid YouTube/Vimeo URLs

### Comments

- Maximum **8 comments per minute**
- Maximum **40 comments per hour**
- Duplicate comment rejection within 10 minutes
- Repetition and excessive-link checks

### Reactions

- Maximum **60 reaction changes per minute**
- Database uniqueness still ensures only one current reaction per visitor/post

### Uploads

- Maximum **8 upload-token requests per 10 minutes**
- Maximum **30 per day**
- Images: **15 MB** maximum
- Videos: **120 MB** maximum
- MIME allow-list is checked by the API and backed up at the Supabase Storage bucket level

Rate-limit actor identifiers are one-way hashed before being stored. Raw IP addresses are not written into the application tables.

## 5. Deploy on Vercel

1. Push this folder to GitHub/GitLab/Bitbucket.
2. Import the repository into Vercel.
3. Add all five environment variables above in **Vercel → Project → Settings → Environment Variables**.
4. Run the updated `supabase/schema.sql` in Supabase.
5. Deploy/redeploy.
6. Test the Vercel preview URL.
7. When ready, attach `bheda.me` to the project.

After future code updates:

```bash
git add .
git commit -m "Update bheda.me"
git push
```

Vercel will redeploy automatically.

## Upload architecture

The browser does not proxy large media through a Vercel function. `/api/uploads/prepare` validates the request and creates a short-lived Supabase signed upload token. The browser then uploads directly to Supabase Storage.

Supported MIME types:

- JPEG
- PNG
- WebP
- GIF
- MP4
- WebM
- QuickTime/MOV

## Responsive feed behaviour

Desktop/tablet keeps the masonry layout, but image media is no longer height-cropped.

On phones (`<= 650px`):

- one post per row
- full-width media
- original image aspect ratio retained
- captions are not clamped
- long screenshots can be viewed at full width and scrolled naturally in the post detail view

## Recommended next protections for a large public launch

The included controls are a strong baseline for a small/medium anonymous site. For a larger public launch, consider Cloudflare Turnstile or another CAPTCHA on suspicious activity, user accounts/Supabase Auth, an admin moderation queue, reporting/takedown tools, and automated media moderation.
