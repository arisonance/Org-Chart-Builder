export type OperatingViewPosition = {
  x: number;
  y: number;
};

export type OperatingViewPositionMap = Record<string, OperatingViewPosition>;

export type OperatingViewViewport = {
  x: number;
  y: number;
  zoom: number;
};

export type OperatingViewLayoutRecord = {
  published?: OperatingViewPositionMap;
  draft?: OperatingViewPositionMap;
  publishedViewport?: OperatingViewViewport;
  draftViewport?: OperatingViewViewport;
  draftUpdatedAt?: string;
  publishedAt?: string;
  publishedBy?: string;
  approvalStatus?: OperatingViewApprovalStatus;
  pendingReason?: string;
  submittedAt?: string;
  submittedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
};

export type OperatingViewLayoutMap = Record<string, OperatingViewLayoutRecord>;

export type OperatingViewApprovalStatus = "draft" | "pending_approval" | "approved" | "rejected";

export type OperatingViewMutationMode = "draft" | "submit" | "approve" | "publish" | "reject" | "discard" | "reset";

export type OperatingViewLayoutMutation = {
  mode: OperatingViewMutationMode;
  label?: string;
  owner?: string;
  actor?: string;
  reason?: string;
  layout?: OperatingViewPositionMap;
  viewport?: OperatingViewViewport;
  publishedBy?: string;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const isOperatingViewPositionMap = (
  value: unknown,
): value is OperatingViewPositionMap => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every((position) => {
    if (!position || typeof position !== "object" || Array.isArray(position)) return false;
    const candidate = position as Record<string, unknown>;
    return isFiniteNumber(candidate.x) && isFiniteNumber(candidate.y);
  });
};

export const sanitizeOperatingViewPositionMap = (
  value: unknown,
): OperatingViewPositionMap => {
  if (!isOperatingViewPositionMap(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([id, position]) => [
      id,
      {
        x: Math.round(position.x * 100) / 100,
        y: Math.round(position.y * 100) / 100,
      },
    ]),
  );
};

export const isOperatingViewViewport = (
  value: unknown,
): value is OperatingViewViewport => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    isFiniteNumber(candidate.x) &&
    isFiniteNumber(candidate.y) &&
    isFiniteNumber(candidate.zoom) &&
    candidate.zoom > 0
  );
};

export const sanitizeOperatingViewViewport = (
  value: unknown,
): OperatingViewViewport | undefined => {
  if (!isOperatingViewViewport(value)) return undefined;
  return {
    x: Math.round(value.x * 100) / 100,
    y: Math.round(value.y * 100) / 100,
    zoom: Math.round(value.zoom * 1000) / 1000,
  };
};
