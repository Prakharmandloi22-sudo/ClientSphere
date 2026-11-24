'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Cpu,
  Zap,
  ShieldCheck,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  Clock,
  ArrowRight,
} from 'lucide-react';

export default function AutomationPage() {
  const { data: rulesData, refetch: refetchRules } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: () => api.getAutomationRules(),
  });

  const { data: executionsData, refetch: refetchExecs } = useQuery({
    queryKey: ['automation-executions'],
    queryFn: () => api.getAutomationExecutions(),
  });

  const rules = rulesData?.data || [];
  const executions = executionsData?.data || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Workflow Automation Engine</h2>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
              Assessment 07
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Event triggers, multi-condition evaluations, automated action dispatching, and recursive loop protection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              refetchRules();
              refetchExecs();
            }}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
            title="Refresh Automations"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Rules Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Active Automation Rules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((rule: any) => (
            <div
              key={rule.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{rule.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{rule.description}</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  ACTIVE
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1.5 font-mono">
                <div className="text-blue-600 font-semibold flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> Trigger: {rule.trigger_event}
                </div>
                <div className="text-slate-600">
                  Conditions: {JSON.stringify(rule.conditions)}
                </div>
                <div className="text-slate-800 font-medium">
                  Actions: {rule.actions?.map((a: any) => a.type).join(', ')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Safeguards Notice */}
      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-indigo-950">Infinite Automation Loop Protection Active</h4>
            <p className="text-indigo-700 mt-0.5">
              Rules executing in cascade are monitored via <span className="font-mono font-semibold">depth_level</span> tracking. Chains exceeding 5 recursive hops are automatically aborted with <span className="font-mono font-semibold">ABORTED_LOOP</span> state.
            </p>
          </div>
        </div>
      </div>

      {/* Execution History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-900">
          Execution History &amp; Auditable Action Log
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-3">Rule Name</th>
                <th className="px-5 py-3">Trigger Event</th>
                <th className="px-5 py-3">Entity</th>
                <th className="px-5 py-3">Depth</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {executions.map((exec: any) => (
                <tr key={exec.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-semibold text-slate-900">{exec.ruleName}</td>
                  <td className="px-5 py-3 font-mono text-blue-600">{exec.trigger_event}</td>
                  <td className="px-5 py-3 text-slate-600">{exec.entity_type} ({exec.entity_id?.substring(0, 8)}...)</td>
                  <td className="px-5 py-3 font-mono font-semibold">{exec.depth_level}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        exec.status === 'SUCCESS'
                          ? 'bg-emerald-100 text-emerald-800'
                          : exec.status === 'ABORTED_LOOP'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {exec.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500 font-mono">
                    {new Date(exec.executed_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
              {executions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-slate-400">
                    No automation executions recorded yet. Triggers fire automatically upon lead creation or deal updates.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
