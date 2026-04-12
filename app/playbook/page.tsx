import PlaybookCard from '@/components/PlaybookCard';

export const dynamic = 'force-dynamic';

export default function PlaybookPage() {
  
  // Hardcoded mock data to instantly visualize the playbook functionality
  const mockSavedPosts = [
    {
      id: 'p1',
      post_url: 'https://instagram.com/p/mock_ohnohanajo_viral1',
      caption: 'This AI pattern changed my whole workflow 🤯 wait for the end...',
      view_count: 85000,
      handle: 'ohnohanajo',
      hook_draft: ''
    },
    {
      id: 'p2',
      post_url: 'https://instagram.com/p/mock_annataha_viral2',
      caption: 'Stop overthinking your hooks. Do THIS instead 👇',
      view_count: 320000,
      handle: 'annataha',
      hook_draft: 'Stop overcomplicating your sales funnels. Do THIS 3-step automation instead 👇'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-12 font-sans selection:bg-emerald-500/30">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col space-y-3">
          <h1 className="text-3xl font-bold text-white tracking-tight">My Playbook</h1>
          <p className="text-slate-400">
            Study your saved signals and draft your unique twists before filming.
          </p>
        </div>

        {/* List */}
        <div className="flex flex-col gap-6">
          {mockSavedPosts.length === 0 ? (
            <div className="col-span-full border border-dashed border-white/10 rounded-xl p-12 text-center flex flex-col items-center justify-center">
               <svg className="w-12 h-12 text-slate-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <h3 className="text-slate-300 font-medium text-lg">No saved signals yet</h3>
              <p className="text-slate-500 mt-2 max-w-sm">
                Head to your feed and save high-performing outliers to start building your playbook.
              </p>
            </div>
          ) : (
            mockSavedPosts.map((post) => (
              <PlaybookCard
                key={post.id}
                handle={post.handle}
                postUrl={post.post_url}
                caption={post.caption}
                viewCount={post.view_count}
                initialHookDraft={post.hook_draft}
              />
            ))
          )}
        </div>

      </div>
    </div>
  );
}
