# bheda.me — Next.js satire board

A Pinterest-inspired **but intentionally distinct** masonry social board built for `bheda.me`. It supports:

- Photo + screenshot uploads
- Uploaded video
- YouTube / Vimeo embeds
- Text / hot-take cards
- Like + dislike reactions
- Comments + quick-reaction comment chips
- Shareable post URLs at `/p/[id]`
- Search + category filters
- Mobile bottom navigation and comments-style bottom sheet
- Supabase Postgres + Supabase Storage
- Vercel-ready Next.js App Router project

The UI is original rather than a pixel-for-pixel Pinterest copy: masonry feed, rounded media cards, circular actions and a mobile comments sheet are used as general interaction patterns.

## 1. Run it locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Without Supabase environment variables the homepage runs in **demo mode** using sample posts. Likes are optimistic and comments are stored in the current browser for demo posts. Publishing/uploading requires Supabase.

## 2. Create Supabase backend

Create a Supabase project, then open **SQL Editor** and run:

```text
supabase/schema.sql
```

This creates:

- `posts`
- `reactions`
- `comments`
- public Storage bucket `media`

RLS is enabled for the tables. The app accesses the database through server routes with the service-role key, so no public table policies are added.

## 3. Add environment variables

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
```

**Never expose `SUPABASE_SERVICE_ROLE_KEY` in the browser or prefix it with `NEXT_PUBLIC_`.**

## 4. Deploy on Vercel

1. Push this folder to GitHub/GitLab/Bitbucket.
2. Import the repository into Vercel.
3. Add the four environment variables above in Vercel → Project → Settings → Environment Variables.
4. Deploy.
5. If `bheda.me` is already attached to another Vercel project, remove/move the domain from the old project and add it to this one. Your DNS can normally remain on Vercel.

## Upload architecture

The browser does **not** send the whole media file through a Next.js server function. `/api/uploads/prepare` creates a short-lived Supabase signed upload token, then the browser uploads directly to Supabase Storage. This is much better for video than proxying the file through Vercel.

Supported upload MIME types in the starter:

- JPEG, PNG, WebP, GIF
- MP4, WebM, QuickTime/MOV

You can add size limits in `app/api/uploads/prepare/route.ts` and your client before upload. For a public site, also add abuse controls/rate limiting before launch.

## Useful next steps before public launch

- Add sign-in (Supabase Auth) if you want named accounts rather than anonymous visitor IDs.
- Add admin moderation/reporting and delete controls.
- Add rate limiting / bot protection for comments and reactions.
- Add thumbnail generation/transcoding for large video.
- Add `nsfw`, copyright-reporting and moderation workflows if users can upload arbitrary media.
- Add pagination/infinite loading once the post count grows.

## Project structure

```text
app/
  api/
    posts/
    uploads/prepare/
  create/
  p/[id]/
components/
lib/
supabase/schema.sql
```
