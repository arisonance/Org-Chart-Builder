import { NextResponse } from "next/server";
import {
  sanitizeOperatingViewPositionMap,
  sanitizeOperatingViewViewport,
  type OperatingViewLayoutMap,
} from "@/lib/schema/operating-view-layouts";
import { isSupabaseConfigured, supabaseRest } from "@/lib/server/supabase-rest";

export const dynamic = "force-dynamic";

type OperatingViewRow = {
  view_id: string;
  published_layout: unknown;
  draft_layout: unknown;
  published_viewport?: unknown;
  draft_viewport?: unknown;
  draft_updated_at: string | null;
  published_at: string | null;
  published_by: string | null;
  approval_status: "draft" | "pending_approval" | "approved" | "rejected" | null;
  pending_reason: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
};

const SELECT_WITH_VIEWPORT =
  "view_id,published_layout,draft_layout,published_viewport,draft_viewport,draft_updated_at,published_at,published_by,approval_status,pending_reason,submitted_at,submitted_by,approved_at,approved_by";
const SELECT_WITHOUT_VIEWPORT =
  "view_id,published_layout,draft_layout,draft_updated_at,published_at,published_by,approval_status,pending_reason,submitted_at,submitted_by,approved_at,approved_by";

const isMissingViewportColumnError = (error: unknown) =>
  error instanceof Error && /published_viewport|draft_viewport/.test(error.message);

const loadRows = async () => {
  try {
    return await supabaseRest<OperatingViewRow[]>(
      `org_chart_operating_views?status=neq.archived&select=${SELECT_WITH_VIEWPORT}`,
    );
  } catch (error) {
    if (!isMissingViewportColumnError(error)) throw error;
    return supabaseRest<OperatingViewRow[]>(
      `org_chart_operating_views?status=neq.archived&select=${SELECT_WITHOUT_VIEWPORT}`,
    );
  }
};

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false, layouts: {} });
  }

  const rows = await loadRows();

  const layouts: OperatingViewLayoutMap = {};
  rows.forEach((row) => {
    const published = sanitizeOperatingViewPositionMap(row.published_layout);
    const draft = row.draft_layout
      ? sanitizeOperatingViewPositionMap(row.draft_layout)
      : undefined;
    const publishedViewport = sanitizeOperatingViewViewport(row.published_viewport);
    const draftViewport = sanitizeOperatingViewViewport(row.draft_viewport);
    layouts[row.view_id] = {
      published: Object.keys(published).length > 0 ? published : undefined,
      draft: draft && Object.keys(draft).length > 0 ? draft : undefined,
      publishedViewport,
      draftViewport,
      draftUpdatedAt: row.draft_updated_at ?? undefined,
      publishedAt: row.published_at?.slice(0, 10),
      publishedBy: row.published_by ?? undefined,
      approvalStatus: row.approval_status ?? undefined,
      pendingReason: row.pending_reason ?? undefined,
      submittedAt: row.submitted_at?.slice(0, 10),
      submittedBy: row.submitted_by ?? undefined,
      approvedAt: row.approved_at?.slice(0, 10),
      approvedBy: row.approved_by ?? undefined,
    };
  });

  return NextResponse.json({ configured: true, layouts });
}
