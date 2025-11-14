// Hybrid storage: Uses Supabase when authenticated, localStorage as fallback
import { syncService } from './sync'
import * as localStorage from './storage'
import { createClient } from '@/lib/supabase/client'

// Lazy initialization - only create client when needed (not during build)
function getSupabaseClient() {
  // Check if we're in a browser environment and env vars are set
  if (typeof window === 'undefined') return null
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || url === 'https://placeholder.supabase.co') return null
  return createClient()
}

// Check if user is authenticated
async function isAuthenticated(): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) return false
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return !!user
  } catch {
    return false
  }
}

// Hybrid storage functions that automatically use Supabase or localStorage
export async function getCurrentDayContent(): Promise<string> {
  if (await isAuthenticated()) {
    return await syncService.loadCurrentDay()
  }
  return localStorage.getCurrentDayContent()
}

export async function saveCurrentDayContent(content: string): Promise<void> {
  if (await isAuthenticated()) {
    await syncService.saveCurrentDay(content)
  } else {
    localStorage.saveCurrentDayContent(content)
  }
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
  if (await isAuthenticated()) {
    await syncService.clearCurrentDay()
  } else {
    localStorage.clearCurrentDay()
  }
}

// Re-export DumpEntry type
export type { DumpEntry } from './storage'

