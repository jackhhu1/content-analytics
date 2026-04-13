import { getPlaybookPosts } from '@/lib/db-actions';
import PlaybookList from '@/components/PlaybookList';

export const dynamic = 'force-dynamic';

export default async function PlaybookPage() {
  const entries = await getPlaybookPosts();

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-12 font-sans selection:bg-emerald-500/30">
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
  );
}
