'use client';
import { useEffect, useState } from 'react';
import { kpiApi } from '@/lib/api';
import { formatMonth } from '@/lib/utils';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Loader2 } from 'lucide-react';

interface DeliveryTimelineProps {
  dashboardId: string;
}

interface TimelineItem {
  month: string;
  target: number;
  actual: number;
  achievement: number;
}

export default function DeliveryTimeline({ dashboardId }: DeliveryTimelineProps) {
  const [data, setData] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await kpiApi.getDeliveryTimeline(dashboardId);
        // sort by month YYYY-MM
        const sorted = (res.data || []).sort((a, b) => a.month.localeCompare(b.month));
        setData(sorted);
      } catch (err) {
        console.error('Failed to load delivery timeline data:', err);
      } finally {
        setLoading(false);
      }
    }
    if (dashboardId) {
      loadData();
    }
  }, [dashboardId]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 h-[340px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
      </div>
    );
  }

  // format months for display
  const chartData = data.map(d => ({
    ...d,
    formattedMonth: formatMonth(d.month)
  }));

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-[340px] flex flex-col justify-between">
      <div>
        <h3 className="text-sm font-bold text-foreground">Delivery Timeline</h3>
        <p className="text-[11px] text-muted-foreground">Target vs Actual delivery count per month</p>
      </div>

      <div className="flex-1 min-h-[220px] mt-4">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02}/>
                </linearGradient>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="formattedMonth" 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 500 }}
              />
              <YAxis 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === 'target') return [value, 'Target Items'];
                  if (name === 'actual') return [value, 'Actual Items'];
                  return [value, name];
                }}
              />
              <Area 
                type="monotone" 
                dataKey="target" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorTarget)" 
              />
              <Area 
                type="monotone" 
                dataKey="actual" 
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorActual)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Timeline metrics summary */}
      {chartData.length > 0 && (
        <div className="flex justify-around border-t border-border/40 pt-3 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span>Target Total: <strong>{data.reduce((a, b) => a + b.target, 0)}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Actual Total: <strong>{data.reduce((a, b) => a + b.actual, 0)}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
