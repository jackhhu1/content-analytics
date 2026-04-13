import { NextRequest, NextResponse } from 'next/server';

// Allowlist: only proxy from Instagram/Facebook CDN domains
const ALLOWED_HOSTS = ['fbcdn.net', 'instagram.com', 'cdninstagram.com'];

export async function GET(req: NextRequest) {
  const imageUrl = req.nextUrl.searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 });
  }

  // Security: reject non-Instagram CDN URLs
  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const allowed = ALLOWED_HOSTS.some(host => parsed.hostname === host || parsed.hostname.endsWith('.' + host));
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden host' }, { status: 403 });
  }

  try {
    // Fetch server-side — no Referer, no browser origin headers
    const upstream = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });

    if (!upstream.ok) {
      return new NextResponse(null, { status: upstream.status });
    }

    const buffer = await upstream.arrayBuffer();
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Cache aggressively on edge/browser — Instagram CDN URLs are valid for ~24h
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    console.error('[image-proxy] fetch error:', err);
    return new NextResponse(null, { status: 502 });
  }
}
