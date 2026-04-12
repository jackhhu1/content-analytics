'use client';
import React, { useState } from 'react';

// Format numbers like 1500000 -> 1.5M
function formatNumber(num: number) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

interface PlaybookCardProps {
  handle: string;
  postUrl: string;
  caption: string;
  viewCount: number;
  initialHookDraft?: string;
  onSaveHook?: (newDraft: string) => void;
}

export default function PlaybookCard({
  handle,
  postUrl,
  caption,
  viewCount,
  initialHookDraft = '',
  onSaveHook
}: PlaybookCardProps) {
  const [hookDraft, setHookDraft] = useState(initialHookDraft);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (onSaveHook) onSaveHook(hookDraft);
    // Visual feedback
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden shadow-xl backdrop-blur-md">
      <div className="grid md:grid-cols-2">
        {/* Left Side: Post Details */}
        <div className="p-5 border-b md:border-b-0 md:border-r border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-slate-200 font-semibold">@{handle}</h3>
              <span className="text-emerald-400 font-bold text-sm bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                Saved Signal
              </span>
            </div>
            <p className="text-slate-300 font-light text-sm italic mb-4 line-clamp-4 border-l-2 border-white/20 pl-3">
              "{caption}"
            </p>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-slate-100 font-bold">{formatNumber(viewCount)}</span>
              <span className="text-slate-500 text-xs uppercase font-medium">Views</span>
            </div>
            <a 
              href={postUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs font-semibold text-black bg-white hover:bg-slate-200 border border-white/10 px-3 py-1.5 rounded transition-colors"
            >
              Analyze on IG ↗
            </a>
          </div>
        </div>

        {/* Right Side: My Twist Editor */}
        <div className="p-5 flex flex-col bg-black/40">
          <label className="text-slate-300 font-semibold mb-2 block text-sm flex items-center justify-between">
            <span>My Twist (Hook Draft)</span>
            {saved && <span className="text-emerald-400 text-xs animate-pulse">Saved ✓</span>}
          </label>
          <textarea 
            value={hookDraft}
            onChange={(e) => setHookDraft(e.target.value)}
            placeholder="Write your version of the hook here..."
            className="w-full bg-black/50 text-slate-200 border border-white/10 rounded-lg p-3 text-sm flex-1 min-h-[120px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow resize-none"
          />
          <div className="mt-3 flex justify-end">
            <button 
              onClick={handleSave}
              className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-5 py-2 rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
            >
              {saved ? "Saved!" : "Save Draft"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
