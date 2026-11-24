'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Contact2,
  Building2,
  Mail,
  Phone,
  Plus,
  Search,
  Link as LinkIcon,
  CheckCircle,
  Briefcase,
} from 'lucide-react';

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [linkingContact, setLinkingContact] = useState<any | null>(null);
  const [linkData, setLinkData] = useState({
    companyId: '',
    roleTitle: '',
    isPrimary: false,
  });

  const { data: contactsData, isLoading } = useQuery({
    queryKey: ['contacts', search],
    queryFn: () => api.getContacts({ q: search }),
  });

  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.getCompanies(),
  });

  const contacts = contactsData?.data || [];
  const companies = companiesData?.data || [];

  const linkMutation = useMutation({
    mutationFn: ({ contactId, payload }: { contactId: string; payload: any }) =>
      api.linkContactCompany(contactId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setLinkingContact(null);
      setLinkData({ companyId: '', roleTitle: '', isPrimary: false });
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to link company to contact');
    },
  });

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingContact || !linkData.companyId) return;
    linkMutation.mutate({
      contactId: linkingContact.id,
      payload: linkData,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Contacts &amp; Multi-Company Network</h2>
            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-xs font-semibold border border-purple-200">
              Many-to-Many Architecture
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Domain-Specific Capstone: Contacts can serve across multiple enterprise organizations with distinct titles and primary assignments.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Search contacts by name, email, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contacts.map((contact: any) => (
          <div
            key={contact.id}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {contact.first_name} {contact.last_name}
                </h3>
                <p className="text-xs text-slate-500 font-medium">{contact.title || 'Executive Contact'}</p>
              </div>
              <button
                onClick={() => {
                  setLinkingContact(contact);
                  setLinkData({
                    companyId: companies[0]?.id || '',
                    roleTitle: 'Consultant / Advisory',
                    isPrimary: false,
                  });
                }}
                className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-md text-xs font-semibold text-slate-600 transition flex items-center gap-1"
              >
                <LinkIcon className="w-3.5 h-3.5" /> Associate Company
              </button>
            </div>

            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{contact.email}</span>
              </div>
              {contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{contact.phone}</span>
                </div>
              )}
            </div>

            {/* Many-to-Many Associated Companies */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Associated Organizations ({contact.companies?.length || 0})
              </span>
              <div className="flex flex-wrap gap-2">
                {contact.companies?.map((rel: any) => (
                  <div
                    key={rel.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                  >
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-medium text-slate-800">{rel.companyName}</span>
                    <span className="text-slate-400">({rel.roleTitle || 'Member'})</span>
                    {rel.isPrimary && (
                      <span className="px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                        PRIMARY
                      </span>
                    )}
                  </div>
                ))}
                {(!contact.companies || contact.companies.length === 0) && (
                  <span className="text-xs text-slate-400 italic">No companies currently associated</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Link Company Modal */}
      {linkingContact && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div>
              <h3 className="font-bold text-lg text-slate-900">Associate Contact with Company</h3>
              <p className="text-xs text-slate-500 mt-1">
                Link <span className="font-semibold text-slate-800">{linkingContact.first_name} {linkingContact.last_name}</span> to an additional company entity.
              </p>
            </div>

            <form onSubmit={handleLinkSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Select Company *</label>
                <select
                  required
                  value={linkData.companyId}
                  onChange={(e) => setLinkData({ ...linkData, companyId: e.target.value })}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800"
                >
                  <option value="">-- Choose Company --</option>
                  {companies.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.domain || 'no domain'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Role / Title at this Company</label>
                <input
                  type="text"
                  required
                  value={linkData.roleTitle}
                  onChange={(e) => setLinkData({ ...linkData, roleTitle: e.target.value })}
                  placeholder="e.g. Advisory CTO / Board Member"
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="primaryCheck"
                  checked={linkData.isPrimary}
                  onChange={(e) => setLinkData({ ...linkData, isPrimary: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="primaryCheck" className="text-xs text-slate-700 font-medium">
                  Set as primary company affiliation for this contact
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setLinkingContact(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={linkMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition"
                >
                  {linkMutation.isPending ? 'Linking...' : 'Save Association'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
