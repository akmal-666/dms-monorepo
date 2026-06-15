'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronDown, FolderOpen, Layout, Plus, Settings } from 'lucide-react';
import { dashboardApi } from '@/lib/api';
import type { Dashboard } from '@dms/shared';
import { cn } from '@/lib/utils';

export default function DashboardSwitcher() {
  const router = useRouter();
  const params = useParams();
  const currentId = params?.dashboardId as string;

  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [current, setCurrent] = useState<Dashboard | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await dashboardApi.list(false);
        setDashboards(res.data);
        if (currentId) {
          const match = res.data.find(d => d.id === currentId);
          if (match) {
            setCurrent(match);
          } else {
            // fetch single if not in list
            const detail = await dashboardApi.get(currentId);
            setCurrent(detail.data);
          }
        }
      } catch (err) {
        console.error('Failed to load dashboards switcher:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentId]);

  const handleSelect = (id: string) => {
    setOpen(false);
    router.push(`/${id}`);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-secondary/50 border border-border hover:border-primary/30 text-sm font-medium text-foreground hover:bg-secondary transition-all w-56 justify-between text-left"
        disabled={loading}
      >
        <span className="flex items-center gap-2 truncate">
          <Layout className="w-4 h-4 text-primary shrink-0" />
          <span className="truncate">{current ? current.name : 'Select Dashboard'}</span>
        </span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-xl z-50 py-1.5 animate-scale-in overflow-hidden">
            <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              My Dashboards
            </div>
            
            <div className="max-h-60 overflow-y-auto">
              {dashboards.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground italic">No active dashboards</div>
              ) : (
                dashboards.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => handleSelect(d.id)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-secondary transition-colors",
                      d.id === currentId ? "text-primary bg-primary/5 font-semibold" : "text-foreground/80"
                    )}
                  >
                    <span className="truncate">{d.name}</span>
                    {d.id === currentId && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </button>
                ))
              )}
            </div>

            <div className="border-t border-border mt-1.5 pt-1.5 px-1.5">
              <button
                onClick={() => { setOpen(false); router.push('/'); }}
                className="w-full px-2.5 py-1.5 text-left text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                Manage All Dashboards
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
