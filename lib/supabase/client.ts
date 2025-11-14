import { createBrowserClient } from '@supabase/ssr'

// Mock client for SSR/build
const mockClient = {
  auth: {
    getUser: async () => ({ data: { user: null } }),
    getSession: async () => ({ data: { session: null } }),
    signOut: async () => ({ error: null }),
    signUp: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase not available during build' } }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase not available during build' } }),
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

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (typeof window === 'undefined') {
    return mockClient as any
  }

  if (browserClient) {
    return browserClient
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const finalUrl = url && key ? url : 'https://demo.supabase.co'
  const finalKey = url && key ? key : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

  browserClient = createBrowserClient(finalUrl, finalKey)
  return browserClient
}

