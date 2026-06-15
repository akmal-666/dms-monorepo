import type {
  AuthResponse, Dashboard, KPIMetrics, ImportValidationResult,
  ImportHistory, GlobalFilters, PaginatedResponse,
} from '@dms/shared';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error: string }).error ?? 'Request failed');
  }
  return res.json() as Promise<T>;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<{ data: AuthResponse }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request<{ data: AuthResponse['user'] }>('/api/auth/me'),
  listUsers: () => request<{ data: AuthResponse['user'][] }>('/api/auth/users'),
  createUser: (data: { email: string; password: string; name: string; role: string }) =>
    request<{ data: AuthResponse['user'] }>('/api/auth/users', {
      method: 'POST', body: JSON.stringify(data),
    }),
};

// ── Dashboards ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  list: (archived = false) =>
    request<{ data: Dashboard[] }>(`/api/dashboards?archived=${archived}`),
  get: (id: string) =>
    request<{ data: Dashboard }>(`/api/dashboards/${id}`),
  create: (data: { name: string; description?: string }) =>
    request<{ data: Dashboard }>('/api/dashboards', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; description?: string }) =>
    request<{ data: Dashboard }>(`/api/dashboards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  clone: (id: string) =>
    request<{ data: Dashboard }>(`/api/dashboards/${id}/clone`, { method: 'POST' }),
  archive: (id: string) =>
    request<{ data: { id: string; status: string } }>(`/api/dashboards/${id}/archive`, { method: 'PATCH' }),
  delete: (id: string) =>
    request(`/api/dashboards/${id}`, { method: 'DELETE' }),
};

// ── KPI & Charts ──────────────────────────────────────────────────────────────
function buildFilterParams(filters: GlobalFilters): string {
  const params = new URLSearchParams();
  if (filters.year) params.set('year', String(filters.year));
  if (filters.quarter) params.set('quarter', filters.quarter);
  if (filters.semester) params.set('semester', filters.semester);
  if (filters.month) params.set('month', filters.month);
  if (filters.status?.length) params.set('status', filters.status.join(','));
  if (filters.pic?.length) params.set('pic', filters.pic.join(','));
  if (filters.category?.length) params.set('category', filters.category.join(','));
  if (filters.platform?.length) params.set('platform', filters.platform.join(','));
  return params.toString() ? `?${params.toString()}` : '';
}

export const kpiApi = {
  getMetrics: (id: string, filters: GlobalFilters = {}) =>
    request<{ data: KPIMetrics }>(`/api/dashboards/${id}/kpi${buildFilterParams(filters)}`),
  getByStatus: (id: string, filters: GlobalFilters = {}) =>
    request<{ data: { status: string; count: number; percentage: number }[] }>(
      `/api/dashboards/${id}/initiative-by-status${buildFilterParams(filters)}`
    ),
  getByPlatform: (id: string, filters: GlobalFilters = {}) =>
    request<{ data: { platform: string; count: number; plannedMd: number; actualMd: number }[] }>(
      `/api/dashboards/${id}/initiative-by-platform${buildFilterParams(filters)}`
    ),
  getResourceUtilization: (id: string) =>
    request<{ data: { team: string; month: string; capacityMd: number; usedMd: number; utilizationPct: number }[] }>(
      `/api/dashboards/${id}/resource-utilization`
    ),
  getDeliveryTimeline: (id: string) =>
    request<{ data: { month: string; target: number; actual: number; achievement: number }[] }>(
      `/api/dashboards/${id}/delivery-timeline`
    ),
  getFilterOptions: (id: string) =>
    request<{ data: { pics: string[]; categories: string[]; platforms: string[]; years: string[] } }>(
      `/api/dashboards/${id}/filter-options`
    ),
};

// ── Requirements ──────────────────────────────────────────────────────────────
export const requirementsApi = {
  list: (
    id: string,
    params: {
      page?: number; pageSize?: number; search?: string;
      sortBy?: string; sortDir?: string;
    } & GlobalFilters
  ) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params.search) qs.set('search', params.search);
    if (params.sortBy) qs.set('sortBy', params.sortBy);
    if (params.sortDir) qs.set('sortDir', params.sortDir);
    if (params.year) qs.set('year', String(params.year));
    if (params.quarter) qs.set('quarter', params.quarter);
    if (params.semester) qs.set('semester', params.semester);
    if (params.month) qs.set('month', params.month);
    if (params.status?.length) qs.set('status', params.status.join(','));
    if (params.pic?.length) qs.set('pic', params.pic.join(','));
    if (params.category?.length) qs.set('category', params.category.join(','));
    if (params.platform?.length) qs.set('platform', params.platform.join(','));
    return request<PaginatedResponse<Record<string, unknown>>>(`/api/dashboards/${id}/requirements?${qs}`);
  },
  update: (dashId: string, reqId: string, data: Record<string, unknown>) =>
    request(`/api/dashboards/${dashId}/requirements/${reqId}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),
  delete: (dashId: string, reqId: string) =>
    request(`/api/dashboards/${dashId}/requirements/${reqId}`, { method: 'DELETE' }),
};

// ── Import ────────────────────────────────────────────────────────────────────
export const importApi = {
  validate: (dashId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return fetch(`${BASE_URL}/api/dashboards/${dashId}/import/validate`, {
      method: 'POST', credentials: 'include', body: fd,
    }).then(r => r.json()) as Promise<{ data: ImportValidationResult }>;
  },
  commit: (dashId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return fetch(`${BASE_URL}/api/dashboards/${dashId}/import/commit`, {
      method: 'POST', credentials: 'include', body: fd,
    }).then(r => r.json()) as Promise<{ data: { importId: string; insertedRows: number; updatedRows: number; errorRows: number; totalRows: number } }>;
  },
  history: (dashId: string, page = 1) =>
    request<PaginatedResponse<ImportHistory>>(
      `/api/dashboards/${dashId}/import/history?page=${page}&pageSize=20`
    ),
  getDetail: (dashId: string, importId: string) =>
    request<{ data: ImportHistory }>(`/api/dashboards/${dashId}/import/${importId}`),
  templateUrl: () => `${BASE_URL}/api/import/template`,
};
