-- RentReady — initial schema (Assignment 3)
-- Run in the Supabase SQL editor or via `supabase db push`.
-- RLS is enabled on every table; the FastAPI backend calls PostgREST with
-- the *user's* access token, so these policies are the final word on access.

-- listings: the eight sample homes, moved out of src/data/listings.js.
-- available_in_weeks mirrors the original JS (dates were always computed
-- relative to "today" at load); the API derives available_from from it so
-- the data never goes stale.
create table if not exists public.listings (
  id text primary key,
  suburb text not null,
  type text not null,
  bedrooms int not null check (bedrooms > 0),
  weekly_rent int not null check (weekly_rent > 0),
  lat double precision not null,
  lng double precision not null,
  available_in_weeks int not null check (available_in_weeks >= 0)
);

-- profiles: 1:1 with the auth user — the About-you answers, so returning
-- renters get their form prefilled.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  current_suburb text not null,
  move_in_date date not null,
  employment_status text not null,
  job_tenure text,
  rental_history text not null,
  reference text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- assessments: one row per "Check my score" — answers snapshot plus the
-- server-computed result, and a denormalised copy of the listing so history
-- stays readable even if listings change.
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  listing_id text references public.listings (id) on delete set null,
  listing jsonb not null,
  answers jsonb not null,
  weekly_income numeric not null check (weekly_income > 0),
  savings numeric not null check (savings >= 0),
  score int not null check (score between 0 and 100),
  raw_score int not null,
  band text not null,
  outcome text not null,
  factors jsonb not null,
  caps jsonb not null,
  tips jsonb not null,
  rent_share_pct numeric,
  weeks_covered numeric,
  created_at timestamptz not null default now()
);

create index if not exists assessments_user_created_idx
  on public.assessments (user_id, created_at desc);

-- updated_at maintenance for profiles ---------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;

-- Row Level Security ---------------------------------------------------------
alter table public.listings enable row level security;
alter table public.profiles enable row level security;
alter table public.assessments enable row level security;

drop policy if exists "Listings readable by authenticated users" on public.listings;
create policy "Listings readable by authenticated users"
  on public.listings for select
  to authenticated
  using (true);

drop policy if exists "Own profile select" on public.profiles;
create policy "Own profile select"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Own profile insert" on public.profiles;
create policy "Own profile insert"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "Own profile update" on public.profiles;
create policy "Own profile update"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "Own profile delete" on public.profiles;
create policy "Own profile delete"
  on public.profiles for delete
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Own assessments select" on public.assessments;
create policy "Own assessments select"
  on public.assessments for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Own assessments insert" on public.assessments;
create policy "Own assessments insert"
  on public.assessments for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Own assessments delete" on public.assessments;
create policy "Own assessments delete"
  on public.assessments for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Seed: the original eight sample homes from src/data/listings.js -----------
insert into public.listings (id, suburb, type, bedrooms, weekly_rent, lat, lng, available_in_weeks) values
  ('coburg-1b',    'Coburg',    'Apartment', 1, 310, -37.744, 144.966, 1),
  ('sunshine-1b',  'Sunshine',  'Unit',      1, 350, -37.790, 144.832, 1),
  ('footscray-2b', 'Footscray', 'Townhouse', 2, 380, -37.799, 144.900, 2),
  ('brunswick-2b', 'Brunswick', 'Apartment', 2, 420, -37.766, 144.962, 3),
  ('preston-3b',   'Preston',   'Townhouse', 3, 395, -37.674, 145.000, 4),
  ('bentleigh-2b', 'Bentleigh', 'Unit',      2, 450, -37.925, 145.040, 5),
  ('brighton-2b',  'Brighton',  'House',     2, 480, -37.917, 144.990, 6),
  ('werribee-3b',  'Werribee',  'House',     3, 520, -37.900, 144.660, 8)
on conflict (id) do nothing;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();