'use client';
import { useEffect, useState } from 'react';
import { kpiApi } from '@/lib/api';
import { useFilterStore } from '@/lib/filter-store';
import type { KPIMetrics } from '@dms/shared';
import { 
  ClipboardList, 
  Loader2, 
  Hourglass, 
  CheckCircle2, 
  AlertCircle, 
  Percent, 
  Calendar, 
  Briefcase,
  Flame,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { formatNumber, formatPct, cn } from '@/lib/utils';

interface KPICardsProps {
  dashboardId: string;
}

export default function KPICards({ dashboardId }: KPICardsProps) {
  const filters = useFilterStore(s => s.filters);
  const [metrics, setMetrics] = useState<KPIMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadKPI() {
      setLoading(true);
      try {
        const res = await kpiApi.getMetrics(dashboardId, filters);
        setMetrics(res.data);
      } catch (err) {
        console.error('Failed to load KPI metrics:', err);
      } finally {
        setLoading(false);
      }
    }
    if (dashboardId) {
      loadKPI();
    }
  }, [dashboardId, filters]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-5 h-28 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
          </div>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  const cardData = [
    {
      title: 'Total Initiatives',
      value: metrics.totalInitiative,
      icon: ClipboardList,
      color: 'text-primary bg-primary/10',
      borderClass: 'border-l-4 border-l-primary',
      trend: '+12%',
      trendUp: true
    },
    {
      title: 'In Progress',
      value: metrics.inProgress,
      icon: Hourglass,
      color: 'text-blue-500 bg-blue-500/10',
      borderClass: 'border-l-4 border-l-blue-500',
      trend: '+4%',
      trendUp: true
    },
    {
      title: 'Completed',
      value: metrics.completed,
      icon: CheckCircle2,
      color: 'text-emerald-500 bg-emerald-500/10',
      borderClass: 'border-l-4 border-l-emerald-500',
      trend: '+25%',
      trendUp: true
    },
    {
      title: 'Overdue',
      value: metrics.overdue,
      icon: AlertCircle,
      color: 'text-rose-500 bg-rose-500/10',
      borderClass: 'border-l-4 border-l-rose-500',
      trend: '-8%',
      trendUp: false
    },
    {
      title: 'Achievement Progress',
      value: formatPct(metrics.achievementPct),
      icon: Percent,
      color: 'text-indigo-500 bg-indigo-500/10',
      borderClass: 'border-l-4 border-l-indigo-500',
      trend: '+15%',
      trendUp: true
    },
    {
      title: 'Planned MD',
      value: formatNumber(metrics.plannedMd, 1),
      icon: Calendar,
      color: 'text-amber-500 bg-amber-500/10',
      borderClass: 'border-l-4 border-l-amber-500',
      trend: '+8%',
      trendUp: true
    },
    {
      title: 'Actual MD',
      value: formatNumber(metrics.actualMd, 1),
      icon: Briefcase,
      color: 'text-violet-500 bg-violet-500/10',
      borderClass: 'border-l-4 border-l-violet-500',
      trend: '+10%',
      trendUp: true
    },
    {
      title: 'MD Variance',
      value: formatNumber(metrics.mdVariance, 1),
      icon: Briefcase,
      color: metrics.mdVariance >= 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10',
      borderClass: metrics.mdVariance >= 0 ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-rose-500',
      trend: metrics.mdVariance >= 0 ? 'Under Plan' : 'Over Plan',
      trendUp: metrics.mdVariance >= 0
    },
    {
      title: 'Delivery Health',
      value: formatPct(metrics.deliveryHealth),
      icon: Flame,
      color: 'text-cyan-500 bg-cyan-500/10',
      borderClass: 'border-l-4 border-l-cyan-500',
      trend: '+11%',
      trendUp: true
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cardData.map((card, idx) => (
        <div
          key={idx}
          className={cn(
            "bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 card-hover flex flex-col justify-between relative overflow-hidden",
            card.borderClass
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
              {card.title}
            </span>
            <div className={cn("p-1.5 rounded-lg shrink-0", card.color)}>
              <card.icon className="w-4 h-4" />
            </div>
          </div>
          
          <div className="mt-3 flex items-baseline justify-between gap-1">
            <span className="text-xl font-bold tracking-tight text-foreground count-up">
              {card.value}
            </span>
            
            <span className={cn(
              "inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md",
              card.trendUp 
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            )}>
              {card.trendUp ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
              {card.trend}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
