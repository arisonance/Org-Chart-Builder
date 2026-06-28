create extension if not exists pgcrypto;

create table if not exists public.org_chart_operating_views (
  id uuid primary key default gen_random_uuid(),
  view_id text not null unique,
  label text not null,
  owner text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  published_layout jsonb not null default '{}'::jsonb,
  draft_layout jsonb,
  draft_updated_at timestamptz,
  published_at timestamptz,
  published_by text,
  updated_by text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.org_chart_operating_view_audit_events (
  id uuid primary key default gen_random_uuid(),
  view_id text not null references public.org_chart_operating_views(view_id) on delete cascade,
  event_type text not null
    check (event_type in ('draft_saved', 'draft_discarded', 'published', 'reset', 'archived')),
  actor text,
  reason text,
  previous_status text,
  next_status text,
  layout_snapshot jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.org_chart_view_permissions (
  id uuid primary key default gen_random_uuid(),
  view_id text not null references public.org_chart_operating_views(view_id) on delete cascade,
  principal_type text not null check (principal_type in ('user', 'group', 'role')),
  principal text not null,
  permission text not null check (permission in ('view', 'edit', 'publish', 'approve')),
  created_at timestamptz not null default now(),
  unique (view_id, principal_type, principal, permission)
);

create index if not exists org_chart_operating_views_status_idx
  on public.org_chart_operating_views(status);

create index if not exists org_chart_operating_view_audit_view_created_idx
  on public.org_chart_operating_view_audit_events(view_id, created_at desc);

create or replace function public.set_org_chart_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_org_chart_operating_views_updated_at
  on public.org_chart_operating_views;

create trigger set_org_chart_operating_views_updated_at
before update on public.org_chart_operating_views
for each row
execute function public.set_org_chart_updated_at();

alter table public.org_chart_operating_views enable row level security;
alter table public.org_chart_operating_view_audit_events enable row level security;
alter table public.org_chart_view_permissions enable row level security;

insert into public.org_chart_operating_views
  (view_id, label, owner, status, published_at, published_by, metadata)
values
  ('executive-overview', 'Senior Leadership Team', 'CEO office', 'published', '2026-06-24T00:00:00Z', 'CEO office', '{"kind":"overview","lens":"hierarchy"}'::jsonb),
  ('all-residential', 'All Residential', 'Residential SLT', 'published', '2026-06-24T00:00:00Z', 'Residential SLT', '{"kind":"formation","lens":"hierarchy","formation":"residential"}'::jsonb),
  ('luxury-residential', 'Luxury Residential', 'Residential SLT', 'published', '2026-06-24T00:00:00Z', 'Residential SLT', '{"kind":"channel","lens":"channel","dimension":"channel","value":"Luxury Residential"}'::jsonb),
  ('north-america-professional', 'North America Professional', 'Professional SLT', 'published', '2026-06-24T00:00:00Z', 'Professional SLT', '{"kind":"channel","lens":"channel","dimension":"channel","value":"North America Professional"}'::jsonb),
  ('national-accounts', 'National Accounts', 'Residential SLT', 'published', '2026-06-24T00:00:00Z', 'Residential SLT', '{"kind":"channel","lens":"channel","dimension":"channel","value":"National Accounts"}'::jsonb),
  ('international-residential', 'International Residential', 'Residential SLT', 'published', '2026-06-24T00:00:00Z', 'Residential SLT', '{"kind":"channel","lens":"channel","dimension":"channel","value":"International Residential"}'::jsonb),
  ('enterprise', 'Enterprise', 'Professional SLT', 'published', '2026-06-24T00:00:00Z', 'Professional SLT', '{"kind":"channel","lens":"channel","dimension":"channel","value":"Enterprise"}'::jsonb),
  ('shared-services', 'Shared services', 'Operations / Finance / HR', 'published', '2026-06-24T00:00:00Z', 'Operations / Finance / HR', '{"kind":"shared-services","lens":"department"}'::jsonb)
on conflict (view_id) do update
set
  label = excluded.label,
  owner = excluded.owner,
  metadata = public.org_chart_operating_views.metadata || excluded.metadata;
