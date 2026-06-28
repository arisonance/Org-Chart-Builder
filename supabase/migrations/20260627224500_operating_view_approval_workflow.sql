alter table public.org_chart_operating_views
  add column if not exists approval_status text not null default 'approved'
    check (approval_status in ('draft', 'pending_approval', 'approved', 'rejected')),
  add column if not exists pending_reason text,
  add column if not exists submitted_at timestamptz,
  add column if not exists submitted_by text,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by text;

alter table public.org_chart_operating_view_audit_events
  drop constraint if exists org_chart_operating_view_audit_events_event_type_check;

alter table public.org_chart_operating_view_audit_events
  add constraint org_chart_operating_view_audit_events_event_type_check
  check (
    event_type in (
      'draft_saved',
      'submitted_for_approval',
      'approved',
      'rejected',
      'draft_discarded',
      'published',
      'reset',
      'archived'
    )
  );

update public.org_chart_operating_views
set
  approval_status = 'approved',
  approved_at = coalesce(approved_at, published_at),
  approved_by = coalesce(approved_by, published_by)
where status = 'published'
  and approval_status = 'approved';

create index if not exists org_chart_operating_views_approval_status_idx
  on public.org_chart_operating_views(approval_status);
