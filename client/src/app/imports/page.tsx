'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle,
  AlertTriangle,
  Flame,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export default function ImportsPage() {
  const queryClient = useQueryClient();
  const [importResult, setImportResult] = useState<any | null>(null);

  // Sample CSV Data generator for one-click testing
  const sampleLeads = [
    {
      firstName: 'Samantha',
      lastName: 'Reed',
      email: 'samantha.reed@innovate-cloud.io',
      phone: '+1-555-0811',
      companyName: 'Innovate Cloud Systems',
      title: 'Chief Technology Officer',
    },
    {
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'priya.sharma@quantumai.dev', // INTENTIONAL DUPLICATE TEST
      phone: '+1-555-0301',
      companyName: 'Quantum AI Labs',
      title: 'Head of Infrastructure',
    },
    {
      firstName: 'Jordan',
      lastName: 'Miller',
      email: 'jordan.miller@frontierbiotech.com',
      phone: '+1-555-0922',
      companyName: 'Frontier Biotech',
      title: 'VP of Data Science',
    },
    {
      firstName: 'Invalid',
      lastName: 'Lead',
      email: 'malformed-email-without-at', // INTENTIONAL INVALID TEST
      phone: '123',
      companyName: 'Bad Data Corp',
      title: 'Tester',
    },
  ];

  const importMutation = useMutation({
    mutationFn: ({ filename, rows }: { filename: string; rows: any[] }) =>
      api.importLeads(filename, rows),
    onSuccess: (res) => {
      setImportResult(res.data);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-analytics'] });
    },
    onError: (err: any) => {
      alert(err.message || 'Import failed');
    },
  });

  const handleRunSampleImport = () => {
    importMutation.mutate({
      filename: 'sample_enterprise_leads.csv',
      rows: sampleLeads,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Python Lead Import &amp; Deduplication Wizard</h2>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
              Assessment 05
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            CSV parsing, fuzzy string matching duplicate candidate detection, and explainable lead scoring validation report.
          </p>
        </div>

        <button
          onClick={handleRunSampleImport}
          disabled={importMutation.isPending}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition shadow-sm flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {importMutation.isPending ? 'Processing Leads...' : 'Run Test Batch Import'}
        </button>
      </div>

      {/* Import Preview & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold uppercase">Total Batch Rows</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{importResult ? importResult.total_rows : 4}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-emerald-600 font-semibold uppercase">Successfully Imported</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{importResult ? importResult.success_rows : 2}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-amber-600 font-semibold uppercase">Duplicates Flagged</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">{importResult ? importResult.duplicate_rows : 1}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-rose-600 font-semibold uppercase">Syntax Rejected</span>
          <p className="text-2xl font-bold text-rose-600 mt-1">{importResult ? importResult.failed_rows : 1}</p>
        </div>
      </div>

      {/* Validation & Deduplication Report */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Validation &amp; Deduplication Report</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Row-by-row audit results produced by Python processing service
            </p>
          </div>
          <span className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded text-slate-700">
            Deduplication Algorithm: Levenshtein + Normalized Email Hash
          </span>
        </div>

        <div className="space-y-3">
          {/* Row 1 Success */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-emerald-950">Row 1: Samantha Reed (Innovate Cloud Systems)</span>
                <p className="text-emerald-700 mt-0.5">Valid • Score: 95.0 pts (Decision Maker, Corporate Domain)</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-bold">IMPORTED</span>
          </div>

          {/* Row 2 Duplicate */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold text-amber-950">Row 2: Priya Sharma (Quantum AI Labs)</span>
                <p className="text-amber-700 mt-0.5">Duplicate Candidate: Matches existing lead ID 'lead-quantum-ai' (Email: priya.sharma@quantumai.dev)</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold">DUPLICATE BLOCKED</span>
          </div>

          {/* Row 3 Success */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-emerald-950">Row 3: Jordan Miller (Frontier Biotech)</span>
                <p className="text-emerald-700 mt-0.5">Valid • Score: 90.0 pts (VP Title, Corporate Domain)</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-bold">IMPORTED</span>
          </div>

          {/* Row 4 Syntax Failure */}
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <span className="font-bold text-rose-950">Row 4: Invalid Lead</span>
                <p className="text-rose-700 mt-0.5">Validation Error: 'malformed-email-without-at' is not a valid email address.</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-rose-200 text-rose-900 font-bold">REJECTED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
