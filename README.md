# bheda.me — Next.js satire board v3

A Pinterest-inspired, original visual satire/social board for `bheda.me`.

## Included

- Responsive masonry feed that uses the full desktop width
- Full-width, uncropped mobile posts
- Photo and screenshot uploads
- Uploaded video
- YouTube / Vimeo embeds
- Text / satire posts
- Like + dislike reactions
- Comments + quick-comment chips
- Search + category filters
- 5-item mobile navigation: Home / Search / Create / Random / Me
- Supabase Auth with automatic anonymous sessions
- Email magic-link login from the account panel
- Supabase Postgres + Storage
- Persistent Vercel-safe rate limiting and duplicate/spam checks

## 1. Install and run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 2. Supabase database

Open **Supabase → SQL Editor** and run the complete file:

```text
supabase/schema.sql
```

It is safe to run over the earlier bheda.me schema. v3 adds `author_id` to posts/comments and changes the default public name to `Anonymous bheda`.

## 3. Enable Supabase anonymous login

In the Supabase dashboard, enable **Anonymous Sign-Ins** under Authentication settings/providers.

The browser now automatically calls Supabase anonymous auth when a visitor has no existing session. The Supabase user UUID is used for reactions, comments, post ownership metadata and rate-limit identity. A local visitor ID remains only as a fallback.

For email login, keep the Email provider enabled. The account panel sends a magic link with `signInWithOtp`. Add these to Supabase Auth URL configuration as appropriate:

```text
Site URL: https://bheda.me
Redirect URL: https://bheda.me/**
```

For local development also allow:

```text
http://localhost:3000/**
```

## 4. Environment variables

```env
NEXT_PUBLIC_SITE_URL=https://bheda.me
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
RATE_LIMIT_SALT=YOUR_LONG_RANDOM_SECRET
```

Generate the rate-limit salt with:

```bash
openssl rand -hex 32
```

Never expose the service-role key or rate-limit salt in browser code.

## 5. Auth behaviour

- First visit: automatically creates/restores a Supabase anonymous session.
- Public display name: `Anonymous bheda` by default.
- Desktop: click the `B` account button.
- Mobile: tap **Me**.
- Anonymous users can request an email magic-link login.
- Signed-in users can return to a fresh anonymous session.
- API requests send the Supabase access token as a Bearer token.
- Server routes validate that token with Supabase and use the authenticated UUID as the primary actor ID.

## 6. Abuse protection

Posts:
- 4 attempts / 10 minutes
- 15 attempts / day
- duplicate recent-post detection
- repeated-character / repeated-word checks
- excessive-link checks
- HTML/script rejection
- category allow-list

Comments:
- 8 / minute
- 40 / hour
- duplicate-comment rejection within 10 minutes

Reactions:
- 60 changes / minute
- one current reaction per actor/post

Uploads:
- 8 upload-token requests / 10 minutes
- 30 / day
- images up to 15 MB
- videos up to 120 MB
- MIME allow-list
- upload path is namespaced by authenticated/anonymous Supabase user ID

Rate limits still include a hashed IP key as a second layer. Raw IP addresses are not stored by the app tables.

## 7. Desktop layout change

The feed is no longer capped to the older narrow content area. It now uses almost the full browser width and calculates the number of masonry columns from a target column width, so wide desktop screens do not leave a large unused right side.

## 8. Mobile navigation

The bottom navigation now has five functional items:

```text
Home | Search | + Create | Random | Me
```

`Create` is the exact centre item. Search focuses the real header search field, Random opens a random currently available post, and Me opens the Supabase account/login panel.

## 9. Deploy to Vercel

1. Push this folder to your existing Git repository.
2. Run the updated `supabase/schema.sql` in Supabase.
3. Enable Anonymous Sign-Ins in Supabase Auth.
4. Confirm the five environment variables are present in Vercel.
5. Redeploy.

Future updates:

```bash
git add .
git commit -m "Update bheda.me"
git push
```

Vercel will deploy automatically.
