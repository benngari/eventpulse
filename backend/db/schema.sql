-- ============================================================
--  Event Discovery System — Supabase Schema
--  Run this in your Supabase SQL editor (free tier)
-- ============================================================

-- Enable pgvector for semantic/AI search
create extension if not exists vector;

-- ── CATEGORIES ───────────────────────────────────────────────
create table categories (
  id        serial primary key,
  slug      text unique not null,   -- 'sports', 'vet', 'music' …
  label     text not null,
  icon      text                    -- emoji or icon name
);

insert into categories (slug, label, icon) values
  ('sports',    'Sports',        '🏆'),
  ('vet',       'Vets & Pets',   '🐾'),
  ('music',     'Music',         '🎷'),
  ('food',      'Food',          '🍢'),
  ('community', 'Community',     '🤝'),
  ('health',    'Health',        '🩺'),
  ('education', 'Education',     '💻'),
  ('other',     'Other',         '📌');

-- ── VENUES ───────────────────────────────────────────────────
create table venues (
  id           serial primary key,
  name         text not null,
  address      text,
  city         text default 'Nairobi',
  lat          numeric(9,6),
  lng          numeric(9,6),
  google_place_id text,
  website      text,
  created_at   timestamptz default now()
);

-- ── EVENTS ───────────────────────────────────────────────────
create table events (
  id              uuid primary key default gen_random_uuid(),

  -- Core fields
  title           text not null,
  description     text,
  category_slug   text references categories(slug),
  venue_id        integer references venues(id),

  -- When
  starts_at       timestamptz not null,
  ends_at         timestamptz,
  is_recurring    boolean default false,

  -- Access
  is_free         boolean default false,
  price_min       numeric(10,2),
  price_max       numeric(10,2),
  ticket_url      text,

  -- Source tracking (for deduplication)
  source          text,            -- 'eventbrite', 'google', 'scraped', …
  source_id       text,            -- original ID from the source
  source_url      text,

  -- AI-generated fields
  tags            text[],          -- ['live-music', 'jazz', 'outdoor']
  ai_summary      text,            -- one-sentence AI summary
  embedding       vector(1536),    -- for semantic search (OpenAI/Claude dims)

  -- Meta
  image_url       text,
  is_verified     boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),

  -- Prevent duplicates from same source
  unique(source, source_id)
);

-- ── USER PREFERENCES ─────────────────────────────────────────
create table user_preferences (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null,   -- from Supabase Auth
  categories      text[],          -- ['sports', 'music']
  notify_before   integer default 60,  -- minutes before event
  notify_channel  text[] default array['push'],  -- 'push','email','sms'
  location_lat    numeric(9,6),
  location_lng    numeric(9,6),
  radius_km       integer default 20,
  created_at      timestamptz default now()
);

-- ── NOTIFICATION LOG ─────────────────────────────────────────
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  event_id    uuid references events(id),
  channel     text,                -- 'push', 'email', 'sms'
  sent_at     timestamptz default now(),
  status      text default 'sent'  -- 'sent', 'failed', 'clicked'
);

-- ── INDEXES ──────────────────────────────────────────────────

-- Fast date-range queries (most common query pattern)
create index idx_events_starts_at on events(starts_at);

-- Category filter
create index idx_events_category on events(category_slug);

-- Free events filter
create index idx_events_free on events(is_free);

-- Location search (bounding box)
create index idx_venues_location on venues(lat, lng);

-- pgvector HNSW index for fast semantic search
create index idx_events_embedding on events
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- ── HELPER VIEW: TODAY'S EVENTS ──────────────────────────────
create or replace view todays_events as
  select
    e.*,
    v.name        as venue_name,
    v.address     as venue_address,
    v.city        as venue_city,
    v.lat,
    v.lng,
    c.label       as category_label,
    c.icon        as category_icon
  from events e
  left join venues   v on v.id = e.venue_id
  left join categories c on c.slug = e.category_slug
  where e.starts_at::date = current_date
  order by e.starts_at;

-- ── SEMANTIC SEARCH FUNCTION ─────────────────────────────────
-- Call this from your backend:
-- select * from search_events('[0.1, 0.2, ...]'::vector, 'sports', 10);
create or replace function search_events(
  query_embedding vector(1536),
  filter_category text default null,
  match_count     int  default 10
)
returns table (
  id            uuid,
  title         text,
  category_slug text,
  starts_at     timestamptz,
  is_free       boolean,
  venue_name    text,
  similarity    float
)
language sql stable as $$
  select
    e.id,
    e.title,
    e.category_slug,
    e.starts_at,
    e.is_free,
    v.name as venue_name,
    1 - (e.embedding <=> query_embedding) as similarity
  from events e
  left join venues v on v.id = e.venue_id
  where
    (filter_category is null or e.category_slug = filter_category)
    and e.starts_at::date = current_date
  order by e.embedding <=> query_embedding
  limit match_count;
$$;
