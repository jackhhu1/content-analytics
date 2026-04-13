import { createClient } from '@supabase/supabase-js';

// Service-role admin client — bypasses RLS.
// Only use in trusted server contexts: webhook handler, background jobs.
// Never expose to the browser or use in Server Actions that handle user input.
export const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
