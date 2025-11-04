export type Perspective = "brand" | "channel" | "department";

export type OrgDimension = {
  id: string;
  label: string;
  description?: string;
  color?: string;
};

export type Person = {
  id: string;
  name: string;
  title: string;
  avatarInitials?: string;
  primaryBrandId?: string;
  primaryChannelId?: string;
  primaryDepartmentId?: string;
  brandIds: string[];
  channelIds: string[];
  departmentIds: string[];
  reportsToId?: string;
};

export type OrgMatrix = {
  brands: OrgDimension[];
  channels: OrgDimension[];
  departments: OrgDimension[];
  leadership: Person[];
};

export type MatrixAssignment = {
  dimensionId: string;
  label: string;
  badgeColor: string;
};
