'use client';
import { useState, useEffect } from 'react';
import { dashboardApi } from '@/lib/api';
import type { Dashboard } from '@dms/shared';
import { useAuthStore, isManager } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { 
  Folder, 
  Plus, 
  Copy, 
  Archive, 
  Trash2, 
  Search, 
  ArrowRight, 
  Loader2, 
  PlusCircle, 
  Settings,
  ArchiveRestore,
  Calendar,
  Layers,
  FileText,
  X
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

export default function DashboardPortal() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);

  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  
  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadDashboards = async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.list(showArchived);
      setDashboards(res.data);
    } catch (err) {
      console.error('Failed to load dashboards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboards();
  }, [showArchived]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setActionLoading(true);
    try {
      const res = await dashboardApi.create({ name: newTitle, description: newDesc });
      setNewTitle('');
      setNewDesc('');
      setCreateOpen(false);
      // redirect to the new dashboard
      router.push(`/${res.data.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClone = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to clone this dashboard? All requirements, capacity, and target data will be copied.')) return;
    setActionLoading(true);
    try {
      const res = await dashboardApi.clone(id);
      loadDashboards();
      alert(`Dashboard cloned successfully as "${res.data.name}"`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Clone failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const actionText = showArchived ? 'restore' : 'archive';
    if (!confirm(`Are you sure you want to ${actionText} this dashboard?`)) return;
    setActionLoading(true);
    try {
      await dashboardApi.archive(id);
      loadDashboards();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Archive operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('CRITICAL WARNING: This will permanently delete the dashboard and all its linked initiatives, history, and Excel data. This action is irreversible. Proceed?')) return;
    setActionLoading(true);
    try {
      await dashboardApi.delete(id);
      loadDashboards();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setActionLoading(false);
    }
  };

  // filter query
  const filtered = dashboards.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Title & Portal Description */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" />
            Dashboard Portal Management
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Access, duplicate, or archive multi-dashboards containing segmented projects data.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Show archived toggle */}
          <button
            onClick={() => setShowArchived(v => !v)}
            className={cn(
              "px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5",
              showArchived 
                ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" 
                : "bg-secondary text-muted-foreground border-border hover:text-foreground"
            )}
          >
            {showArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            {showArchived ? 'Viewing Archived' : 'Show Archived'}
          </button>

          {/* Create Button (Managers/Admins) */}
          {isManager(user) && (
            <button
              onClick={() => setCreateOpen(true)}
              className="px-4 py-2.5 text-xs font-bold bg-primary hover:bg-primary/95 text-white rounded-xl transition-all shadow-md shadow-primary/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Dashboard
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search dashboards by name or description..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-all shadow-sm"
        />
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-3 border border-dashed border-border rounded-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
          <span className="text-xs text-muted-foreground font-semibold">Loading portal dashboards...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-20 text-center border border-dashed border-border rounded-2xl space-y-4">
          <Folder className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">No dashboards found</h3>
            <p className="text-xs text-muted-foreground">
              {search ? 'Try adjusting your search criteria.' : 'Create a new dashboard to get started.'}
            </p>
          </div>
          {isManager(user) && !search && (
            <button
              onClick={() => setCreateOpen(true)}
              className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors"
            >
              Create First Dashboard
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((dash) => (
            <div
              key={dash.id}
              onClick={() => router.push(`/${dash.id}`)}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer group flex flex-col justify-between h-52 relative overflow-hidden"
            >
              {/* Subtle accent line matching CRM cards */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/80 flex items-center justify-center text-primary border border-border group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors shrink-0">
                    <Folder className="w-5 h-5" />
                  </div>

                  {/* Actions buttons */}
                  {isManager(user) && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleClone(e, dash.id)}
                        className="p-1.5 hover:text-primary hover:bg-secondary rounded-lg transition-colors"
                        title="Clone dashboard"
                        disabled={actionLoading}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleArchive(e, dash.id)}
                        className="p-1.5 hover:text-amber-500 hover:bg-secondary rounded-lg transition-colors"
                        title={showArchived ? "Restore dashboard" : "Archive dashboard"}
                        disabled={actionLoading}
                      >
                        {showArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                      </button>
                      {user?.role === 'admin' && (
                        <button
                          onClick={(e) => handleDelete(e, dash.id)}
                          className="p-1.5 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-colors"
                          title="Permanently delete"
                          disabled={actionLoading}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                    {dash.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {dash.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              {/* Bottom statistics summary */}
              <div className="border-t border-border/60 pt-3 flex items-center justify-between text-[10px] font-semibold text-muted-foreground mt-4">
                <span className="flex items-center gap-1 font-mono">
                  <FileText className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                  {dash.requirementCount ?? 0} Requirements
                </span>
                
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  Created {formatDate(dash.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Dashboard Modal Dialog */}
      {createOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 relative animate-scale-in">
            <button 
              onClick={() => setCreateOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-foreground mb-1">Add Dashboard</h3>
            <p className="text-xs text-muted-foreground mb-4">Initialize a new dashboard folder instance.</p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Dashboard Name</label>
                <input
                  type="text"
                  placeholder="e.g. Project Initiatives CIS 2026"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Description</label>
                <textarea
                  placeholder="Detailed context about the initiatives contained in this dashboard."
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 text-xs font-bold bg-secondary hover:bg-secondary/80 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary/90 text-white rounded-xl transition-colors flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create Dashboard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
