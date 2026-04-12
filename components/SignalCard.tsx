import React from 'react';

// Format numbers like 1500000 -> 1.5M
function formatNumber(num: number) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

interface SignalCardProps {
  handle: string;
  postUrl: string;
  caption: string;
  viewCount: number;
  followerCount: number;
  viralCoefficient: number;
  medianVc: number;
}

export default function SignalCard({
  handle,
  postUrl,
  caption,
  viewCount,
  followerCount,
  viralCoefficient,
  medianVc
}: SignalCardProps) {
  
  const rawMultiplier = medianVc > 0 ? (viralCoefficient / medianVc) : viralCoefficient;
  const multiplierText = rawMultiplier.toFixed(1);
  const isAlpha = rawMultiplier > 5.0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all group flex flex-col relative">
      {/* Alpha Badge */}
      {isAlpha && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg shadow-lg z-10 uppercase tracking-widest">
          Predicted Alpha ✨
        </div>
      )}

      <div className="p-5 flex flex-col h-full space-y-5">
        
        {/* Core Signal - The Loudest Element */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-emerald-600 drop-shadow-sm">
              {multiplierText}x <span className="text-xl text-emerald-500/70 font-bold uppercase tracking-wide">Signal</span>
            </span>
            <span className="text-slate-500 text-sm mt-1 font-medium">vs Median Baseline</span>
          </div>
        </div>

        {/* Handle & Context (Small, secondary) */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-slate-300 font-semibold text-sm">
              @{handle}
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              {formatNumber(followerCount)} followers
            </p>
          </div>
          <div className="ml-auto flex flex-col items-end">
            <span className="text-slate-200 font-bold text-lg">{formatNumber(viewCount)}</span>
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Absolute Views</span>
          </div>
        </div>

        {/* Caption */}
        <div className="flex-1">
          <p className="text-slate-400 text-sm line-clamp-3 leading-relaxed italic border-l-2 border-slate-800 pl-3">
            "{caption || "No caption provided"}"
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          {/* Primary Action (Instagram) */}
          <a 
            href={postUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(79,70,229,0.3)]"
          >
            Watch Post
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>

          {/* Secondary Action (Playbook) */}
          <button 
            className="flex-1 text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Add to Playbook
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>
        
      </div>
    </div>
  );
}
