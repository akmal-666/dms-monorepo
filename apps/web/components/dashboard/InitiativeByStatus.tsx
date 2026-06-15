'use client';
import { useEffect, useState } from 'react';
import { kpiApi } from '@/lib/api';
import { useFilterStore } from '@/lib/filter-store';
import { getStatusColor } from '@/lib/utils';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Loader2 } from 'lucide-react';

interface InitiativeByStatusProps {
  dashboardId: string;
}

export default function InitiativeByStatus({ dashboardId }: InitiativeByStatusProps) {
  const filters = useFilterStore(s => s.filters);
  const [data, setData] = useState<{ status: string; count: number; percentage: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await kpiApi.getByStatus(dashboardId, filters);
        setData(res.data);
      } catch (err) {
        console.error('Failed to load status chart data:', err);
      } finally {
        setLoading(false);
      }
    }
    if (dashboardId) {
      loadData();
    }
  }, [dashboardId, filters]);

  const total = data.reduce((acc, curr) => acc + curr.count, 0);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 h-80 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
      </div>
    );
  }

  const chartData = data.filter(d => d.count > 0);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-80 flex flex-col justify-between">
      <div>
        <h3 className="text-sm font-bold text-foreground">Initiative by Status</h3>
        <p className="text-[11px] text-muted-foreground">Distribution of requirements by status</p>
      </div>

      <div className="flex-1 relative flex items-center justify-center min-h-[160px]">
        {chartData.length === 0 ? (
          <div className="text-xs text-muted-foreground italic">No data available</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="status"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    `${value} (${((value / (total || 1)) * 100).toFixed(1)}%)`, 
                    name
                  ]} 
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Centered Total Text matching CRMi donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total</span>
              <span className="text-xl font-extrabold text-foreground">{total}</span>
            </div>
          </>
        )}
      </div>

      {/* Legend Grid */}
      <div className="grid grid-cols-3 gap-2 border-t border-border/40 pt-3">
        {data.map((item, idx) => (
          <div key={idx} className="flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1.5 justify-center">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getStatusColor(item.status) }} />
              <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[65px]" title={item.status}>
                {item.status}
              </span>
            </div>
            <span className="text-xs font-bold text-foreground mt-0.5">
              {item.count} <span className="text-[9px] font-normal text-muted-foreground">({item.percentage.toFixed(0)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
