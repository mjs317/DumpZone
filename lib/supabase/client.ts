// Mock client for SSR/build
const mockClient = {
  auth: {
    getUser: async () => ({ data: { user: null } }),
    getSession: async () => ({ data: { session: null } }),
    signOut: async () => ({ error: null }),
    signUp: async () => ({ data: { user: null, session: null }, error: { message: 'Not available during SSR' } }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Not available during SSR' } }),
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

// Cache for the real Supabase client - only set in browser
let realClient: any = null
let clientPromise: Promise<any> | null = null

async function getRealClient() {
  // During SSR/build, return null
  if (typeof window === 'undefined') {
    return null
  }

  // If we already have the client, return it
  if (realClient) {
    return realClient
  }

  // If we're already loading, wait for it
  if (clientPromise) {
    return await clientPromise
  }

  // Start loading the real client
  clientPromise = (async () => {
    try {
      const { createBrowserClient } = await import('@supabase/ssr')
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!url || !key || url === 'https://placeholder.supabase.co') {
        realClient = createBrowserClient(
          'https://demo.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
        )
      } else {
        realClient = createBrowserClient(url, key)
      }
      
      clientPromise = null
      return realClient
    } catch (err) {
      console.error('Failed to load Supabase client:', err)
      clientPromise = null
      return null
    }
  })()

  return await clientPromise
}

export function createClient() {
  // During SSR/build, return mock client immediately
  if (typeof window === 'undefined') {
    return mockClient as any
  }

  // In browser, return a proxy that loads the real client on first use
  return new Proxy(mockClient, {
    get(target, prop) {
      // For auth methods, we need to load the real client
      if (prop === 'auth') {
        return new Proxy(target.auth, {
          get(authTarget, authProp) {
            const originalMethod = (authTarget as any)[authProp]
            
            // For async methods, return a function that loads the real client first
            if (typeof originalMethod === 'function' && (authProp === 'signUp' || authProp === 'signInWithPassword' || authProp === 'getUser' || authProp === 'getSession')) {
              return async (...args: any[]) => {
                const client = await getRealClient()
                if (!client) {
                  return originalMethod.apply(authTarget, args)
                }
                return (client.auth as any)[authProp](...args)
              }
            }
            
            // For other auth properties, try to get from real client
            return async (...args: any[]) => {
              const client = await getRealClient()
              if (!client) {
                return typeof originalMethod === 'function' 
                  ? originalMethod.apply(authTarget, args)
                  : originalMethod
              }
              const realMethod = (client.auth as any)[authProp]
              return typeof realMethod === 'function'
                ? realMethod.apply(client.auth, args)
                : realMethod
            }
          }
        })
      }
      
      // For other properties, return the mock for now
      return (target as any)[prop]
    }
  }) as any
}

