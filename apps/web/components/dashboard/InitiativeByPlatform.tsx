'use client';
import { useEffect, useState } from 'react';
import { kpiApi } from '@/lib/api';
import { useFilterStore } from '@/lib/filter-store';
import { getPlatformColor } from '@/lib/utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Loader2 } from 'lucide-react';

interface InitiativeByPlatformProps {
  dashboardId: string;
}

export default function InitiativeByPlatform({ dashboardId }: InitiativeByPlatformProps) {
  const filters = useFilterStore(s => s.filters);
  const [data, setData] = useState<{ platform: string; count: number; plannedMd: number; actualMd: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await kpiApi.getByPlatform(dashboardId, filters);
        setData(res.data);
      } catch (err) {
        console.error('Failed to load platform chart data:', err);
      } finally {
        setLoading(false);
      }
    }
    if (dashboardId) {
      loadData();
    }
  }, [dashboardId, filters]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 h-80 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
      </div>
    );
  }

  // filter empty
  const chartData = data.filter(d => d.count > 0 || d.plannedMd > 0);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-80 flex flex-col justify-between">
      <div>
        <h3 className="text-sm font-bold text-foreground">Initiative by Platform</h3>
        <p className="text-[11px] text-muted-foreground">Initiatives count and workload by tech stack</p>
      </div>

      <div className="flex-1 min-h-[200px] mt-2">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 15, left: -20, bottom: 5 }}
            >
              <XAxis type="number" hide />
              <YAxis
                dataKey="platform"
                type="category"
                tickLine={false}
                axisLine={false}
                width={80}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 500 }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                formatter={(value: any, name: string) => {
                  if (name === 'count') return [value, 'Initiatives'];
                  if (name === 'plannedMd') return [`${value} MD`, 'Planned Effort'];
                  return [value, name];
                }}
              />
              <Bar 
                dataKey="count" 
                radius={[0, 4, 4, 0]}
                barSize={12}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getPlatformColor(entry.platform)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend list */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 border-t border-border/40 pt-3 text-[10px] text-muted-foreground">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getPlatformColor(item.platform) }} />
            <span className="font-semibold text-foreground/80">{item.platform}</span>
            <span>({item.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
