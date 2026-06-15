'use client';
import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, Loader2 } from 'lucide-react';
import { importApi } from '@/lib/api';
import type { ImportValidationResult } from '@dms/shared';
import { cn } from '@/lib/utils';

interface ExcelUploaderProps {
  dashboardId: string;
  onValidationSuccess: (result: ImportValidationResult, file: File) => void;
}

export default function ExcelUploader({ dashboardId, onValidationSuccess }: ExcelUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Please upload a valid Excel spreadsheet file (.xlsx or .xls)');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await importApi.validate(dashboardId, file);
      onValidationSuccess(res.data, file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Excel validation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full space-y-4">
      {/* Drag Drop Container */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        className={cn(
          "w-full h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-200 relative overflow-hidden select-none",
          dragActive 
            ? "border-primary bg-primary/5 scale-[0.99]" 
            : "border-border hover:border-primary/40 bg-card hover:bg-secondary/35",
          loading && "pointer-events-none opacity-80"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".xlsx, .xls"
          onChange={handleChange}
          disabled={loading}
        />

        {loading ? (
          <div className="space-y-3 flex flex-col items-center justify-center animate-fade-in">
            <div className="p-4 rounded-full bg-primary/10 text-primary">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">Validating Spreadsheet...</h4>
              <p className="text-xs text-muted-foreground mt-1">Analyzing workbook structure and row compliance.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 flex flex-col items-center justify-center animate-fade-in">
            <div className="p-4 rounded-full bg-secondary text-muted-foreground hover:text-primary transition-colors">
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Drag and drop your Excel template here, or <span className="text-primary font-bold hover:underline">browse</span>
              </h4>
              <p className="text-xs text-muted-foreground mt-1.5">Supports standard DMS templates (.xlsx, .xls) up to 10MB.</p>
            </div>
          </div>
        )}
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-start gap-3 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Validation Error</p>
            <p className="mt-0.5 font-medium">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
