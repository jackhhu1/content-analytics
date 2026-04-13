'use server';

import { createClient } from '@supabase/supabase-js';
import { ApifyClient } from 'apify-client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const apify = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

export async function triggerScrapeAction(userId: string, handle?: string) {
  try {
    let handles: string[];

    if (handle) {
      // Single-account mode: scrape only the provided handle
      handles = [handle];
    } else {
      // All-accounts mode: fetch every tracked account for this user
      const { data: accounts, error } = await supabase
        .from('niche_accounts')
        .select('handle')
        .eq('user_id', userId)
        .eq('is_tracked', true);

      if (error) throw error;
      if (!accounts || accounts.length === 0) return { success: false, message: 'No accounts tracked.' };

      handles = accounts.map(a => a.handle);
    }

    // Determine the host for the webhook callback
    // In dev, use ngrok. In production, use Vercel URL.
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
  } catch (error: any) {
    console.error('Failed to trigger Apify', error);
    return { success: false, message: error.message || 'Error triggering scrape.' };
  }
}
