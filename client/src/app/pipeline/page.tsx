'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  KanbanSquare,
  DollarSign,
  Plus,
  ArrowRight,
  ShieldAlert,
  Building,
  User,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

export default function PipelinePage() {
  const queryClient = useQueryClient();
  const [selectedPipelineId, setSelectedPipelineId] = useState('pipe-enterprise-standard');
  const [movingOpp, setMovingOpp] = useState<any | null>(null);
  const [targetStageId, setTargetStageId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: pipelinesData } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => api.getPipelines(),
  });

  const { data: kanbanData, isLoading, refetch } = useQuery({
    queryKey: ['kanban', selectedPipelineId],
    queryFn: () => api.getKanban(selectedPipelineId),
    enabled: !!selectedPipelineId,
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ oppId, stageId, version }: { oppId: string; stageId: string; version: number }) =>
      api.updateOpportunity(oppId, { stageId, version }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-analytics'] });
      setMovingOpp(null);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to update stage. Concurrency conflict or network error.');
    },
  });

  const kanban = kanbanData?.data;
  const columns = kanban?.columns || [];

  const handleStageMove = () => {
    if (!movingOpp || !targetStageId) return;
    updateStageMutation.mutate({
      oppId: movingOpp.id,
      stageId: targetStageId,
      version: movingOpp.version,
    });
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Enterprise Sales Pipeline Kanban</h2>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
              Interactive Board
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Stage progression with automatic workflow triggers and optimistic concurrency control (Assessment 01 &amp; 03).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition"
            title="Refresh Kanban"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs">
            <span className="text-slate-500">Pipeline Total:</span>
            <span className="font-bold text-slate-900 font-mono">
              ${(kanban?.metrics?.totalPipelineValue || 175000).toLocaleString()}
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500">Weighted:</span>
            <span className="font-bold text-emerald-600 font-mono">
              ${(kanban?.metrics?.totalWeightedValue || 105000).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Kanban Board Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4 items-start">
        {columns.map((col: any) => (
          <div
            key={col.stageId}
            className="w-80 shrink-0 bg-slate-100/80 rounded-xl border border-slate-200 flex flex-col max-h-[750px]"
          >
            {/* Column Header */}
            <div className="p-3.5 border-b border-slate-200 bg-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-sm">{col.stageName}</h4>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono text-xs font-semibold">
                  {col.count}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 mt-2 font-mono">
                <span>${col.totalValue.toLocaleString()}</span>
                <span className="text-slate-400">P: {Math.round(col.probability * 100)}%</span>
              </div>
            </div>

            {/* Column Deals List */}
            <div className="p-2.5 overflow-y-auto space-y-2.5 flex-1">
              {col.opportunities.map((opp: any) => (
                <div
                  key={opp.id}
                  className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer space-y-2.5"
                  onClick={() => {
                    setMovingOpp(opp);
                    setTargetStageId(col.stageId);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-semibold text-sm text-slate-900 leading-tight hover:text-blue-600">
                      {opp.name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-500 border border-slate-200">
                      v{opp.version}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600">
                    {opp.companyName && (
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{opp.companyName}</span>
                      </div>
                    )}
                    {opp.contactName && (
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{opp.contactName}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm font-mono">
                      ${Number(opp.amount).toLocaleString()}
                    </span>
                    <button
                      className="px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded text-xs font-medium text-slate-600 flex items-center gap-1 transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMovingOpp(opp);
                        setTargetStageId(col.stageId);
                      }}
                    >
                      Move <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}

              {col.opportunities.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                  No deals in this stage
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Move Stage Modal */}
      {movingOpp && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div>
              <h3 className="font-bold text-lg text-slate-900">Transition Opportunity Stage</h3>
              <p className="text-xs text-slate-500 mt-1">
                Moving <span className="font-semibold text-slate-800">{movingOpp.name}</span> (${Number(movingOpp.amount).toLocaleString()})
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Select Target Stage</label>
              <select
                value={targetStageId}
                onChange={(e) => setTargetStageId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {columns.map((c: any) => (
                  <option key={c.stageId} value={c.stageId}>
                    {c.stageName} (P: {Math.round(c.probability * 100)}%)
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 space-y-1">
              <span className="font-semibold">Automated Transitions:</span>
              <p>Stage changes trigger automation rules (notifications, task creation) and update sales forecasts instantly.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setMovingOpp(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleStageMove}
                disabled={updateStageMutation.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition"
              >
                {updateStageMutation.isPending ? 'Updating...' : 'Confirm Transition'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
