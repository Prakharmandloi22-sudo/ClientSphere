'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Radio,
  Mail,
  Calendar,
  PhoneCall,
  CheckCircle,
  ShieldCheck,
  Send,
  Zap,
} from 'lucide-react';

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [meetingStatus, setMeetingStatus] = useState<string | null>(null);

  // Email form
  const [emailForm, setEmailForm] = useState({
    recipientEmail: 'alice.walker@acmecloud.com',
    subject: 'ClientSphere Enterprise Platform Overview & Security Docs',
    body: 'Hi Alice, please find attached the ClientSphere architecture and compliance documentation.',
  });

  // Calendar form
  const [calForm, setCalForm] = useState({
    title: 'ClientSphere Quarterly Solution Architecture Review',
    attendeeEmail: 'alice.walker@acmecloud.com',
    durationMinutes: 45,
  });

  const sendEmailMutation = useMutation({
    mutationFn: () =>
      api.sendSandboxEmail({
        ...emailForm,
        entityType: 'CONTACT',
        entityId: 'cont-alice-walker',
      }),
    onSuccess: (res: any) => {
      setEmailStatus(`Email dispatched via sandbox (Message ID: ${res.data?.messageId})`);
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: (err: any) => {
      setEmailStatus(`Failed: ${err.message}`);
    },
  });

  const scheduleMeetingMutation = useMutation({
    mutationFn: () =>
      api.scheduleSandboxMeeting({
        ...calForm,
        startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        entityType: 'CONTACT',
        entityId: 'cont-alice-walker',
      }),
    onSuccess: (res: any) => {
      setMeetingStatus(`Meeting booked! Virtual Meet URL: ${res.data?.meetUrl}`);
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: (err: any) => {
      setMeetingStatus(`Failed: ${err.message}`);
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">CRM External Integrations &amp; Sandboxes</h2>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
              Assessment 08
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Email &amp; calendar sandboxes, telephony signature-verified webhooks, and public lead capture with consent tracking.
          </p>
        </div>
      </div>

      {/* Integration Status Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { name: 'Email Sandbox Service', status: 'ONLINE', ping: '12ms', icon: Mail },
          { name: 'Calendar Scheduling API', status: 'ONLINE', ping: '15ms', icon: Calendar },
          { name: 'Telephony Webhook Gateway', status: 'ONLINE', ping: '8ms', icon: PhoneCall },
          { name: 'Lead Capture Endpoint', status: 'ONLINE', ping: '5ms', icon: Zap },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.name} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">{item.name}</span>
                <div className="p-1.5 bg-slate-50 text-slate-600 rounded">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {item.status}
                </span>
                <span className="font-mono text-slate-400">{item.ping}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sandboxes Interactive Testbench */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Sandbox */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Mail className="w-5 h-5 text-purple-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Email Sandbox Test Bench</h3>
              <p className="text-xs text-slate-500">Validates customer consent and dispatches test emails to CRM timeline</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Recipient Email</label>
              <input
                type="email"
                value={emailForm.recipientEmail}
                onChange={(e) => setEmailForm({ ...emailForm, recipientEmail: e.target.value })}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Subject</label>
              <input
                type="text"
                value={emailForm.subject}
                onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Message Body</label>
              <textarea
                rows={3}
                value={emailForm.body}
                onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800"
              />
            </div>

            <button
              onClick={() => sendEmailMutation.mutate()}
              disabled={sendEmailMutation.isPending}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {sendEmailMutation.isPending ? 'Sending...' : 'Send Sandbox Email'}
            </button>

            {emailStatus && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-900 font-mono">
                {emailStatus}
              </div>
            )}
          </div>
        </div>

        {/* Calendar Sandbox */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Calendar className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Calendar Sandbox Test Bench</h3>
              <p className="text-xs text-slate-500">Generates virtual meeting rooms and logs calendar events</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Meeting Title</label>
              <input
                type="text"
                value={calForm.title}
                onChange={(e) => setCalForm({ ...calForm, title: e.target.value })}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Attendee Email</label>
              <input
                type="email"
                value={calForm.attendeeEmail}
                onChange={(e) => setCalForm({ ...calForm, attendeeEmail: e.target.value })}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Duration (Minutes)</label>
              <input
                type="number"
                value={calForm.durationMinutes}
                onChange={(e) => setCalForm({ ...calForm, durationMinutes: Number(e.target.value) })}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800"
              />
            </div>

            <button
              onClick={() => scheduleMeetingMutation.mutate()}
              disabled={scheduleMeetingMutation.isPending}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              {scheduleMeetingMutation.isPending ? 'Scheduling...' : 'Schedule Sandbox Meeting'}
            </button>

            {meetingStatus && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-mono">
                {meetingStatus}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
