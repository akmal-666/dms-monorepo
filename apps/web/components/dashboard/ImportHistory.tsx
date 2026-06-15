'use client';
import { useState, useEffect } from 'react';
import { importApi } from '@/lib/api';
import type { ImportHistory, ImportError } from '@dms/shared';
import { formatDate } from '@/lib/utils';
import { 
  History, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  Eye, 
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface ImportHistoryProps {
  dashboardId: string;
}

export default function ImportHistoryList({ dashboardId }: ImportHistoryProps) {
  const [history, setHistory] = useState<ImportHistory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedImport, setSelectedImport] = useState<ImportHistory | null>(null);
  const [selectedErrors, setSelectedErrors] = useState<ImportError[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      try {
        const res = await importApi.history(dashboardId, page);
        setHistory(res.data);
        setTotal(res.total);
      } catch (err) {
        console.error('Failed to load import history:', err);
      } finally {
        setLoading(false);
      }
    }
    if (dashboardId) {
      loadHistory();
    }
  }, [dashboardId, page]);

  const handleViewDetails = async (imp: ImportHistory) => {
    setSelectedImport(imp);
    setSelectedErrors([]);
    
    // If errors_json is already nested in our history row (or errors)
    if (imp.errors && imp.errors.length > 0) {
      setSelectedErrors(imp.errors);
      return;
    }

    setDetailsLoading(true);
    try {
      const res = await importApi.getDetail(dashboardId, imp.id);
      setSelectedErrors(res.data.errors || []);
    } catch (err) {
      console.error('Failed to load import details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-rose-500" />;
      case 'validating':
      case 'pending':
        return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20';
      case 'failed':
        return 'text-rose-600 bg-rose-500/10 border-rose-500/20';
      case 'validating':
      case 'pending':
        return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
      default:
        return 'text-muted-foreground bg-secondary/80 border-border';
    }
  };

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div id="import-history" className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
      <div>
        <h3 className="text-sm font-bold text-foreground">Import History</h3>
        <p className="text-[11px] text-muted-foreground">List of excel imports and verification results</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-10 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-muted-foreground text-xs font-medium">Loading history...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground italic border border-dashed border-border rounded-xl">
          No import history found. Start uploading Excel files to see data here.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-border bg-card/50">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/10 text-muted-foreground select-none font-bold">
                  <th className="p-3">Import Date</th>
                  <th className="p-3">File Name</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Total Rows</th>
                  <th className="p-3 text-center text-emerald-500">Inserted</th>
                  <th className="p-3 text-center text-blue-500">Updated</th>
                  <th className="p-3 text-center text-rose-500">Errors</th>
                  <th className="p-3">Imported By</th>
                  <th className="p-3 text-center font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 hover:bg-secondary/20 transition-colors">
                    <td className="p-3 font-semibold text-foreground/80">{formatDate(row.createdAt)}</td>
                    <td className="p-3 font-medium text-foreground max-w-xs truncate" title={row.filename}>
                      {row.filename}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold ${getStatusBadge(row.status)}`}>
                        {getStatusIcon(row.status)}
                        <span className="capitalize">{row.status}</span>
                      </span>
                    </td>
                    <td className="p-3 text-center font-medium text-foreground">{row.totalRows}</td>
                    <td className="p-3 text-center font-medium text-emerald-600 dark:text-emerald-400">{row.insertedRows}</td>
                    <td className="p-3 text-center font-medium text-blue-600 dark:text-blue-400">{row.updatedRows}</td>
                    <td className="p-3 text-center font-medium text-rose-600 dark:text-rose-400">{row.errorRows}</td>
                    <td className="p-3 text-muted-foreground font-medium">{row.importedByName || row.importedBy}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleViewDetails(row)}
                        className="p-1 hover:text-primary hover:bg-secondary rounded-md transition-colors"
                        title="View Errors / Details"
                      >
                        <Eye className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>Page {page} of {totalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 border border-border bg-card rounded-lg hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1 border border-border bg-card rounded-lg hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Details Modal */}
      {selectedImport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative animate-scale-in max-h-[85vh] flex flex-col">
            <button 
              onClick={() => setSelectedImport(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-foreground mb-1">Import File Details</h3>
            <p className="text-xs text-muted-foreground mb-4">
              File: <strong className="text-foreground">{selectedImport.filename}</strong> — Status: <span className="capitalize">{selectedImport.status}</span>
            </p>

            <div className="grid grid-cols-4 gap-4 p-3.5 bg-secondary/30 border border-border rounded-xl text-center text-xs font-semibold text-foreground mb-4">
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase">Total Rows</span>
                <span className="text-sm font-extrabold">{selectedImport.totalRows}</span>
              </div>
              <div className="text-emerald-500">
                <span className="text-[10px] text-muted-foreground block uppercase">Inserted</span>
                <span className="text-sm font-extrabold">{selectedImport.insertedRows}</span>
              </div>
              <div className="text-blue-500">
                <span className="text-[10px] text-muted-foreground block uppercase">Updated</span>
                <span className="text-sm font-extrabold">{selectedImport.updatedRows}</span>
              </div>
              <div className="text-rose-500">
                <span className="text-[10px] text-muted-foreground block uppercase">Errors</span>
                <span className="text-sm font-extrabold">{selectedImport.errorRows}</span>
              </div>
            </div>

            {detailsLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-10 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground font-semibold">Loading details...</span>
              </div>
            ) : selectedErrors.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-10 text-xs text-muted-foreground italic border border-dashed border-border rounded-xl">
                No validation errors occurred during this import.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto border border-border rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-secondary select-none font-bold">
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="p-2.5">Sheet</th>
                      <th className="p-2.5 text-center">Row</th>
                      <th className="p-2.5">Column</th>
                      <th className="p-2.5">Invalid Value</th>
                      <th className="p-2.5">Error Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedErrors.map((err, idx) => (
                      <tr key={idx} className="border-b border-border/60 hover:bg-secondary/20">
                        <td className="p-2.5 font-semibold text-foreground/80">{err.sheet}</td>
                        <td className="p-2.5 text-center font-mono font-medium text-foreground">{err.row}</td>
                        <td className="p-2.5 font-semibold text-foreground/80">{err.column}</td>
                        <td className="p-2.5 font-mono text-rose-500 bg-rose-500/5 max-w-[120px] truncate" title={err.value}>
                          {err.value || '—'}
                        </td>
                        <td className="p-2.5 font-medium text-rose-600 dark:text-rose-400">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
