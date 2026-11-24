import './globals.css';
import type { Metadata } from 'next';
import Providers from './providers';
import Link from 'next/link';
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  Contact2,
  Building2,
  Briefcase,
  History,
  FileSpreadsheet,
  Cpu,
  Radio,
  ShieldCheck,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'ClientSphere | Enterprise CRM & Sales Automation',
  description: 'Enterprise CRM, Sales Pipeline & Workflow Automation Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = [
    { label: 'Executive Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Pipeline Kanban', href: '/pipeline', icon: KanbanSquare },
    { label: 'Leads & Scoring', href: '/leads', icon: Users },
    { label: 'Contacts (Multi-Org)', href: '/contacts', icon: Contact2 },
    { label: 'Companies', href: '/companies', icon: Building2 },
    { label: 'Opportunities & Teams', href: '/opportunities', icon: Briefcase },
    { label: 'Activity Timeline', href: '/activities', icon: History },
    { label: 'CSV Import Wizard', href: '/imports', icon: FileSpreadsheet },
    { label: 'Automation Engine', href: '/automation', icon: Cpu },
    { label: 'Integrations & Webhooks', href: '/integrations', icon: Radio },
  ];

  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden bg-slate-50 text-slate-800">
        <Providers>
          {/* Sidebar */}
          <aside className="w-64 flex flex-col bg-slate-900 text-slate-200 border-r border-slate-800">
            <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
              <div className="h-9 w-9 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/30">
                CS
              </div>
              <div>
                <h1 className="font-bold text-base text-white tracking-tight">ClientSphere</h1>
                <p className="text-xs text-blue-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Enterprise CRM
                </p>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>Active Role</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px]">ADMIN / REP</span>
              </div>
              <p className="text-slate-300 font-semibold truncate">admin@clientsphere.internal</p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>PostgreSQL & Redis Online</span>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Top Navigation */}
            <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center space-x-4">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  ClientSphere Global Tech Inc.
                </span>
                <span className="text-xs text-slate-400">|</span>
                <span className="text-xs text-slate-500 font-medium">Assessment Standard: Enterprise Grade v1.0</span>
              </div>

              <div className="flex items-center space-x-3 text-xs">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
                  <span className="font-semibold text-slate-900">REST API:</span>
                  <span className="text-emerald-600 font-mono font-medium">http://localhost:5000</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
                  <span className="font-semibold text-slate-900">Python Intelligence:</span>
                  <span className="text-blue-600 font-mono font-medium">http://localhost:8000</span>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              {children}
            </div>
          </main>
        </Providers>
      </body>
    </html>
  );
}
