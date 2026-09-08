-- Run this once in Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 180),
  caption text,
  category text not null default 'Satire',
  media_type text not null check (media_type in ('image','video','embed','text')),
  media_url text,
  embed_url text,
  source_url text,
  author_name text not null default 'Guest sheep',
  created_at timestamptz not null default now()
);

create table if not exists public.reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  visitor_id text not null,
  reaction smallint not null check (reaction in (-1,1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (post_id, visitor_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  visitor_id text not null,
  author_name text not null default 'Guest sheep',
  body text not null check (char_length(body) between 1 and 600),
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists reactions_post_id_idx on public.reactions(post_id);
create index if not exists comments_post_id_created_at_idx on public.comments(post_id, created_at desc);

alter table public.posts enable row level security;
alter table public.reactions enable row level security;
alter table public.comments enable row level security;

-- App database access is intentionally server-only via SUPABASE_SERVICE_ROLE_KEY.
-- No public table policies are required.

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = excluded.public;
