import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isValid } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  try {
    const d = parseISO(date);
    return isValid(d) ? format(d, 'dd MMM yyyy') : '—';
  } catch { return '—'; }
}

export function formatMonth(month: string | null | undefined): string {
  if (!month) return '—';
  try {
    const d = parseISO(`${month}-01`);
    return isValid(d) ? format(d, 'MMM yyyy') : month;
  } catch { return month ?? '—'; }
}

export function formatNumber(n: number | null | undefined, decimals = 1): string {
  if (n == null) return '0';
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

export function formatPct(n: number | null | undefined): string {
  if (n == null) return '0%';
  return `${formatNumber(n, 1)}%`;
}

export function getStatusClass(status: string): string {
  switch (status) {
    case 'Draft': return 'status-draft';
    case 'In Progress': return 'status-in-progress';
    case 'Done': return 'status-done';
    case 'Overdue': return 'status-overdue';
    case 'Cancelled': return 'status-cancelled';
    default: return 'status-draft';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Draft': return '#94a3b8';
    case 'In Progress': return '#60a5fa';
    case 'Done': return '#34d399';
    case 'Overdue': return '#f87171';
    case 'Cancelled': return '#71717a';
    default: return '#94a3b8';
  }
}

export function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    'CIS': '#3b82f6', 'Odoo': '#8b5cf6', 'CRM': '#06b6d4',
    'Power BI': '#f59e0b', 'Infrastructure': '#10b981',
    'Network': '#f97316', 'Security': '#ef4444', 'Other': '#6b7280',
  };
  return colors[platform] ?? '#6b7280';
}

export function truncate(str: string, len = 40): string {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}
