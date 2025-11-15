'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { syncService } from '@/lib/sync'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false)
      return
    }

    const supabase = createClient()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)
      syncService.setUserId(nextUser?.id ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)
      syncService.setUserId(nextUser?.id ?? null)
      if (session) {
        router.refresh()
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const signOut = async () => {
    if (typeof window === 'undefined') return
    syncService.cleanup()
    syncService.setUserId(null)
    syncService.clearCache()
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

