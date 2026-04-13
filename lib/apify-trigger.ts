'use server';

import { ApifyClient } from 'apify-client';
import { createClient } from '@/lib/supabase/server';

const apify = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

export async function triggerScrapeAction(handle?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let handles: string[];

  if (handle) {
    handles = [handle];
  } else {
    const { data: accounts, error } = await supabase
      .from('niche_accounts')
      .select('handle')
      .eq('user_id', user.id)
      .eq('is_tracked', true);

    if (error) throw error;
    if (!accounts || accounts.length === 0) return { success: false, message: 'No accounts tracked.' };

    handles = accounts.map(a => a.handle);
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://content-analytics-web.vercel.app';
  const webhookUrl = `${baseUrl}/api/webhook/apify`;

  const run = await apify.actor('apify/instagram-scraper').call({
    directUrls: handles.map(h => `https://www.instagram.com/${h}`),
    resultsType: 'posts',
    resultsLimit: 20,
    searchLimit: 1,
  }, {
    webhooks: [
      {
        eventTypes: ['ACTOR.RUN.SUCCEEDED'],
        requestUrl: webhookUrl,
        headersTemplate: `{"Authorization": "Bearer ${process.env.APIFY_WEBHOOK_SECRET || ''}", "Bypass-Tunnel-Reminder": "true", "User-Agent": "Apify"}`
      }
    ]
  });

  const label = handles.length === 1 ? `@${handles[0]}` : `${handles.length} accounts`;
  return { success: true, message: `Scrape started for ${label}. Run ID: ${run.id}` };
}
