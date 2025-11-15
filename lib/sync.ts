import { createClient } from '@/lib/supabase/client'
import { DumpEntry } from './storage'

// Lazy Supabase client - only create when needed (not during SSR/build)
function getSupabaseClient() {
  if (typeof window === 'undefined') return null
  return createClient()
}

// Real-time sync service for cross-platform data
export class SyncService {
  private currentDaySubscription: any = null
  private historySubscription: any = null
  private listeners: Map<string, (data: any) => void> = new Map()

  // Subscribe to real-time updates for current day content
  async subscribeToCurrentDay(onUpdate: (content: string) => void) {
    const supabase = getSupabaseClient()
    if (!supabase) return
    
    const userId = await this.getUserId()
    if (!userId) return

    // Clean up existing subscription
    if (this.currentDaySubscription) {
      this.currentDaySubscription.unsubscribe()
    }

    this.currentDaySubscription = supabase
      .channel(`current-day-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'current_day',
          filter: `user_id=eq.${userId}`,
        },
        async (payload: any) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const content = (payload.new as any)?.content || ''
            onUpdate(content)
          }
        }
      )
      .subscribe()

    // Load initial data
    this.loadCurrentDay().then(onUpdate)
  }

  // Subscribe to real-time updates for history
  async subscribeToHistory(onUpdate: (entries: DumpEntry[]) => void) {
    const supabase = getSupabaseClient()
    if (!supabase) return
    
    const userId = await this.getUserId()
    if (!userId) return

    // Clean up existing subscription
    if (this.historySubscription) {
      this.historySubscription.unsubscribe()
    }

    this.historySubscription = supabase
      .channel(`history-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dump_entries',
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          const entries = await this.loadHistory()
          onUpdate(entries)
        }
      )
      .subscribe()

    // Load initial data
    this.loadHistory().then(onUpdate)
  }

  // Get current user ID (cached)
  private userIdCache: string | null = null
  
  private async getUserId(): Promise<string | null> {
    if (this.userIdCache) return this.userIdCache
    const supabase = getSupabaseClient()
    if (!supabase) return null
    const { data: { user } }: { data: { user: any } } = await supabase.auth.getUser()
    this.userIdCache = user?.id || null
    return this.userIdCache
  }
  
  // Clear cache when user changes
  clearCache() {
    this.userIdCache = null
  }

  // Load current day content from Supabase
  async loadCurrentDay(): Promise<string> {
    const supabase = getSupabaseClient()
    if (!supabase) return ''
    
    const userId = await this.getUserId()
    if (!userId) return ''

    const dateKey = this.getCurrentDateKey()
    
    const { data, error } = await supabase
      .from('current_day')
      .select('content')
      .eq('user_id', userId)
      .eq('date', dateKey)
      .single()

    if (error || !data) return ''
    return data.content || ''
  }

  // Save current day content to Supabase
  async saveCurrentDay(content: string): Promise<boolean> {
    const supabase = getSupabaseClient()
    if (!supabase) return false
    
    const userId = await this.getUserId()
    if (!userId) return false

    const dateKey = this.getCurrentDateKey()

    const { error } = await supabase
      .from('current_day')
      .upsert({
        user_id: userId,
        date: dateKey,
        content,
        updated_at: new Date().toISOString(),
      })

    return !error
  }

  // Load history from Supabase
  async loadHistory(): Promise<DumpEntry[]> {
    const supabase = getSupabaseClient()
    if (!supabase) return []
    
    const userId = await this.getUserId()
    if (!userId) return []

    const { data, error } = await supabase
      .from('dump_entries')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })

    if (error || !data) return []
    return data.map((entry: any) => ({
      id: entry.id,
      date: entry.date,
      content: entry.content,
      timestamp: entry.timestamp,
      tags: entry.tags || [],
      pinned: entry.pinned || false,
    }))
  }

  // Save entry to history
  async saveToHistory(entry: DumpEntry): Promise<boolean> {
    const supabase = getSupabaseClient()
    if (!supabase) return false
    
    const userId = await this.getUserId()
    if (!userId) return false

    const { error } = await supabase
      .from('dump_entries')
      .insert({
        id: entry.id,
        user_id: userId,
        date: entry.date,
        content: entry.content,
        timestamp: entry.timestamp,
        tags: entry.tags || [],
        pinned: entry.pinned || false,
      })

    return !error
  }

  // Update entry
  async updateEntry(entryId: string, updates: Partial<DumpEntry>): Promise<boolean> {
    const supabase = getSupabaseClient()
    if (!supabase) return false
    
    const userId = await this.getUserId()
    if (!userId) return false

    const { error } = await supabase
      .from('dump_entries')
      .update(updates)
      .eq('id', entryId)
      .eq('user_id', userId)

    return !error
  }

  // Delete entry
  async deleteEntry(entryId: string): Promise<boolean> {
    const supabase = getSupabaseClient()
    if (!supabase) return false
    
    const userId = await this.getUserId()
    if (!userId) return false

    const { error } = await supabase
      .from('dump_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', userId)

    return !error
  }

  // Clear current day
  async clearCurrentDay(): Promise<boolean> {
    const supabase = getSupabaseClient()
    if (!supabase) return false
    
    const userId = await this.getUserId()
    if (!userId) return false

    const dateKey = this.getCurrentDateKey()

    const { error } = await supabase
      .from('current_day')
      .delete()
      .eq('user_id', userId)
      .eq('date', dateKey)

    return !error
  }

  // Helper function
  private getCurrentDateKey(): string {
    return new Date().toISOString().split('T')[0]
  }

  // Cleanup subscriptions
  cleanup() {
    if (this.currentDaySubscription) {
      this.currentDaySubscription.unsubscribe()
      this.currentDaySubscription = null
    }
    if (this.historySubscription) {
      this.historySubscription.unsubscribe()
      this.historySubscription = null
    }
  }
}

// Singleton instance
export const syncService = new SyncService()

