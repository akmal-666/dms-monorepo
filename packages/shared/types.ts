// ─── Shared Types for DMS ───────────────────────────────────────────────────

export type UserRole = 'admin' | 'manager' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export type DashboardStatus = 'active' | 'archived';

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  ownerName?: string;
  status: DashboardStatus;
  clonedFrom?: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  requirementCount?: number;
}

export interface DashboardMember {
  dashboardId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: UserRole;
}

// ─── Requirements ─────────────────────────────────────────────────────────────

export type RequirementStatus =
  | 'Draft'
  | 'In Progress'
  | 'Done'
  | 'Overdue'
  | 'Cancelled';

export const VALID_STATUSES: RequirementStatus[] = [
  'Draft',
  'In Progress',
  'Done',
  'Overdue',
  'Cancelled',
];

export type Platform =
  | 'CIS'
  | 'Odoo'
  | 'CRM'
  | 'Power BI'
  | 'Infrastructure'
  | 'Network'
  | 'Security'
  | 'Other';

export const VALID_PLATFORMS: Platform[] = [
  'CIS',
  'Odoo',
  'CRM',
  'Power BI',
  'Infrastructure',
  'Network',
  'Security',
  'Other',
];

export interface Requirement {
  id: string;
  dashboardId: string;
  reqId: string;
  title: string;
  category?: string;
  platform?: Platform;
  requestor?: string;
  pic?: string;
  status: RequirementStatus;
  progress: number;
  startDate?: string;
  dueDate?: string;
  plannedMd: number;
  actualMd: number;
  importBatchId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Resource Capacity ───────────────────────────────────────────────────────

export interface ResourceCapacity {
  id: string;
  dashboardId: string;
  team: string;
  month: string; // YYYY-MM
  capacityMd: number;
}

// ─── Delivery Target ─────────────────────────────────────────────────────────

export interface DeliveryTarget {
  id: string;
  dashboardId: string;
  month: string; // YYYY-MM
  team: string;
  target: number;
  actual: number;
}

// ─── Import ──────────────────────────────────────────────────────────────────

export type ImportStatus = 'pending' | 'validating' | 'success' | 'failed';

export interface ImportHistory {
  id: string;
  dashboardId: string;
  filename: string;
  r2Key: string;
  status: ImportStatus;
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  errorRows: number;
  errors?: ImportError[];
  importedBy: string;
  importedByName?: string;
  createdAt: string;
}

export interface ImportError {
  sheet: string;
  row: number;
  column: string;
  value: string;
  message: string;
}

export interface ImportValidationResult {
  isValid: boolean;
  requirements: RequirementImportRow[];
  resourceCapacity: ResourceCapacityImportRow[];
  deliveryTargets: DeliveryTargetImportRow[];
  errors: ImportError[];
  summary: {
    totalRequirements: number;
    newRequirements: number;
    updateRequirements: number;
    totalResourceRows: number;
    totalDeliveryRows: number;
  };
}

export interface RequirementImportRow {
  rowIndex: number;
  reqId: string;
  title: string;
  category?: string;
  platform?: string;
  requestor?: string;
  pic?: string;
  status: string;
  progress: number;
  startDate?: string;
  dueDate?: string;
  plannedMd: number;
  actualMd: number;
  isNew?: boolean;
  errors?: ImportError[];
}

export interface ResourceCapacityImportRow {
  rowIndex: number;
  team: string;
  month: string;
  capacityMd: number;
  errors?: ImportError[];
}

export interface DeliveryTargetImportRow {
  rowIndex: number;
  month: string;
  team: string;
  target: number;
  actual: number;
  errors?: ImportError[];
}

// ─── KPI ─────────────────────────────────────────────────────────────────────

export interface KPIMetrics {
  totalInitiative: number;
  inProgress: number;
  completed: number;
  overdue: number;
  achievementPct: number;
  plannedMd: number;
  actualMd: number;
  mdVariance: number;
  deliveryHealth: number; // percentage
}

// ─── Chart Data ──────────────────────────────────────────────────────────────

export interface StatusChartItem {
  status: RequirementStatus;
  count: number;
  percentage: number;
}

export interface PlatformChartItem {
  platform: string;
  count: number;
  plannedMd: number;
  actualMd: number;
}

export interface ResourceUtilizationItem {
  month: string;
  team: string;
  capacityMd: number;
  usedMd: number;
  utilizationPct: number;
}

export interface DeliveryTimelineItem {
  month: string;
  target: number;
  actual: number;
  achievement: number;
}

// ─── Filters ─────────────────────────────────────────────────────────────────

export interface GlobalFilters {
  year?: number;
  quarter?: string; // Q1 | Q2 | Q3 | Q4
  semester?: string; // S1 | S2
  month?: string; // YYYY-MM
  status?: RequirementStatus[];
  pic?: string[];
  category?: string[];
  platform?: Platform[];
}

// ─── API Response Wrappers ───────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  details?: unknown;
}
