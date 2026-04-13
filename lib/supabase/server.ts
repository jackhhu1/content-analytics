import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Cookie-based server client — reads the logged-in user's session.
// Use this in Server Components and Server Actions.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll is called from Server Components where cookies are read-only.
            // Middleware handles session refresh in that case.
          }
        },
      },
    }
  );
}
