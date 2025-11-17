// Hybrid storage: Uses Supabase when authenticated, localStorage as fallback
import { syncService } from './sync'
import * as localStorage from './storage'
import { createClient } from '@/lib/supabase/client'
import { getClientId } from './client-id'

// Lazy initialization - only create client when needed (not during build)
function getSupabaseClient() {
  // Check if we're in a browser environment and env vars are set
  if (typeof window === 'undefined') return null
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || url === 'https://demo.supabase.co') return null
  return createClient()
}

// Check if user is authenticated
async function isAuthenticated(): Promise<boolean> {
  if (syncService.hasUser()) {
    return true
  }
  const supabase = getSupabaseClient()
  if (!supabase) return false
  try {
    const {
      data: { user },
    }: { data: { user: any } } = await supabase.auth.getUser()
    if (user?.id) {
      syncService.setUserId(user.id)
      return true
    }
    return false
  } catch {
    return false
  }
}

// Hybrid storage functions that automatically use Supabase or localStorage
export async function getCurrentDayContent(): Promise<string> {
  console.log('📥 getCurrentDayContent: Starting load...')
  if (await isAuthenticated()) {
    // When authenticated, remote content is the source of truth
    try {
      console.log('✅ getCurrentDayContent: User authenticated, fetching from Supabase...')
      const remoteContent = await syncService.loadCurrentDay()
      console.log('📥 getCurrentDayContent: Received remote content, length:', remoteContent?.length ?? 0)
      
      // Always use remote content (even if empty string) and sync to local storage
      // This ensures we get the latest saved content from the database
      if (remoteContent !== null && remoteContent !== undefined) {
        // Update local storage to match remote (for offline fallback)
        localStorage.saveCurrentDayContent(remoteContent)
        console.log('✅ getCurrentDayContent: Using remote content, synced to local storage')
        return remoteContent
      }
      
      // If remote fetch returned null/undefined, try local as fallback
      console.log('⚠️ getCurrentDayContent: Remote content was null/undefined, trying local...')
      const localContent = localStorage.getCurrentDayContent()
      if (localContent) {
        console.log('📦 getCurrentDayContent: Found local content, syncing to remote...')
        // Try to sync local to remote
        await syncService.saveCurrentDay(localContent).catch((e) => {
          console.error('Failed to sync local to remote:', e)
        })
        return localContent
      }
      console.log('📭 getCurrentDayContent: No local content either, returning empty')
      return ''
    } catch (error) {
      console.error('❌ getCurrentDayContent: Error loading remote content, using local fallback:', error)
      // On error, fall back to local storage
      const localContent = localStorage.getCurrentDayContent()
      console.log('📦 getCurrentDayContent: Using local fallback, length:', localContent.length)
      return localContent
    }
  }
  // Not authenticated, use local storage only
  console.log('🔒 getCurrentDayContent: Not authenticated, using local storage only')
  return localStorage.getCurrentDayContent()
}

function createMutationId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `mutation-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export async function saveCurrentDayContent(
  content: string
): Promise<{ updatedAt: string | null; mutationId: string | null } | null> {
  localStorage.saveCurrentDayContent(content)

  // Strategy:
  // 1) Ensure authentication state is checked and userId is cached
  // 2) Try client-side Supabase save (fast path; works when auth is ready on device)
  // 3) Fallback to API route which uses server-side Supabase (works when client auth is flaky)
  try {
    const clientId = getClientId()
    const mutationId = createMutationId()

    // First, ensure we check auth and cache userId (important for mobile)
    const isAuth = await isAuthenticated()
    
    // Strategy: Always try API route first for mobile reliability
    // API route uses server-side Supabase which is more reliable for real-time events
    // Client-side saves can be flaky on mobile browsers
    try {
      const response = await fetch('/api/current-day', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({
          content,
          clientId: null, // Don't send clientId via API route to avoid self-filtering
          mutationId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ API route save successful:', { mutationId, updatedAt: data.updatedAt })
        // Track this mutation ID so we can filter it out if needed
        // But since clientId is null, the real-time event will be received by other devices
        return {
          updatedAt: data.updatedAt ?? null,
          mutationId,
        }
      } else if (response.status === 401) {
        // Not authenticated - try client-side as fallback
        console.log('API route not authenticated, trying client-side save')
        if (isAuth) {
          try {
            const direct = await syncService.saveCurrentDay(content, { clientId, mutationId })
            if (direct && direct.updatedAt) {
              console.log('✅ Client-side save successful (fallback)')
              return {
                updatedAt: direct.updatedAt,
                mutationId: direct.mutationId ?? mutationId,
              }
            }
          } catch (e) {
            console.warn('Client-side Supabase save also failed:', e)
          }
        }
        console.log('Not authenticated, saving locally only')
      } else {
        const errorText = await response.text().catch(() => '')
        console.error('❌ Failed to sync via API route:', response.status, errorText)
        // Fallback to client-side if API route fails
        if (isAuth) {
          try {
            const direct = await syncService.saveCurrentDay(content, { clientId, mutationId })
            if (direct && direct.updatedAt) {
              console.log('✅ Client-side save successful (fallback after API error)')
              return {
                updatedAt: direct.updatedAt,
                mutationId: direct.mutationId ?? mutationId,
              }
            }
          } catch (e) {
            console.warn('Client-side Supabase save also failed:', e)
          }
        }
      }
    } catch (fetchError) {
      console.error('API route fetch failed, trying client-side:', fetchError)
      // Fallback to client-side if fetch fails
      if (isAuth) {
        try {
          const direct = await syncService.saveCurrentDay(content, { clientId, mutationId })
          if (direct && direct.updatedAt) {
            console.log('✅ Client-side save successful (fallback after fetch error)')
            return {
              updatedAt: direct.updatedAt,
              mutationId: direct.mutationId ?? mutationId,
            }
          }
        } catch (e) {
          console.warn('Client-side Supabase save also failed:', e)
        }
      }
    }
  } catch (error) {
    console.error('saveCurrentDayContent: sync failed, local only:', error)
  }

  return null
}

export async function getHistory() {
  if (await isAuthenticated()) {
    return await syncService.loadHistory()
  }
  return localStorage.getHistory()
}

export async function saveToHistory(
  content: string,
  date: string,
  tags?: string[],
  pinned?: boolean
): Promise<void> {
  const entry = {
    id: `${date}-${Date.now()}`,
    date,
    content,
    timestamp: Date.now(),
    tags: tags || [],
    pinned: pinned || false,
  }

  if (await isAuthenticated()) {
    await syncService.saveToHistory(entry)
  } else {
    localStorage.saveToHistory(content, date, tags, pinned)
  }
}

export async function updateEntry(entryId: string, updates: any): Promise<boolean> {
  if (await isAuthenticated()) {
    return await syncService.updateEntry(entryId, updates)
  }
  return localStorage.updateEntry(entryId, updates)
}

export async function togglePinEntry(entryId: string): Promise<boolean> {
  if (await isAuthenticated()) {
    const entries = await getHistory()
    const entry = entries.find(e => e.id === entryId)
    if (!entry) return false
    return await syncService.updateEntry(entryId, { pinned: !entry.pinned })
  }
  return localStorage.togglePinEntry(entryId)
}

export async function addTagsToEntry(entryId: string, tags: string[]): Promise<boolean> {
  if (await isAuthenticated()) {
    const entries = await getHistory()
    const entry = entries.find(e => e.id === entryId)
    if (!entry) return false
    const existingTags = entry.tags || []
    const combinedTags = existingTags.concat(tags)
    const uniqueTags = new Set<string>(combinedTags)
    const newTags = Array.from(uniqueTags)
    return await syncService.updateEntry(entryId, { tags: newTags })
  }
  return localStorage.addTagsToEntry(entryId, tags)
}

export async function removeTagFromEntry(entryId: string, tag: string): Promise<boolean> {
  if (await isAuthenticated()) {
    const entries = await getHistory()
    const entry = entries.find(e => e.id === entryId)
    if (!entry) return false
    const existingTags = entry.tags || []
    const filteredTags = existingTags.filter(t => t !== tag)
    return await syncService.updateEntry(entryId, { tags: filteredTags })
  }
  return localStorage.removeTagFromEntry(entryId, tag)
}

export async function getAllTags(): Promise<string[]> {
  const entries = await getHistory()
  const tagSet = new Set<string>()
  
  entries.forEach(entry => {
    if (entry.tags) {
      entry.tags.forEach(tag => tagSet.add(tag))
    }
  })
  
  return Array.from(tagSet).sort()
}

export async function getPinnedEntries() {
  const entries = await getHistory()
  return entries.filter(entry => entry.pinned)
}

export async function clearCurrentDay(): Promise<void> {
  localStorage.clearCurrentDay()
  if (await isAuthenticated()) {
    await syncService.clearCurrentDay()
  }
}

// Re-export DumpEntry type
export type { DumpEntry } from './storage'

