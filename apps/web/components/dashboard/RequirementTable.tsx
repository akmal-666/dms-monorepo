'use client';
import { useState, useEffect } from 'react';
import { useFilterStore } from '@/lib/filter-store';
import { requirementsApi } from '@/lib/api';
import { useAuthStore, isManager } from '@/lib/auth';
import type { Requirement, RequirementStatus, Platform } from '@dms/shared';
import { 
  VALID_STATUSES, 
  VALID_PLATFORMS 
} from '@dms/shared';
import { 
  formatDate, 
  formatNumber, 
  getStatusClass 
} from '@/lib/utils';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Edit, 
  Trash2, 
  Plus, 
  X, 
  Loader2 
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface RequirementTableProps {
  dashboardId: string;
}

export default function RequirementTable({ dashboardId }: RequirementTableProps) {
  const user = useAuthStore(s => s.user);
  const filters = useFilterStore(s => s.filters);

  // States
  const [data, setData] = useState<Requirement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15); // standard pagination limit
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<Requirement | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Re-fetch on filter/sort change
  useEffect(() => {
    async function loadTable() {
      setLoading(true);
      try {
        const res = await requirementsApi.list(dashboardId, {
          page,
          pageSize,
          search,
          sortBy,
          sortDir,
          ...filters,
        });
        setData(res.data as unknown as Requirement[]);
        setTotal(res.total);
      } catch (err) {
        console.error('Failed to load requirements table:', err);
      } finally {
        setLoading(false);
      }
    }
    if (dashboardId) {
      loadTable();
    }
  }, [dashboardId, page, pageSize, search, sortBy, sortDir, filters]);

  // Handle delete
  const handleDelete = async (reqId: string) => {
    if (!confirm('Are you sure you want to delete this requirement?')) return;
    try {
      await requirementsApi.delete(dashboardId, reqId);
      setData(prev => prev.filter(r => r.reqId !== reqId));
      setTotal(t => t - 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // Handle edit submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setEditLoading(true);
    try {
      await requirementsApi.update(dashboardId, editItem.reqId, {
        title: editItem.title,
        category: editItem.category,
        platform: editItem.platform,
        pic: editItem.pic,
        requestor: editItem.requestor,
        status: editItem.status,
        progress: Number(editItem.progress),
        plannedMd: Number(editItem.plannedMd),
        actualMd: Number(editItem.actualMd),
        startDate: editItem.startDate || null,
        dueDate: editItem.dueDate || null,
      });
      
      // Update local state
      setData(prev => prev.map(item => item.id === editItem.id ? editItem : item));
      setEditItem(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setEditLoading(false);
    }
  };

  // Export Table to Excel using SheetJS
  const handleExportExcel = async () => {
    try {
      // Fetch ALL filtered requirements (without pagination)
      const res = await requirementsApi.list(dashboardId, {
        page: 1,
        pageSize: 10000,
        search,
        sortBy,
        sortDir,
        ...filters,
      });
      const allRows = res.data as unknown as Requirement[];

      const excelRows = allRows.map(r => ({
        'Requirement ID': r.reqId,
        'Title': r.title,
        'Category': r.category || '',
        'Platform': r.platform || '',
        'Requestor': r.requestor || '',
        'PIC': r.pic || '',
        'Status': r.status,
        'Progress (%)': r.progress,
        'Start Date': r.startDate ? formatDate(r.startDate) : '',
        'Due Date': r.dueDate ? formatDate(r.dueDate) : '',
        'Planned Mandays': r.plannedMd,
        'Actual Mandays': r.actualMd,
        'Variance Mandays': r.plannedMd - r.actualMd,
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Requirements');
      
      // Auto-fit columns
      const maxLens = Object.keys(excelRows[0] || {}).map(key => 
        Math.max(key.length, ...excelRows.map(row => String((row as any)[key]).length))
      );
      worksheet['!cols'] = maxLens.map(len => ({ wch: len + 3 }));

      XLSX.writeFile(workbook, `DMS_Requirements_Export_${dashboardId}.xlsx`);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  const renderSortIcon = (column: string) => {
    if (sortBy !== column) return <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/30 ml-1 shrink-0" />;
    return sortDir === 'asc' 
      ? <ChevronUp className="w-3.5 h-3.5 text-primary ml-1 shrink-0" />
      : <ChevronDown className="w-3.5 h-3.5 text-primary ml-1 shrink-0" />;
  };

  return (
    <div id="requirements-table" className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">Requirement Detail</h3>
          <p className="text-[11px] text-muted-foreground">Detailed backlog tracking with Excel exporting</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search initiatives..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="bg-secondary/40 border border-border rounded-xl pl-9 pr-4 py-1.5 text-xs w-60 focus:outline-none focus:border-primary/50 transition-colors text-foreground"
            />
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 text-xs font-semibold bg-secondary/80 border border-border text-foreground hover:bg-secondary hover:border-primary/20 px-3.5 py-2 rounded-xl transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Table grid */}
      <div className="overflow-x-auto rounded-xl border border-border/80 bg-card/50">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-secondary/20 select-none">
              <th className="p-3.5 font-bold text-muted-foreground cursor-pointer hover:bg-secondary/40" onClick={() => handleSort('reqId')}>
                <span className="flex items-center">Req ID {renderSortIcon('reqId')}</span>
              </th>
              <th className="p-3.5 font-bold text-muted-foreground cursor-pointer hover:bg-secondary/40 w-1/4" onClick={() => handleSort('title')}>
                <span className="flex items-center">Title {renderSortIcon('title')}</span>
              </th>
              <th className="p-3.5 font-bold text-muted-foreground cursor-pointer hover:bg-secondary/40" onClick={() => handleSort('category')}>
                <span className="flex items-center">Category {renderSortIcon('category')}</span>
              </th>
              <th className="p-3.5 font-bold text-muted-foreground cursor-pointer hover:bg-secondary/40" onClick={() => handleSort('platform')}>
                <span className="flex items-center">Platform {renderSortIcon('platform')}</span>
              </th>
              <th className="p-3.5 font-bold text-muted-foreground cursor-pointer hover:bg-secondary/40" onClick={() => handleSort('pic')}>
                <span className="flex items-center">PIC {renderSortIcon('pic')}</span>
              </th>
              <th className="p-3.5 font-bold text-muted-foreground cursor-pointer hover:bg-secondary/40" onClick={() => handleSort('status')}>
                <span className="flex items-center">Status {renderSortIcon('status')}</span>
              </th>
              <th className="p-3.5 font-bold text-muted-foreground cursor-pointer hover:bg-secondary/40" onClick={() => handleSort('progress')}>
                <span className="flex items-center">Progress {renderSortIcon('progress')}</span>
              </th>
              <th className="p-3.5 font-bold text-muted-foreground cursor-pointer hover:bg-secondary/40" onClick={() => handleSort('plannedMd')}>
                <span className="flex items-center">Planned {renderSortIcon('plannedMd')}</span>
              </th>
              <th className="p-3.5 font-bold text-muted-foreground cursor-pointer hover:bg-secondary/40" onClick={() => handleSort('actualMd')}>
                <span className="flex items-center">Actual {renderSortIcon('actualMd')}</span>
              </th>
              {isManager(user) && <th className="p-3.5 font-bold text-muted-foreground text-center">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="p-10 text-center">
                  <div className="flex flex-col items-center gap-2 justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-muted-foreground text-xs font-semibold">Loading data...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-10 text-center text-muted-foreground italic">
                  No requirements found for this filter combination.
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.id} className="border-b border-border/60 hover:bg-secondary/20 transition-colors">
                  <td className="p-3.5 font-mono text-primary font-bold">{row.reqId}</td>
                  <td className="p-3.5 font-semibold text-foreground/90 truncate max-w-xs" title={row.title}>
                    {row.title}
                  </td>
                  <td className="p-3.5 text-muted-foreground">{row.category || '—'}</td>
                  <td className="p-3.5">
                    {row.platform ? (
                      <span className="bg-secondary/80 border border-border px-2 py-0.5 rounded-md font-semibold text-foreground/80">
                        {row.platform}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="p-3.5">
                    {row.pic ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[9px] flex items-center justify-center border border-primary/20 shrink-0">
                          {row.pic.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground/80 truncate max-w-[100px]" title={row.pic}>{row.pic}</span>
                      </div>
                    ) : '—'}
                  </td>
                  <td className="p-3.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold ${getStatusClass(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2 w-24">
                      <div className="flex-1 bg-secondary rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-primary h-full rounded-full" 
                          style={{ width: `${row.progress}%` }} 
                        />
                      </div>
                      <span className="font-semibold w-8 text-right text-foreground/70">{row.progress}%</span>
                    </div>
                  </td>
                  <td className="p-3.5 font-medium text-foreground">{row.plannedMd} MD</td>
                  <td className="p-3.5 font-medium text-foreground">{row.actualMd} MD</td>
                  {isManager(user) && (
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setEditItem(row)}
                          className="p-1 hover:text-primary hover:bg-secondary rounded-md transition-colors"
                          title="Edit requirement"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(row.reqId)}
                          className="p-1 hover:text-red-500 hover:bg-red-500/5 rounded-md transition-colors"
                          title="Delete requirement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
          <span>
            Showing <strong>{Math.min(total, (page - 1) * pageSize + 1)}</strong> to <strong>{Math.min(total, page * pageSize)}</strong> of <strong>{total}</strong> initiatives
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 border border-border bg-card rounded-lg hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="font-semibold text-foreground px-2">
              Page {page} of {totalPages}
            </div>

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 border border-border bg-card rounded-lg hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Edit Dialog Modal */}
      {editItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl p-6 relative animate-scale-in max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setEditItem(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-foreground mb-1">Edit Requirement {editItem.reqId}</h3>
            <p className="text-xs text-muted-foreground mb-4">Manually update the requirement parameters.</p>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Title</label>
                <input
                  type="text"
                  value={editItem.title}
                  onChange={e => setEditItem(v => v ? { ...v, title: e.target.value } : null)}
                  required
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground/80">Category</label>
                  <input
                    type="text"
                    value={editItem.category || ''}
                    onChange={e => setEditItem(v => v ? { ...v, category: e.target.value } : null)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground/80">Platform</label>
                  <select
                    value={editItem.platform || ''}
                    onChange={e => setEditItem(v => v ? { ...v, platform: e.target.value as Platform } : null)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="">Select Platform</option>
                    {VALID_PLATFORMS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground/80">Requestor</label>
                  <input
                    type="text"
                    value={editItem.requestor || ''}
                    onChange={e => setEditItem(v => v ? { ...v, requestor: e.target.value } : null)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground/80">PIC</label>
                  <input
                    type="text"
                    value={editItem.pic || ''}
                    onChange={e => setEditItem(v => v ? { ...v, pic: e.target.value } : null)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground/80">Status</label>
                  <select
                    value={editItem.status}
                    onChange={e => setEditItem(v => v ? { ...v, status: e.target.value as RequirementStatus } : null)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  >
                    {VALID_STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground/80">Progress (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editItem.progress}
                    onChange={e => setEditItem(v => v ? { ...v, progress: Number(e.target.value) } : null)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground/80">Planned Mandays</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editItem.plannedMd}
                    onChange={e => setEditItem(v => v ? { ...v, plannedMd: Number(e.target.value) } : null)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground/80">Actual Mandays</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editItem.actualMd}
                    onChange={e => setEditItem(v => v ? { ...v, actualMd: Number(e.target.value) } : null)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground/80">Start Date</label>
                  <input
                    type="date"
                    value={editItem.startDate ? editItem.startDate.substring(0, 10) : ''}
                    onChange={e => setEditItem(v => v ? { ...v, startDate: e.target.value } : null)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground/80">Due Date</label>
                  <input
                    type="date"
                    value={editItem.dueDate ? editItem.dueDate.substring(0, 10) : ''}
                    onChange={e => setEditItem(v => v ? { ...v, dueDate: e.target.value } : null)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 text-xs font-bold bg-secondary hover:bg-secondary/80 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary/90 text-white rounded-xl transition-colors flex items-center gap-1.5"
                >
                  {editLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
