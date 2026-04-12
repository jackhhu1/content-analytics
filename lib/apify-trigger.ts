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

export async function triggerScrapeAction(userId: string) {
  try {
    // 1. Fetch all accounts for this user
    const { data: accounts, error } = await supabase
      .from('niche_accounts')
      .select('handle')
      .eq('user_id', userId);

    if (error) throw error;
    if (!accounts || accounts.length === 0) return { success: false, message: 'No accounts tracked.' };

    const handles = accounts.map(a => a.handle);
    const startUrls = handles.map(handle => ({ url: `https://www.instagram.com/${handle}/` }));

    // Determine the host for the webhook callback
    // In dev, you might use ngrok. In production, use Vercel URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://content-analytics-web.vercel.app';
    const webhookUrls = [`${baseUrl}/api/webhook/apify`];

    // 2. Trigger Apify Actor (Instagram Scraper id: 'apify/instagram-scraper')
    // Configuration specifically optimized for metadata-only fast scraping
    const run = await apify.actor('apify/instagram-scraper').call({
      directUrls: handles.map(h => `https://www.instagram.com/${h}`),
      resultsType: 'posts',
      resultsLimit: 20,
      searchLimit: 1,
      // Pass the Webhook directly so Apify pings us when it finishes
    }, {
      webhooks: [
        {
          eventTypes: ['ACTOR.RUN.SUCCEEDED'],
          requestUrl: webhookUrls[0],
          // Inject Bypass-Tunnel-Reminder to bypass localtunnel anti-bot screen natively
          headersTemplate: `{"Authorization": "Bearer ${process.env.APIFY_WEBHOOK_SECRET || ''}", "Bypass-Tunnel-Reminder": "true", "User-Agent": "Apify"}`
        }
      ]
    });

    return { success: true, message: `Scrape started for ${handles.length} accounts. Run ID: ${run.id}` };
  } catch (error: any) {
    console.error('Failed to trigger Apify', error);
    return { success: false, message: error.message || 'Error triggering scrape.' };
  }
}
