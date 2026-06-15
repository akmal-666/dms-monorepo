'use client';
import { useEffect, useState } from 'react';
import { kpiApi } from '@/lib/api';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';

interface ResourceUtilizationProps {
  dashboardId: string;
}

interface UtilizationData {
  team: string;
  month: string;
  capacityMd: number;
  usedMd: number;
  utilizationPct: number;
}

export default function ResourceUtilization({ dashboardId }: ResourceUtilizationProps) {
  const [data, setData] = useState<UtilizationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await kpiApi.getResourceUtilization(dashboardId);
        setData(res.data);
      } catch (err) {
        console.error('Failed to load resource utilization data:', err);
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

  // Group data by team or show the raw list (if it's per team-month)
  // Let's group by team and sum the capacities and used MDs to show overall resource capacity by team
  const groupedByTeam = data.reduce((acc, curr) => {
    const existing = acc.find(item => item.team === curr.team);
    if (existing) {
      existing.capacityMd += curr.capacityMd;
      existing.usedMd += curr.usedMd;
    } else {
      acc.push({ ...curr });
    }
    return acc;
  }, [] as UtilizationData[]);

  // Calculate percentage for grouped teams
  const chartData = groupedByTeam.map(t => ({
    ...t,
    utilizationPct: t.capacityMd > 0 ? (t.usedMd / t.capacityMd) * 100 : 0
  }));

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-[340px] flex flex-col justify-between">
      <div>
        <h3 className="text-sm font-bold text-foreground">Resource Utilization</h3>
        <p className="text-[11px] text-muted-foreground">Capacity Mandays vs Used Mandays by Team</p>
      </div>

      <div className="flex-1 min-h-[220px] mt-4">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="team" 
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
                cursor={{ fill: 'rgba(0,0,0,0.01)' }}
                formatter={(value: any, name: string) => {
                  if (name === 'capacityMd') return [`${value.toFixed(1)} MD`, 'Total Capacity'];
                  if (name === 'usedMd') return [`${value.toFixed(1)} MD`, 'Used Effort'];
                  return [value, name];
                }}
              />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                iconSize={8}
                content={({ payload }) => (
                  <div className="flex justify-end gap-4 text-xs font-medium text-muted-foreground mb-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                      Total Capacity
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                      Used Effort
                    </span>
                  </div>
                )}
              />
              <Bar 
                dataKey="capacityMd" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]} 
                barSize={16}
              />
              <Bar 
                dataKey="usedMd" 
                fill="#06b6d4" 
                radius={[4, 4, 0, 0]} 
                barSize={16}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer stats summary */}
      {chartData.length > 0 && (
        <div className="flex justify-around border-t border-border/40 pt-3 text-[10px] text-muted-foreground">
          {chartData.slice(0, 4).map((item, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <span className="font-semibold text-foreground/80">{item.team}</span>
              <span className="font-bold text-primary mt-0.5">{item.utilizationPct.toFixed(0)}% Utilized</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
