'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ExcelUploader from '@/components/import/ExcelUploader';
import ImportPreview from '@/components/import/ImportPreview';
import { importApi } from '@/lib/api';
import type { ImportValidationResult } from '@dms/shared';
import { 
  Download, 
  ArrowLeft, 
  FileSpreadsheet, 
  Info, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react';

export default function ImportPage() {
  const params = useParams();
  const router = useRouter();
  const dashboardId = params?.dashboardId as string;

  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [templateUrl, setTemplateUrl] = useState('');

  useEffect(() => {
    setTemplateUrl(importApi.templateUrl());
  }, []);

  const handleValidationSuccess = (result: ImportValidationResult, file: File) => {
    setValidationResult(result);
    setUploadedFile(file);
  };

  const handleReset = () => {
    setValidationResult(null);
    setUploadedFile(null);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full animate-fade-in">
      {/* Top Navigation Back */}
      <div className="flex items-center justify-between">
        <Link
          href={`/${dashboardId}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        
        {/* Template download */}
        <a
          href={templateUrl}
          download="DMS_Import_Template.xlsx"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors bg-primary/10 border border-primary/20 px-3.5 py-2 rounded-xl"
        >
          <Download className="w-3.5 h-3.5" />
          Download Excel Template
        </a>
      </div>

      {/* Header section */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          Spreadsheet Import Center
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Incremental insert and update. We map keys based on row indices and Req IDs.
        </p>
      </div>

      {/* Conditional layout: Uploader OR Preview */}
      {!validationResult ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Uploader Column */}
          <div className="lg:col-span-2">
            <ExcelUploader 
              dashboardId={dashboardId} 
              onValidationSuccess={handleValidationSuccess} 
            />
          </div>

          {/* Instructions Column */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
              <Info className="w-4 h-4" />
              Upload Instructions
            </div>

            <div className="space-y-3.5 text-xs text-muted-foreground leading-relaxed">
              <p>
                DMS uses an <strong>Incremental Upsert</strong> model. The sheet must strictly follow the schema structure.
              </p>
              
              <div className="space-y-2 border-l border-border/80 pl-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Requirements Sheet:</strong> Columns for Req ID, Title, Status, Progress, dates, and mandays effort.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Resource Capacity:</strong> Month, team name, and total capacity mandays.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Delivery Targets:</strong> Month, team name, target deliverables, and actual results.
                  </span>
                </div>
              </div>

              <div className="p-3 bg-secondary/50 border border-border rounded-xl text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  Requirements matching existing <strong>Req IDs</strong> will be updated. All other rows will be appended.
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <ImportPreview 
          dashboardId={dashboardId} 
          result={validationResult} 
          file={uploadedFile!} 
          onReset={handleReset} 
        />
      )}
    </div>
  );
}
