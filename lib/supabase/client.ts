// Mock client for SSR/build
const mockClient = {
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
}

let createBrowserClientFn: any = null

function getCreateBrowserClient() {
  // During SSR/build, return mock client factory
  if (typeof window === 'undefined') {
    return () => mockClient as any
  }

  // Lazy load only in browser
  if (!createBrowserClientFn) {
    try {
      // Use eval to prevent module-level execution during build
      createBrowserClientFn = eval('require')('@supabase/ssr').createBrowserClient
    } catch {
      // Fallback to mock if require fails
      return () => mockClient as any
    }
  }

  return createBrowserClientFn
}

export function createClient() {
  // During SSR/build, return mock client
  if (typeof window === 'undefined') {
    return mockClient as any
  }

  const createBrowserClient = getCreateBrowserClient()
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During build, if env vars aren't set, use Supabase demo values
  if (!url || !key || url === 'https://placeholder.supabase.co') {
    return createBrowserClient(
      'https://demo.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
    )
  }

  return createBrowserClient(url, key)
}

