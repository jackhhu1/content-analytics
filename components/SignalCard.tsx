'use client';
import React, { useState } from 'react';

function formatNumber(num: number) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

/** Extract Instagram/Reel shortcode from a URL, e.g. https://instagram.com/p/ABC123 → ABC123 */
function extractShortcode(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
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
  medianVc,
}: SignalCardProps) {
  const [expanded, setExpanded] = useState(false);

  const rawMultiplier = medianVc > 0 ? viralCoefficient / medianVc : viralCoefficient;
  const multiplierText = rawMultiplier.toFixed(1);
  const isAlpha = rawMultiplier >= 5.0;

  const shortcode = extractShortcode(postUrl);
  const embedUrl = shortcode
    ? `https://www.instagram.com/p/${shortcode}/embed/`
    : null;
  const isMock = !shortcode;

  // Signal intensity for the glow — scale from green → amber → red
  const signalColor =
    rawMultiplier >= 10 ? 'from-red-400 to-orange-500' :
    rawMultiplier >= 5  ? 'from-amber-400 to-yellow-500' :
                          'from-emerald-400 to-teal-600';

  const glowColor =
    rawMultiplier >= 10 ? 'rgba(239,68,68,0.25)' :
    rawMultiplier >= 5  ? 'rgba(245,158,11,0.25)' :
                          'rgba(16,185,129,0.2)';

  return (
    <div
      className="group relative flex flex-col rounded-2xl overflow-hidden border border-white/10 bg-[#111] hover:border-white/20 transition-all duration-300"
      style={{ boxShadow: `0 0 30px ${glowColor}` }}
    >
      {/* ── Alpha Banner ── */}
      {isAlpha && (
        <div className="absolute top-0 inset-x-0 z-20 flex justify-center pointer-events-none">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black px-4 py-0.5 uppercase tracking-[0.2em] rounded-b-lg shadow-lg">
            ✨ Predicted Alpha
          </div>
        </div>
      )}

      {/* ── Signal Multiplier Pill (top-left) ── */}
      <div className="absolute top-3 left-3 z-20 pointer-events-none">
        <div
          className={`flex items-baseline gap-1 bg-black/70 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-white/10`}
        >
          <span className={`text-xl font-black text-transparent bg-clip-text bg-gradient-to-r ${signalColor}`}>
            {multiplierText}x
          </span>
          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Signal</span>
        </div>
      </div>

      {/* ── Embed Area ── */}
      {/* 9:16 aspect ratio container — classic Reel proportion */}
      <div className="relative w-full" style={{ paddingBottom: '177.78%' }}>
        {embedUrl ? (
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full border-0 bg-black"
            allowFullScreen
            loading="lazy"
            title={`Instagram post by @${handle}`}
            // Scroll inside reels embed can be noisy — keep hidden
            scrolling="no"
          />
        ) : (
          /* ── Mock / fallback placeholder ── */
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-black gap-5">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.4)]">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
            <p className="text-slate-400 text-sm font-medium text-center px-6">
              Preview unavailable — mock post
            </p>
            <a
              href={postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300 underline"
            >
              Open in Instagram ↗
            </a>
          </div>
        )}

        {/* ── Gradient overlay for the footer to read cleanly ── */}
        <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-black/90 to-transparent pointer-events-none z-10" />

        {/* ── Stats row floating over embed ── */}
        <div className="absolute bottom-0 inset-x-0 z-20 px-3.5 pb-3 flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-white font-bold text-sm drop-shadow-md">@{handle}</span>
            <span className="text-slate-300 text-[11px] font-medium">
              {formatNumber(followerCount)} followers
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-white font-bold text-base tabular-nums drop-shadow-md">
              {formatNumber(viewCount)}
            </span>
            <span className="text-slate-300 text-[9px] font-bold uppercase tracking-widest">Views</span>
          </div>
        </div>
      </div>

      {/* ── Caption + Actions footer ── */}
      <div className="flex flex-col gap-3 px-3.5 py-3 bg-black/80 backdrop-blur-sm">
        {/* Caption (collapsible) */}
        <div className="relative">
          <p
            onClick={() => setExpanded(!expanded)}
            className={`text-slate-300 text-[13px] leading-relaxed cursor-pointer transition-all ${
              expanded ? '' : 'line-clamp-2'
            }`}
          >
            {caption || 'No caption available.'}
          </p>
          {caption && caption.length > 100 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-slate-500 text-[11px] hover:text-slate-300 transition-colors mt-0.5"
            >
              {expanded ? 'less' : 'more'}
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-0.5">
          <a
            href={postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 text-black text-[13px] font-bold py-2 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            Open Reel
          </a>
          <button
            className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-[13px] font-semibold py-2 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            Playbook
          </button>
        </div>
      </div>
    </div>
  );
}
