import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { calculateVC } from '../lib/metrics';

// Load env vars
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MOCK_USER_ID = '00000000-0000-0000-0000-000000000000'; // Replace with a real user ID in your DB

async function seed() {
  console.log('Seeding mock data for Phase 2...');

  // 1. Create Mock User temporarily (if your schema allows inserting directly into auth.users without going through GoTrue, 
  // though usually you seed a valid user ID from the UI. We'll bypass constraints or use a known user id).
  // For this script, ensure you have a valid user_id in your Supabase Auth or disable RLS temporarily if it fails.
  // We'll proceed assuming MOCK_USER_ID exists or the user will replace it.
  
  const accountsToSeed = [
    { handle: 'ohnohanajo', followers: 15400 },
    { handle: 'annataha', followers: 32000 }
  ];

  for (const acc of accountsToSeed) {
    console.log(`\nProcessing account: ${acc.handle}`);
    
    // Insert Account
    const { data: account, error: accErr } = await supabase
      .from('niche_accounts')
      .upsert({
        user_id: MOCK_USER_ID,
        handle: acc.handle,
        current_follower_count: acc.followers,
        last_scraped_at: new Date().toISOString()
      }, { onConflict: 'handle', ignoreDuplicates: false }) // ensure handle is uniquely addressable or just insert
      .select('id')
      .single();

    if (accErr || !account) {
      console.error(`Error inserting account ${acc.handle}:`, accErr);
      continue;
    }

    const accountId = account.id;
    const posts = [];

    // Generate 8 Baseline Posts
    for (let i = 0; i < 8; i++) {
        const views = Math.floor(acc.followers * (Math.random() * 0.4 + 0.1)); // 10% to 50% of followers
        const vc = calculateVC(views, acc.followers);
        posts.push({
            account_id: accountId,
            user_id: MOCK_USER_ID,
            post_url: `https://instagram.com/p/baseline_${acc.handle}_${i}`,
            caption: `Standard day in the life loop part ${i}`,
            view_count: views,
            follower_count_at_scrape: acc.followers,
            viral_coefficient: vc,
            is_outlier: false,
            scraped_at: new Date(Date.now() - (10 - i) * 86400000).toISOString() // Past 10 days
        });
    }

    // Generate 2 Outliers
    for (let i = 0; i < 2; i++) {
        const views = Math.floor(acc.followers * (Math.random() * 2 + 2.5)); // 250% to 450% of followers
        const vc = calculateVC(views, acc.followers);
        posts.push({
            account_id: accountId,
            user_id: MOCK_USER_ID,
            post_url: `https://instagram.com/p/viral_${acc.handle}_${i}`,
            caption: `Wait for the end... you won't believe it 🤯`,
            view_count: views,
            follower_count_at_scrape: acc.followers,
            viral_coefficient: vc,
            is_outlier: true,
            scraped_at: new Date(Date.now() - i * 86400000).toISOString()
        });
    }

    // Insert Posts
    const { error: postErr } = await supabase
        .from('posts')
        .upsert(posts, { onConflict: 'account_id, post_url' });

    if (postErr) {
        console.error(`Error inserting posts for ${acc.handle}:`, postErr);
    } else {
        console.log(`✅ Seeded 10 posts (8 baseline, 2 outliers) for ${acc.handle}`);
    }
  }

  console.log('\nSeeding Complete!');
}

seed().catch(console.error);
