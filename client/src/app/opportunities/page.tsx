'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Briefcase,
  Users2,
  DollarSign,
  Calendar,
  Building,
  Plus,
  ShieldCheck,
  Percent,
} from 'lucide-react';

export default function OpportunitiesPage() {
  const queryClient = useQueryClient();
  const [selectedOpp, setSelectedOpp] = useState<any | null>(null);
  const [newMemberUserId, setNewMemberUserId] = useState('user-rep-2');
  const [newMemberRole, setNewMemberRole] = useState('COLLABORATOR');
  const [newMemberSplit, setNewMemberSplit] = useState(25);

  const { data: oppsData, isLoading } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => api.getOpportunities(),
  });

  const opps = oppsData?.data || [];

  const addTeamMutation = useMutation({
    mutationFn: ({ oppId, payload }: { oppId: string; payload: any }) =>
      api.addOppTeamMember(oppId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      alert('Team member added to deal collaboration team!');
      setSelectedOpp(null);
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to add team member');
    },
  });

  const handleAddTeamMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpp) return;
    addTeamMutation.mutate({
      oppId: selectedOpp.id,
      payload: {
        userId: newMemberUserId,
        role: newMemberRole,
        accessLevel: 'WRITE',
        splitPercentage: Number(newMemberSplit),
      },
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Opportunities &amp; Collaboration Teams</h2>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
              Capstone Collaboration Model
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Multiple sales representatives collaborating on enterprise deals with commission split percentages and role-based permissions.
          </p>
        </div>
      </div>

      {/* Opportunities List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-3.5">Opportunity</th>
                <th className="px-5 py-3.5">Company &amp; Contact</th>
                <th className="px-5 py-3.5">Deal Value</th>
                <th className="px-5 py-3.5">Stage</th>
                <th className="px-5 py-3.5">Deal Owner</th>
                <th className="px-5 py-3.5 text-right">Team Collaboration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {opps.map((opp: any) => (
                <tr key={opp.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-5 py-4 font-semibold text-slate-900">
                    {opp.name}
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      v{opp.version} • Close: {opp.close_date ? opp.close_date.split('T')[0] : 'TBD'}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-slate-800">{opp.companyName || 'Unassigned'}</div>
                    <div className="text-xs text-slate-500">{opp.contactName || 'No contact'}</div>
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-900 font-mono">
                    ${Number(opp.amount).toLocaleString()}
                    <div className="text-[11px] font-normal text-emerald-600">
                      P: {Math.round((opp.probability || 0.2) * 100)}%
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold">
                      {opp.stageName}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs font-medium text-slate-700">
                    {opp.ownerName}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => setSelectedOpp(opp)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md text-xs font-semibold transition inline-flex items-center gap-1.5"
                    >
                      <Users2 className="w-3.5 h-3.5" /> Manage Team
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Opportunity Team Collaboration Modal */}
      {selectedOpp && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div>
              <h3 className="font-bold text-lg text-slate-900">Deal Collaboration Team</h3>
              <p className="text-xs text-slate-500 mt-1">
                Add sales reps to <span className="font-semibold text-slate-800">{selectedOpp.name}</span> with assigned revenue split percentages.
              </p>
            </div>

            <form onSubmit={handleAddTeamMember} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Select Sales Representative</label>
                <select
                  value={newMemberUserId}
                  onChange={(e) => setNewMemberUserId(e.target.value)}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800"
                >
                  <option value="user-rep-1">Elena Rostova (Senior Rep)</option>
                  <option value="user-rep-2">David Kim (Solutions Specialist)</option>
                  <option value="user-manager-1">Marcus Vance (Sales Director)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Collaboration Role</label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800"
                >
                  <option value="COLLABORATOR">Collaborator (Co-Seller)</option>
                  <option value="SPECIALIST">Technical Solutions Specialist</option>
                  <option value="VIEWER">Viewer / Advisory</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Commission Split Percentage (%)</label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newMemberSplit}
                    onChange={(e) => setNewMemberSplit(Number(e.target.value))}
                    className="w-full p-2 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800"
                  />
                  <Percent className="w-4 h-4 absolute right-2.5 top-2.5 text-slate-400" />
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Enforced Team Visibility:
                </span>
                <p>Team members gain WRITE access to this record and can collaborate across company networks.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOpp(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={addTeamMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition"
                >
                  {addTeamMutation.isPending ? 'Adding...' : 'Add Collaborator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
