import Link from 'next/link';
import { getPlaybookPosts } from '@/lib/db-actions';
import PlaybookList from '@/components/PlaybookList';

export const dynamic = 'force-dynamic';

export default async function PlaybookPage() {
  const entries = await getPlaybookPosts();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-200 font-sans selection:bg-emerald-500/30 flex flex-col">
      {/* Navbar */}
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
        <Link
          href="/"
          className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Feed
        </Link>
      </nav>

      <div className="flex-1 px-4 py-12">
      <div className="max-w-4xl mx-auto space-y-8">

        <div className="flex flex-col space-y-3">
          <h1 className="text-3xl font-bold text-white tracking-tight">My Playbook</h1>
          <p className="text-slate-400">
            Study your saved signals and draft your unique twists before filming.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <PlaybookList initialEntries={entries} />
        </div>

      </div>
      </div>
    </div>
  );
}
