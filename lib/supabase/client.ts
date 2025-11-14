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

// Cache for the createBrowserClient function - only set in browser
let createBrowserClientFn: any = null

function getCreateBrowserClient() {
  // During SSR/build, NEVER try to load the real client
  // Return mock client factory immediately
  if (typeof window === 'undefined') {
    return () => mockClient as any
  }

  // Only in browser: lazy load the real client
  // Use a function reference that webpack can't analyze at build time
  if (!createBrowserClientFn) {
    // Use Function constructor to prevent webpack from analyzing this
    // This ensures require is never executed during build
    const requireFunc = new Function('moduleName', 'return require(moduleName)')
    try {
      const ssrModule = requireFunc('@supabase/ssr')
      createBrowserClientFn = ssrModule.createBrowserClient
    } catch {
      // Fallback to mock if loading fails
      return () => mockClient as any
    }
  }

  return createBrowserClientFn
}

export function createClient() {
  // During SSR/build, return mock client immediately
  // This check happens FIRST before any other code
  if (typeof window === 'undefined') {
    return mockClient as any
  }

  // Only execute this in browser
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

