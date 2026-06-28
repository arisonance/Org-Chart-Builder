import { NextRequest, NextResponse } from "next/server";
import { PUBLISHED_OPERATING_VIEW_BY_ID } from "@/lib/schema/operating-views";
import {
  isOperatingViewPositionMap,
  isOperatingViewViewport,
  sanitizeOperatingViewPositionMap,
  sanitizeOperatingViewViewport,
  type OperatingViewLayoutMutation,
  type OperatingViewPositionMap,
  type OperatingViewViewport,
} from "@/lib/schema/operating-view-layouts";
import { isSupabaseConfigured, supabaseRest } from "@/lib/server/supabase-rest";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ viewId: string }>;
};

type OperatingViewRow = {
  view_id: string;
  label: string;
  owner: string | null;
  status: string;
  published_layout: unknown;
  draft_layout: unknown;
  published_viewport?: unknown;
  draft_viewport?: unknown;
  published_by: string | null;
  approval_status: "draft" | "pending_approval" | "approved" | "rejected" | null;
  pending_reason: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
};

type MutationResult = {
  published?: OperatingViewPositionMap;
  draft?: OperatingViewPositionMap;
  publishedViewport?: OperatingViewViewport;
  draftViewport?: OperatingViewViewport;
  draftUpdatedAt?: string;
  publishedAt?: string;
  publishedBy?: string;
  approvalStatus?: "draft" | "pending_approval" | "approved" | "rejected";
  pendingReason?: string;
  submittedAt?: string;
  submittedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
};

const SELECT_WITH_VIEWPORT =
  "view_id,label,owner,status,published_layout,draft_layout,published_viewport,draft_viewport,published_by,approval_status,pending_reason,submitted_at,submitted_by,approved_at,approved_by";
const SELECT_WITHOUT_VIEWPORT =
  "view_id,label,owner,status,published_layout,draft_layout,published_by,approval_status,pending_reason,submitted_at,submitted_by,approved_at,approved_by";

const isMissingViewportColumnError = (error: unknown) =>
  error instanceof Error && /published_viewport|draft_viewport/.test(error.message);

const getViewRows = (viewId: string) =>
  supabaseRest<OperatingViewRow[]>(
    `org_chart_operating_views?view_id=eq.${encodeURIComponent(viewId)}&select=${SELECT_WITH_VIEWPORT}`,
  );

const loadViewRows = async (viewId: string) => {
  try {
    return await getViewRows(viewId);
  } catch (error) {
    if (!isMissingViewportColumnError(error)) throw error;
    return supabaseRest<OperatingViewRow[]>(
      `org_chart_operating_views?view_id=eq.${encodeURIComponent(viewId)}&select=${SELECT_WITHOUT_VIEWPORT}`,
    );
  }
};

const upsertOperatingView = async (rowPatch: Record<string, unknown>) => {
  try {
    await supabaseRest("org_chart_operating_views?on_conflict=view_id", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: rowPatch,
    });
  } catch (error) {
    if (!isMissingViewportColumnError(error)) throw error;
    const legacyRowPatch = { ...rowPatch };
    delete legacyRowPatch.published_viewport;
    delete legacyRowPatch.draft_viewport;
    await supabaseRest("org_chart_operating_views?on_conflict=view_id", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: legacyRowPatch,
    });
  }
};

const insertAuditEvent = async (
  viewId: string,
  eventType: string,
  body: OperatingViewLayoutMutation,
  previousStatus: string | null,
  nextStatus: string,
  snapshot?: OperatingViewPositionMap,
) => {
  await supabaseRest("org_chart_operating_view_audit_events", {
    method: "POST",
    prefer: "return=minimal",
    body: {
      view_id: viewId,
      event_type: eventType,
      actor: body.actor ?? body.publishedBy ?? null,
      reason: body.reason ?? null,
      previous_status: previousStatus,
      next_status: nextStatus,
      layout_snapshot: snapshot ?? null,
    },
  });
};

const buildBaseViewRow = (viewId: string, body: OperatingViewLayoutMutation) => {
  const view = PUBLISHED_OPERATING_VIEW_BY_ID[viewId];
  return {
    view_id: viewId,
    label: body.label ?? view?.label ?? viewId,
    owner: body.owner ?? view?.owner ?? null,
    updated_by: body.actor ?? body.publishedBy ?? null,
    metadata: view
      ? {
          kind: view.kind,
          lens: view.lens,
          ...("dimension" in view ? { dimension: view.dimension, value: view.value } : {}),
          ...("formation" in view ? { formation: view.formation } : {}),
        }
      : {},
  };
};

const firstNonEmptyLayout = (...values: unknown[]): OperatingViewPositionMap => {
  for (const value of values) {
    const layout = sanitizeOperatingViewPositionMap(value);
    if (Object.keys(layout).length > 0) return layout;
  }
  return {};
};

const hasNonEmptyLayout = (value: unknown) =>
  Object.keys(sanitizeOperatingViewPositionMap(value)).length > 0;

export async function PUT(request: NextRequest, { params }: Params) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase server credentials are not configured." },
      { status: 503 },
    );
  }

  const { viewId } = await params;
  let body: OperatingViewLayoutMutation;
  try {
    body = (await request.json()) as OperatingViewLayoutMutation;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!["draft", "submit", "approve", "publish", "reject", "discard", "reset"].includes(body.mode)) {
    return NextResponse.json({ error: "Unsupported operating view mutation." }, { status: 400 });
  }

  if ((body.mode === "draft" || body.mode === "publish") && body.layout && !isOperatingViewPositionMap(body.layout)) {
    return NextResponse.json({ error: "Layout positions must be keyed by id with finite x/y values." }, { status: 400 });
  }
  if (body.viewport && !isOperatingViewViewport(body.viewport)) {
    return NextResponse.json({ error: "Viewport must include finite x/y/zoom values." }, { status: 400 });
  }

  const existing = (await loadViewRows(viewId))[0];
  const now = new Date().toISOString();
  const incomingLayout = body.layout ? sanitizeOperatingViewPositionMap(body.layout) : undefined;
  const incomingViewport = sanitizeOperatingViewViewport(body.viewport);
  const previousStatus = existing?.status ?? null;
  const base = buildBaseViewRow(viewId, body);

  let eventType: "draft_saved" | "submitted_for_approval" | "approved" | "rejected" | "published" | "draft_discarded" | "reset";
  let rowPatch: Record<string, unknown>;
  let result: MutationResult;

  if (body.mode === "draft") {
    const draft = incomingLayout ?? {};
    const draftViewport =
      incomingViewport ??
      sanitizeOperatingViewViewport(existing?.draft_viewport) ??
      sanitizeOperatingViewViewport(existing?.published_viewport);
    eventType = "draft_saved";
    rowPatch = {
      ...base,
      status: existing?.status === "published" ? "published" : "draft",
      draft_layout: draft,
      draft_viewport: draftViewport ?? null,
      draft_updated_at: now,
      approval_status: "draft",
      pending_reason: null,
    };
    result = {
      published: sanitizeOperatingViewPositionMap(existing?.published_layout),
      draft,
      publishedViewport: sanitizeOperatingViewViewport(existing?.published_viewport),
      draftViewport,
      draftUpdatedAt: now,
      publishedBy: existing?.published_by ?? undefined,
      approvalStatus: "draft",
    };
  } else if (body.mode === "submit") {
    const draft = incomingLayout ?? firstNonEmptyLayout(existing?.draft_layout, existing?.published_layout);
    const draftViewport =
      incomingViewport ??
      sanitizeOperatingViewViewport(existing?.draft_viewport) ??
      sanitizeOperatingViewViewport(existing?.published_viewport);
    eventType = "submitted_for_approval";
    rowPatch = {
      ...base,
      status: existing?.status === "published" ? "published" : "draft",
      draft_layout: draft,
      draft_viewport: draftViewport ?? null,
      draft_updated_at: now,
      approval_status: "pending_approval",
      pending_reason: body.reason ?? "Arrangement submitted for admin approval",
      submitted_at: now,
      submitted_by: body.actor ?? body.publishedBy ?? base.owner,
    };
    result = {
      published: sanitizeOperatingViewPositionMap(existing?.published_layout),
      draft,
      publishedViewport: sanitizeOperatingViewViewport(existing?.published_viewport),
      draftViewport,
      draftUpdatedAt: now,
      publishedBy: existing?.published_by ?? undefined,
      approvalStatus: "pending_approval",
      pendingReason: String(rowPatch.pending_reason ?? ""),
      submittedAt: now.slice(0, 10),
      submittedBy: String(rowPatch.submitted_by ?? ""),
    };
  } else if (body.mode === "approve" || body.mode === "publish") {
    const published =
      incomingLayout ??
      firstNonEmptyLayout(existing?.draft_layout, existing?.published_layout);
    const publishedViewport =
      incomingViewport ??
      sanitizeOperatingViewViewport(existing?.draft_viewport) ??
      sanitizeOperatingViewViewport(existing?.published_viewport);
    eventType = body.mode === "approve" ? "approved" : "published";
    rowPatch = {
      ...base,
      status: "published",
      published_layout: published,
      published_viewport: publishedViewport ?? null,
      draft_layout: null,
      draft_viewport: null,
      draft_updated_at: null,
      published_at: now,
      published_by: body.publishedBy ?? body.actor ?? existing?.published_by ?? base.owner,
      approval_status: "approved",
      pending_reason: null,
      approved_at: now,
      approved_by: body.actor ?? body.publishedBy ?? existing?.approved_by ?? base.owner,
    };
    result = {
      published,
      publishedViewport,
      publishedAt: now.slice(0, 10),
      publishedBy: String(rowPatch.published_by ?? ""),
      approvalStatus: "approved",
      approvedAt: now.slice(0, 10),
      approvedBy: String(rowPatch.approved_by ?? ""),
    };
  } else if (body.mode === "reject") {
    const draft = incomingLayout ?? sanitizeOperatingViewPositionMap(existing?.draft_layout);
    const draftViewport =
      incomingViewport ??
      sanitizeOperatingViewViewport(existing?.draft_viewport) ??
      sanitizeOperatingViewViewport(existing?.published_viewport);
    eventType = "rejected";
    rowPatch = {
      ...base,
      status: existing?.status ?? "draft",
      draft_layout: draft,
      draft_viewport: draftViewport ?? null,
      approval_status: "rejected",
      pending_reason: body.reason ?? "Arrangement changes need revision",
    };
    result = {
      published: sanitizeOperatingViewPositionMap(existing?.published_layout),
      draft,
      publishedViewport: sanitizeOperatingViewViewport(existing?.published_viewport),
      draftViewport,
      draftUpdatedAt: hasNonEmptyLayout(draft) ? now : undefined,
      publishedBy: existing?.published_by ?? undefined,
      approvalStatus: "rejected",
      pendingReason: String(rowPatch.pending_reason ?? ""),
    };
  } else if (body.mode === "discard") {
    eventType = "draft_discarded";
    rowPatch = {
      ...base,
      status: existing?.status ?? "draft",
      draft_layout: null,
      draft_viewport: null,
      draft_updated_at: null,
      approval_status: hasNonEmptyLayout(existing?.published_layout) ? "approved" : "draft",
      pending_reason: null,
    };
    result = {
      published: sanitizeOperatingViewPositionMap(existing?.published_layout),
      publishedViewport: sanitizeOperatingViewViewport(existing?.published_viewport),
      publishedBy: existing?.published_by ?? undefined,
      approvalStatus: hasNonEmptyLayout(existing?.published_layout) ? "approved" : "draft",
    };
  } else {
    eventType = "reset";
    rowPatch = {
      ...base,
      status: "published",
      published_layout: {},
      published_viewport: null,
      draft_layout: null,
      draft_viewport: null,
      draft_updated_at: null,
      published_at: now,
      published_by: body.publishedBy ?? body.actor ?? existing?.published_by ?? base.owner,
      approval_status: "approved",
      pending_reason: null,
      approved_at: now,
      approved_by: body.actor ?? body.publishedBy ?? existing?.approved_by ?? base.owner,
    };
    result = {
      published: {},
      publishedViewport: undefined,
      publishedAt: now.slice(0, 10),
      publishedBy: String(rowPatch.published_by ?? ""),
      approvalStatus: "approved",
      approvedAt: now.slice(0, 10),
      approvedBy: String(rowPatch.approved_by ?? ""),
    };
  }

  await upsertOperatingView(rowPatch);

  await insertAuditEvent(
    viewId,
    eventType,
    body,
    previousStatus,
    String(rowPatch.status ?? previousStatus ?? "draft"),
    result.draft ?? result.published,
  );

  return NextResponse.json({ layout: result });
}
