'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { dashboardApi } from '@/lib/api';
import type { Dashboard } from '@dms/shared';

// Component imports
import GlobalFilterPanel from '@/components/dashboard/GlobalFilterPanel';
import KPICards from '@/components/dashboard/KPICards';
import InitiativeByStatus from '@/components/dashboard/InitiativeByStatus';
import InitiativeByPlatform from '@/components/dashboard/InitiativeByPlatform';
import ResourceUtilization from '@/components/dashboard/ResourceUtilization';
import DeliveryTimeline from '@/components/dashboard/DeliveryTimeline';
import RequirementTable from '@/components/dashboard/RequirementTable';
import ImportHistoryList from '@/components/dashboard/ImportHistory';

import { Loader2, AlertCircle, Calendar, FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DashboardDetail() {
  const params = useParams();
  const router = useRouter();
  const dashboardId = params?.dashboardId as string;

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDetail() {
      setLoading(true);
      setError('');
      try {
        const res = await dashboardApi.get(dashboardId);
        setDashboard(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard details');
      } finally {
        setLoading(false);
      }
    }
    if (dashboardId) {
      loadDetail();
    }
  }, [dashboardId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-20 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-semibold">Loading dashboard workspace...</span>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-card border border-border p-6 rounded-2xl text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-foreground">Dashboard Not Found</h3>
          <p className="text-xs text-muted-foreground">
            {error || 'This dashboard does not exist or you do not have permission to view it.'}
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Portal List
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto w-full animate-fade-in">
      {/* Title Header area */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">
            {dashboard.name}
          </h1>
          {dashboard.description && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {dashboard.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground bg-secondary/35 px-4 py-2 border border-border rounded-xl">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            Updated {new Date(dashboard.updatedAt).toLocaleDateString()}
          </span>
          <span className="w-px h-3.5 bg-border" />
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-500" />
            {dashboard.requirementCount || 0} initiatives
          </span>
        </div>
      </div>

      {/* 1. Global Filter Panel */}
      <GlobalFilterPanel dashboardId={dashboardId} />

      {/* 2. KPI Cards */}
      <KPICards dashboardId={dashboardId} />

      {/* 3. Charts Row 1: Status Distribution & Platforms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <InitiativeByStatus dashboardId={dashboardId} />
        </div>
        <div className="lg:col-span-2">
          <InitiativeByPlatform dashboardId={dashboardId} />
        </div>
      </div>

      {/* 4. Charts Row 2: Resource Utilization & Delivery Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ResourceUtilization dashboardId={dashboardId} />
        <DeliveryTimeline dashboardId={dashboardId} />
      </div>

      {/* 5. Requirement Detail Table */}
      <RequirementTable dashboardId={dashboardId} />

      {/* 6. Import History Section */}
      <ImportHistoryList dashboardId={dashboardId} />
    </div>
  );
}
