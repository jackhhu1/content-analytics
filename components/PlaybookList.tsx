'use client';
import { useState } from 'react';
import PlaybookCard from '@/components/PlaybookCard';

export default function PlaybookList({ initialEntries }: { initialEntries: any[] }) {
  const [entries, setEntries] = useState(initialEntries);

  if (entries.length === 0) {
    return (
      <div className="col-span-full border border-dashed border-white/10 rounded-xl p-12 text-center flex flex-col items-center justify-center">
        <svg className="w-12 h-12 text-slate-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
        <h3 className="text-slate-300 font-medium text-lg">Your playbook is empty</h3>
        <p className="text-slate-500 mt-2 max-w-sm">
          Save a signal from your feed to start building your content playbook.
        </p>
        <a href="/" className="mt-4 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
          Go to feed →
        </a>
      </div>
    );
  }

  return (
    <>
      {entries.map((entry) => {
        const post = entry.posts;
        return (
          <PlaybookCard
            key={entry.id}
            playbookId={entry.id}
            postId={post?.id}
            handle={post?.niche_accounts?.handle || 'unknown'}
            postUrl={post?.post_url || '#'}
            caption={post?.caption || ''}
            viewCount={post?.view_count || 0}
            initialHookDraft={entry.hook_draft || ''}
            onRemoved={(id) => setEntries((prev) => prev.filter((e) => e.id !== id))}
          />
        );
      })}
    </>
  );
}
