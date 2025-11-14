// Conditional import to prevent SSR issues
let createBrowserClient: any = null

function getCreateBrowserClient() {
  if (typeof window === 'undefined') {
    // Return a mock client factory during SSR/build
    return () => ({
      auth: {
        getUser: async () => ({ data: { user: null } }),
        getSession: async () => ({ data: { session: null } }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
        insert: () => ({ error: null }),
        update: () => ({ eq: () => ({ error: null }) }),
        delete: () => ({ eq: () => ({ error: null }) }),
        upsert: () => ({ error: null }),
      }),
      channel: () => ({
        on: () => ({
          subscribe: () => ({ unsubscribe: () => {} }),
        }),
      }),
      removeChannel: () => {},
    })
  }
  
  // Lazy load the real client only in browser
  if (!createBrowserClient) {
    try {
      // Use dynamic require to prevent module-level window access
      createBrowserClient = require('@supabase/ssr').createBrowserClient
    } catch {
      // Fallback if require fails
      return () => ({})
    }
  }
  
  return createBrowserClient
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const createFn = getCreateBrowserClient()
  
  // During build, if env vars aren't set, use Supabase demo values
  if (!url || !key || url === 'https://placeholder.supabase.co') {
    return createFn(
      'https://demo.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
    )
  }

  return createFn(url, key)
}

