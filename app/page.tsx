import DashboardClient from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-200 font-sans selection:bg-emerald-500/30 overflow-hidden flex flex-col">
      {/* Top Navbar / Branding */}
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-lg font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
            Viral<span className="font-light">Intel</span>
          </span>
        </div>
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500 border border-white/5 px-3 py-1.5 rounded-full bg-white/5">
          Signal Beta
        </div>
      </nav>

      {/* Main Dashboard Layout */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Abstract Background Elements */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-900/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />

        {/* DashboardClient owns the shared refresh state between panels */}
        <DashboardClient />
      </main>

    </div>
  );
}

