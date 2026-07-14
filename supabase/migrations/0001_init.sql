-- WARDEN · Vigil — DFR governed backend (Milestone 1)
-- RBAC + incidents + APPEND-ONLY, HMAC-signed, hash-chained overwatch ledger + access log + retention.
-- FORCE ROW LEVEL SECURITY from day one. Synthetic pilot data only — no real PII in v1.

create extension if not exists pgcrypto;   -- gen_random_uuid(), gen_random_bytes()
-- pg_cron is enabled from the dashboard (Database → Extensions) for retention; see README.

-- ============================================================ signing secret (server-only)
-- The ledger HMAC key lives here, generated in-DB (never in code, env, or the client).
-- FORCE RLS + no policies => only the service_role (edge functions) can read it; clients denied.
-- Hardening note: for a real pilot, move this to a managed secret / KMS rather than a DB row.
create table app_secrets (
  key        text primary key,
  value      text not null,
  created_at timestamptz not null default now()
);
alter table app_secrets enable row level security;
alter table app_secrets force  row level security;
insert into app_secrets(key, value)
values ('ledger_secret', encode(gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

-- ============================================================ roles / profiles
create type app_role as enum ('admin','commander','operator','viewer');

create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  role       app_role not null default 'viewer',
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;
alter table profiles force  row level security;

-- role check helper (security definer so it can read profiles under RLS)
create or replace function has_role(required app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = any(required));
$$;

-- auto-create a profile (default 'viewer') when a user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();

create policy "read own profile"  on profiles for select to authenticated using (id = auth.uid());
create policy "admin reads all"   on profiles for select to authenticated using (has_role(array['admin']::app_role[]));
create policy "admin writes role" on profiles for update to authenticated using (has_role(array['admin']::app_role[]));

-- ============================================================ incidents
create sequence if not exists incident_ref_seq start 4090;

-- atomic, race-free incident reference numbers (INC-4090, INC-4091, ...)
create or replace function nextval_incident_ref()
returns bigint language sql security definer set search_path = public as $$
  select nextval('incident_ref_seq');
$$;

create table incidents (
  id              uuid primary key default gen_random_uuid(),
  ref             text not null unique,
  type            text not null,
  location        text,                              -- coarse only; no precise PII by policy
  status          text not null default 'open',      -- open | airborne | sealed | stood_down
  lawful_basis    text not null default 'public_task',
  opened_by       uuid references profiles(id),
  opened_at       timestamptz not null default now(),
  sealed_at       timestamptz,
  retention_days  int  not null default 31,
  retention_until timestamptz,                        -- set on seal
  purged          boolean not null default false
);
alter table incidents enable row level security;
alter table incidents force  row level security;
-- clients may READ incidents (roled); all writes go through edge functions (service role).
create policy "roled read incidents" on incidents for select to authenticated
  using (has_role(array['admin','commander','operator','viewer']::app_role[]));

-- ============================================================ the ledger (append-only)
-- ts is stored as TEXT (exact ISO-8601 UTC string that was hashed) so the chain is
-- reproducible byte-for-byte — no timestamptz round-trip formatting drift.
create table overwatch_events (
  id           bigint generated always as identity primary key,
  incident_id  uuid not null references incidents(id) on delete restrict,
  seq          int  not null,                         -- per-incident, 1-based
  ts           text not null,                         -- ISO-8601 UTC, e.g. 2026-07-11T17:32:00.123Z
  event        text not null,                         -- e.g. FLIGHT AUTHORISED
  meta         jsonb not null default '{}'::jsonb,
  actor        text not null,                         -- "ROLE · Name" (no raw PII)
  actor_id     uuid references profiles(id),
  gate         boolean not null default false,        -- human-authorise step
  content_hash text not null,                         -- sha256(canonical(seq,ts,event,meta,actor,gate))
  prev_hash    text not null,                         -- previous chain_hash, or 'VIGIL::GENESIS'
  chain_hash   text not null,                         -- HMAC-SHA256(LEDGER_SECRET, prev_hash || '::' || content_hash)
  created_at   timestamptz not null default now(),
  unique (incident_id, seq)
);
alter table overwatch_events enable row level security;
alter table overwatch_events force  row level security;

-- APPEND-ONLY: block edits/deletes at the table level (defence in depth beyond RLS).
create or replace function block_ledger_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'overwatch_events is append-only (tamper-evident): % is not permitted', tg_op;
end $$;
create trigger ledger_no_update before update on overwatch_events for each row execute function block_ledger_mutation();
create trigger ledger_no_delete before delete on overwatch_events for each row execute function block_ledger_mutation();

-- clients may READ the ledger (roled). No INSERT policy exists → appends happen ONLY via the
-- ledger-append edge function (service role), which sets the HMAC chain the client can't forge.
create policy "roled read events" on overwatch_events for select to authenticated
  using (has_role(array['admin','commander','operator','viewer']::app_role[]));

create index on overwatch_events (incident_id, seq);

-- ============================================================ access log
create table access_log (
  id          bigint generated always as identity primary key,
  ts          timestamptz not null default now(),
  actor_id    uuid references profiles(id),
  action      text not null,                          -- VIEW_FEED | OPEN_INCIDENT | EXPORT ...
  incident_id uuid references incidents(id),
  detail      jsonb not null default '{}'::jsonb
);
alter table access_log enable row level security;
alter table access_log force  row level security;
create policy "admin reads access log" on access_log for select to authenticated
  using (has_role(array['admin']::app_role[]));

-- ============================================================ retention (storage limitation)
-- Purges MEDIA past its window; the immutable audit record is preserved. A 'MEDIA PURGED'
-- ledger event is appended by the retention edge job so the deletion is itself on the record.
create or replace function enforce_retention()
returns void language plpgsql security definer set search_path = public as $$
begin
  update incidents
     set purged = true
   where sealed_at is not null
     and retention_until is not null
     and retention_until < now()
     and purged = false;
  -- media object deletion + the 'MEDIA PURGED' ledger append are handled by the edge retention job.
end $$;

comment on table overwatch_events is 'Append-only, HMAC-signed, hash-chained audit ledger. Never UPDATE/DELETE.';
