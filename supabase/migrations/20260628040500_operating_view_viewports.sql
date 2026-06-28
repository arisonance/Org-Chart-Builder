alter table public.org_chart_operating_views
  add column if not exists published_viewport jsonb,
  add column if not exists draft_viewport jsonb;
