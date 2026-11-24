'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  History,
  PhoneCall,
  Mail,
  Calendar,
  CheckSquare,
  FileText,
  Plus,
  RefreshCw,
  Clock,
} from 'lucide-react';

export default function ActivitiesPage() {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState('');
  const [showLogModal, setShowLogModal] = useState(false);
  const [formData, setFormData] = useState({
    activityType: 'CALL',
    subject: '',
    description: '',
    entityType: 'LEAD',
    entityId: 'lead-quantum-ai',
    status: 'COMPLETED',
  });

  const { data: activitiesData, isLoading, refetch } = useQuery({
    queryKey: ['activities', filterType],
    queryFn: () => api.getActivities({ activityType: filterType }),
  });

  const activities = activitiesData?.data || [];

  const createActivityMutation = useMutation({
    mutationFn: (payload: any) => api.createActivity(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setShowLogModal(false);
      setFormData({
        activityType: 'CALL',
        subject: '',
        description: '',
        entityType: 'LEAD',
        entityId: 'lead-quantum-ai',
        status: 'COMPLETED',
      });
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to log activity');
    },
  });

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createActivityMutation.mutate(formData);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'CALL':
        return <PhoneCall className="w-4 h-4 text-blue-600" />;
      case 'EMAIL':
        return <Mail className="w-4 h-4 text-purple-600" />;
      case 'MEETING':
        return <Calendar className="w-4 h-4 text-amber-600" />;
      case 'TASK':
        return <CheckSquare className="w-4 h-4 text-emerald-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">CRM Activity Timeline</h2>
          <p className="text-xs text-slate-500 mt-1">
            Complete audit trail of sales calls, meetings, sandbox emails, and automated tasks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
            title="Refresh Timeline"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowLogModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Log Activity
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-semibold">
        {['', 'CALL', 'EMAIL', 'MEETING', 'TASK'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterType === type
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {type === '' ? 'All Activities' : `${type}s`}
          </button>
        ))}
      </div>

      {/* Timeline List */}
      <div className="space-y-3">
        {activities.map((act: any) => (
          <div
            key={act.id}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4 hover:shadow-md transition"
          >
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 shrink-0 mt-0.5">
              {getIcon(act.activity_type)}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-900">{act.subject}</span>
                <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(act.created_at).toLocaleString()}
                </span>
              </div>

              {act.description && (
                <p className="text-xs text-slate-600 whitespace-pre-line">{act.description}</p>
              )}

              <div className="pt-2 flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                <span>By: <span className="text-slate-800">{act.performedByName || 'Elena Rostova'}</span></span>
                <span>•</span>
                <span>Target: <span className="font-mono text-slate-800">{act.entity_type}</span></span>
                <span>•</span>
                <span
                  className={`px-2 py-0.2 rounded font-semibold text-[10px] ${
                    act.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {act.status}
                </span>
              </div>
            </div>
          </div>
        ))}

        {activities.length === 0 && (
          <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
            No activities logged yet.
          </div>
        )}
      </div>

      {/* Log Activity Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div>
              <h3 className="font-bold text-lg text-slate-900">Log Customer Activity</h3>
              <p className="text-xs text-slate-500 mt-1">Record a phone call, meeting note, or customer interaction.</p>
            </div>

            <form onSubmit={handleLogSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Activity Type</label>
                <select
                  value={formData.activityType}
                  onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800"
                >
                  <option value="CALL">Phone Call</option>
                  <option value="MEETING">Meeting</option>
                  <option value="NOTE">Internal Note</option>
                  <option value="TASK">Task</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Solution Demo and Architecture Review"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Description / Notes</label>
                <textarea
                  rows={3}
                  placeholder="Enter meeting notes, action items, or customer response..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createActivityMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition"
                >
                  {createActivityMutation.isPending ? 'Logging...' : 'Save Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
