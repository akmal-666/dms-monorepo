'use client';
import { useState } from 'react';
import type { ImportValidationResult, ImportError } from '@dms/shared';
import { importApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  Database,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportPreviewProps {
  dashboardId: string;
  result: ImportValidationResult;
  file: File;
  onReset: () => void;
}

export default function ImportPreview({ dashboardId, result, file, onReset }: ImportPreviewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'req' | 'resource' | 'delivery'>('req');
  const [commitLoading, setCommitLoading] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState<any | null>(null);
  const [commitError, setCommitError] = useState('');

  const { isValid, requirements, resourceCapacity, deliveryTargets, errors, summary } = result;

  const handleCommit = async () => {
    setCommitLoading(true);
    setCommitError('');
    try {
      const res = await importApi.commit(dashboardId, file);
      setCommitSuccess(res.data);
    } catch (err) {
      setCommitError(err instanceof Error ? err.message : 'Failed to commit import');
    } finally {
      setCommitLoading(false);
    }
  };

  if (commitSuccess) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-6 max-w-xl mx-auto shadow-lg animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
          <CheckCircle2 className="w-8 h-8 animate-pulse-glow" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-foreground">Import Completed Successfully!</h3>
          <p className="text-xs text-muted-foreground">The data has been incrementally upserted into the dashboard.</p>
        </div>

        <div className="grid grid-cols-3 gap-4 p-4 bg-secondary/30 border border-border rounded-xl text-xs font-semibold">
          <div>
            <span className="text-[10px] text-muted-foreground block uppercase">Total Parsed</span>
            <span className="text-sm font-extrabold text-foreground">{commitSuccess.totalRows}</span>
          </div>
          <div>
            <span className="text-[10px] text-emerald-500 block uppercase">New Inserted</span>
            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{commitSuccess.insertedRows}</span>
          </div>
          <div>
            <span className="text-[10px] text-blue-500 block uppercase">Updated</span>
            <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">{commitSuccess.updatedRows}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-center pt-2">
          <button
            onClick={() => router.push(`/${dashboardId}`)}
            className="px-5 py-2.5 text-xs font-bold bg-primary hover:bg-primary/95 text-white rounded-xl transition-all shadow-md shadow-primary/20 flex items-center gap-1.5"
          >
            Go to Dashboard Overview
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Banner Status */}
      <div className={cn(
        "p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm",
        isValid 
          ? "bg-emerald-500/5 border-emerald-500/20" 
          : "bg-rose-500/5 border-rose-500/20"
      )}>
        <div className="flex items-start gap-3.5">
          <div className={cn(
            "p-2.5 rounded-full shrink-0 border",
            isValid ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"
          )}>
            {isValid ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">
              {isValid ? 'Spreadsheet Validation Passed' : 'Spreadsheet Validation Failed'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isValid 
                ? 'All rows met schema compliance. Ready to incrementally upsert.' 
                : `${errors.length} formatting/structure errors found. Correct your file to commit.`
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onReset}
            className="px-4 py-2 text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground rounded-xl border border-border transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Upload Different File
          </button>

          <button
            onClick={handleCommit}
            disabled={!isValid || commitLoading}
            className={cn(
              "px-5 py-2.5 text-xs font-bold text-white rounded-xl transition-all shadow-md flex items-center gap-1.5",
              isValid 
                ? "bg-primary hover:bg-primary/95 shadow-primary/20" 
                : "bg-muted text-muted-foreground border border-border cursor-not-allowed shadow-none"
            )}
          >
            {commitLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
            Commit Import
          </button>
        </div>
      </div>

      {commitError && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
          {commitError}
        </div>
      )}

      {/* Numerical summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <span className="text-[10px] text-muted-foreground block uppercase font-bold">Total Requirements</span>
          <span className="text-base font-extrabold text-foreground mt-0.5 block">{summary.totalRequirements}</span>
          <span className="text-[9px] text-muted-foreground font-medium block mt-0.5">
            ({summary.newRequirements} new / {summary.updateRequirements} updates)
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <span className="text-[10px] text-muted-foreground block uppercase font-bold">Capacity Rows</span>
          <span className="text-base font-extrabold text-foreground mt-0.5 block">{summary.totalResourceRows}</span>
          <span className="text-[9px] text-muted-foreground font-medium block mt-0.5">Resource Util. Sheets</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <span className="text-[10px] text-muted-foreground block uppercase font-bold">Delivery Targets</span>
          <span className="text-base font-extrabold text-foreground mt-0.5 block">{summary.totalDeliveryRows}</span>
          <span className="text-[9px] text-muted-foreground font-medium block mt-0.5">Timeline Targets Sheets</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <span className="text-[10px] text-muted-foreground block uppercase font-bold">Validation Errors</span>
          <span className={cn("text-base font-extrabold mt-0.5 block", errors.length > 0 ? "text-rose-500" : "text-emerald-500")}>
            {errors.length}
          </span>
          <span className="text-[9px] text-muted-foreground font-medium block mt-0.5">Schema Warnings</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-3">
        <div className="flex border-b border-border/80">
          <button
            onClick={() => setActiveTab('req')}
            className={cn(
              "px-5 py-2.5 text-xs font-bold border-b-2 transition-all -mb-px",
              activeTab === 'req' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Requirements ({requirements.length})
          </button>
          <button
            onClick={() => setActiveTab('resource')}
            className={cn(
              "px-5 py-2.5 text-xs font-bold border-b-2 transition-all -mb-px",
              activeTab === 'resource' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Resource Capacity ({resourceCapacity.length})
          </button>
          <button
            onClick={() => setActiveTab('delivery')}
            className={cn(
              "px-5 py-2.5 text-xs font-bold border-b-2 transition-all -mb-px",
              activeTab === 'delivery' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Delivery Targets ({deliveryTargets.length})
          </button>
        </div>

        {/* Tab contents */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {activeTab === 'req' && (
            <div className="overflow-x-auto max-h-[450px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-secondary/80 backdrop-blur-sm select-none font-bold">
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="p-3 text-center">Row</th>
                    <th className="p-3">Req ID</th>
                    <th className="p-3">Title</th>
                    <th className="p-3">Platform</th>
                    <th className="p-3">PIC</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Planned MD</th>
                    <th className="p-3">Compliance</th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.map((row, idx) => {
                    const rowHasError = row.errors && row.errors.length > 0;
                    return (
                      <tr 
                        key={idx} 
                        className={cn(
                          "border-b border-border/50 transition-colors",
                          rowHasError ? "bg-rose-500/5 hover:bg-rose-500/10" : "hover:bg-secondary/20"
                        )}
                      >
                        <td className="p-3 text-center text-muted-foreground font-mono">{row.rowIndex}</td>
                        <td className="p-3 font-mono font-bold text-foreground">{row.reqId}</td>
                        <td className="p-3 max-w-xs truncate" title={row.title}>{row.title}</td>
                        <td className="p-3 text-muted-foreground font-semibold">{row.platform || '—'}</td>
                        <td className="p-3 font-medium text-foreground">{row.pic || '—'}</td>
                        <td className="p-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                            row.status === 'Done' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' : 'text-foreground/80 border-border bg-secondary'
                          )}>
                            {row.status}
                          </span>
                        </td>
                        <td className="p-3 text-right font-medium text-foreground">{row.plannedMd} MD</td>
                        <td className="p-3">
                          {rowHasError ? (
                            <div className="flex flex-col gap-0.5 text-rose-500 font-semibold text-[10px]">
                              {row.errors?.map((e, eIdx) => (
                                <span key={eIdx} className="flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                                  {e.column}: {e.message}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className={cn(
                              "inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold",
                              row.isNew 
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                                : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            )}>
                              {row.isNew ? 'New' : 'Update'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'resource' && (
            <div className="overflow-x-auto max-h-[450px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-secondary/80 backdrop-blur-sm select-none font-bold">
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="p-3 text-center">Row</th>
                    <th className="p-3">Team</th>
                    <th className="p-3">Month</th>
                    <th className="p-3 text-right">Capacity MD</th>
                    <th className="p-3">Compliance</th>
                  </tr>
                </thead>
                <tbody>
                  {resourceCapacity.map((row, idx) => {
                    const rowHasError = row.errors && row.errors.length > 0;
                    return (
                      <tr 
                        key={idx} 
                        className={cn(
                          "border-b border-border/50 transition-colors",
                          rowHasError ? "bg-rose-500/5 hover:bg-rose-500/10" : "hover:bg-secondary/20"
                        )}
                      >
                        <td className="p-3 text-center text-muted-foreground font-mono">{row.rowIndex}</td>
                        <td className="p-3 font-semibold text-foreground">{row.team}</td>
                        <td className="p-3 font-mono font-medium text-foreground">{row.month}</td>
                        <td className="p-3 text-right font-medium text-foreground">{row.capacityMd} MD</td>
                        <td className="p-3">
                          {rowHasError ? (
                            <span className="text-rose-500 font-semibold flex items-center gap-1 text-[10px]">
                              <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                              {row.errors?.[0].message}
                            </span>
                          ) : (
                            <span className="text-emerald-500 font-bold flex items-center gap-1 text-[10px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              Valid
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'delivery' && (
            <div className="overflow-x-auto max-h-[450px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-secondary/80 backdrop-blur-sm select-none font-bold">
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="p-3 text-center">Row</th>
                    <th className="p-3">Month</th>
                    <th className="p-3">Team</th>
                    <th className="p-3 text-right">Target</th>
                    <th className="p-3 text-right">Actual</th>
                    <th className="p-3">Compliance</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryTargets.map((row, idx) => {
                    const rowHasError = row.errors && row.errors.length > 0;
                    return (
                      <tr 
                        key={idx} 
                        className={cn(
                          "border-b border-border/50 transition-colors",
                          rowHasError ? "bg-rose-500/5 hover:bg-rose-500/10" : "hover:bg-secondary/20"
                        )}
                      >
                        <td className="p-3 text-center text-muted-foreground font-mono">{row.rowIndex}</td>
                        <td className="p-3 font-mono font-medium text-foreground">{row.month}</td>
                        <td className="p-3 font-semibold text-foreground">{row.team}</td>
                        <td className="p-3 text-right font-medium text-foreground">{row.target}</td>
                        <td className="p-3 text-right font-medium text-foreground">{row.actual}</td>
                        <td className="p-3">
                          {rowHasError ? (
                            <span className="text-rose-500 font-semibold flex items-center gap-1 text-[10px]">
                              <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                              {row.errors?.[0].message}
                            </span>
                          ) : (
                            <span className="text-emerald-500 font-bold flex items-center gap-1 text-[10px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              Valid
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
