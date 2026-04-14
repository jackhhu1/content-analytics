'use client';
import React, { useState } from 'react';
import { saveToPlaybook, removeFromPlaybook } from '@/lib/db-actions';

function formatNumber(num: number) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

function extractShortcode(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

interface SignalCardProps {
  postId: string;
  handle: string;
  postUrl: string;
  caption: string;
  viewCount: number;
  followerCount: number;
  viralCoefficient: number;
  medianVc: number;
  thumbnailUrl: string | null;
  initiallySaved?: boolean;
}

export default function SignalCard({
  postId,
  handle,
  postUrl,
  caption,
  viewCount,
  followerCount,
  viralCoefficient,
  medianVc,
  thumbnailUrl,
  initiallySaved = false,
}: SignalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [saved, setSaved] = useState(initiallySaved);
  const [saving, setSaving] = useState(false);

  const handlePlaybook = async () => {
    if (saving) return;
    setSaving(true);
    const next = !saved;
    setSaved(next); // optimistic
    try {
      if (next) await saveToPlaybook(postId);
      else await removeFromPlaybook(postId);
    } catch (err) {
      console.error('[SignalCard] playbook toggle failed', err);
      setSaved(!next); // revert
    } finally {
      setSaving(false);
    }
  };

  const rawMultiplier = medianVc > 0 ? viralCoefficient / medianVc : viralCoefficient;
  const multiplierText = rawMultiplier.toFixed(1);
  const isAlpha = rawMultiplier >= 5.0;

  const shortcode = extractShortcode(postUrl);

  // Route through our server-side proxy to bypass Instagram CDN origin checks
  const proxiedThumbnail = thumbnailUrl
    ? `/api/image-proxy?url=${encodeURIComponent(thumbnailUrl)}`
    : null;

  // Signal colour — all green, intensity scales with multiplier
  const signalGradient =
    rawMultiplier >= 10 ? 'from-emerald-200 to-green-300' :
    rawMultiplier >= 5  ? 'from-emerald-300 to-teal-300'  :
                          'from-emerald-400 to-teal-500';

  const glowColor =
    rawMultiplier >= 10 ? 'rgba(52,211,153,0.35)' :
    rawMultiplier >= 5  ? 'rgba(16,185,129,0.22)'  :
                          'rgba(20,184,166,0.12)';

  const showThumbnail = proxiedThumbnail && !imgError;

  return (
    <div
      className="group relative flex flex-col rounded-2xl overflow-hidden border border-white/10 bg-[#111] hover:border-white/20 transition-all duration-300"
      style={{ boxShadow: `0 0 28px ${glowColor}` }}
    >
      {/* ── Visual area — 9:16 portrait ── */}
      <div className="relative w-full bg-black" style={{ aspectRatio: '9/16' }}>

        {showThumbnail ? (
          /* Clean thumbnail — no iframe, no Instagram chrome */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proxiedThumbnail!}
            alt={`Post by @${handle}`}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          /* Fallback: dark gradient with Instagram-style gradient ring */
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-900 to-black gap-4">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}
            >
              <div className="w-[74px] h-[74px] rounded-full bg-slate-900 flex items-center justify-center">
                {/* Play icon */}
                <svg className="w-9 h-9 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            <p className="text-slate-500 text-sm font-medium">@{handle}</p>
            {shortcode && (
              <a
                href={postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Open in Instagram ↗
              </a>
            )}
          </div>
        )}

        {/* Bottom gradient for legibility */}
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />

        {/* Signal multiplier — top left */}
        <div className="absolute top-3 left-3 pointer-events-none">
          <div className="flex items-baseline gap-1 bg-black/70 backdrop-blur-md rounded-lg px-2.5 py-1.5 border border-white/10">
            <span className={`text-xl font-black text-transparent bg-clip-text bg-gradient-to-r ${signalGradient}`}>
              {multiplierText}x
            </span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Signal</span>
          </div>
        </div>

        {/* Alpha badge — top right */}
        {isAlpha && (
          <div className="absolute top-3 right-3 pointer-events-none">
            <div className="flex items-center gap-1 bg-emerald-950/90 backdrop-blur-md border border-emerald-500/40 text-emerald-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Alpha
            </div>
          </div>
        )}

        {/* Stats overlay — bottom */}
        <div className="absolute bottom-0 inset-x-0 px-3.5 pb-3 flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-white font-bold text-sm drop-shadow-lg">@{handle}</span>
            {followerCount > 0 && (
              <span className="text-slate-300 text-[11px]">{formatNumber(followerCount)} followers</span>
            )}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-white font-bold text-lg tabular-nums leading-none">{formatNumber(viewCount)}</span>
            <span className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Views</span>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex flex-col gap-3 px-3.5 py-3 bg-[#0d0d0d]">

        {/* Caption */}
        <div>
          <p
            className={`text-slate-300 text-[13px] leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}
          >
            {caption || 'No caption.'}
          </p>
          {caption && caption.length > 80 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-slate-500 hover:text-slate-300 text-[11px] transition-colors mt-0.5"
            >
              {expanded ? 'less' : 'more'}
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <a
            href={postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 text-black text-[13px] font-bold py-2 rounded-lg transition-colors"
          >
            {/* Instagram logo */}
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            Open Reel
          </a>
          <button
            onClick={handlePlaybook}
            disabled={saving}
            className={`flex-1 flex items-center justify-center gap-1.5 border text-[13px] font-semibold py-2 rounded-lg transition-colors disabled:opacity-60 ${
              saved
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
            }`}
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill={saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {saved ? 'Saved' : 'Playbook'}
          </button>
        </div>
      </div>
    </div>
  );
}
