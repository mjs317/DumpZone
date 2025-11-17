import { createClient } from '@/lib/supabase/client'
import { DumpEntry } from './storage'
import * as localStorageStore from './storage'

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
  async subscribeToCurrentDay(
    onUpdate: (payload: {
      content: string
      updatedAt: string | null
      commitTimestamp?: string | null
      mutationId?: string | null
      clientId?: string | null
    }) => void,
    userIdOverride?: string | null
  ) {
    const supabase = getSupabaseClient()
    if (!supabase) return
    
    const userId = userIdOverride ?? (await this.getUserId())
    if (!userId) return

    // Clean up existing subscription
    if (this.currentDaySubscription) {
      this.currentDaySubscription.unsubscribe()
      this.currentDaySubscription = null
    }

    const channel = supabase
      .channel(`current-day-${userId}`, {
        config: {
          broadcast: { self: false },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'current_day',
          filter: `user_id=eq.${userId}`,
        },
        async (payload: any) => {
          console.log('🔔 Raw postgres_changes event:', {
            eventType: payload.eventType,
            table: payload.table,
            schema: payload.schema,
            hasNew: !!payload.new,
            commitTimestamp: payload.commit_timestamp
          })
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const content = (payload.new as any)?.content || ''
            const updatedAt = (payload.new as any)?.updated_at || null
            const commitTimestamp = payload.commit_timestamp || null
            const mutationId = (payload.new as any)?.mutation_id || null
            const clientId = (payload.new as any)?.client_id || null
            
            console.log('📤 Calling onUpdate with:', {
              contentLength: content.length,
              updatedAt,
              commitTimestamp,
              mutationId,
              clientId
            })
            
            onUpdate({ content, updatedAt, commitTimestamp, mutationId, clientId })
          } else {
            console.log('⚠️ Ignoring event type:', payload.eventType)
          }
        }
      )
      .subscribe((status: string) => {
        console.log('📡 Subscription status changed:', status, 'for userId:', userId, 'channel:', `current-day-${userId}`)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription active for current day, userId:', userId)
          console.log('📋 Listening for postgres_changes on table: current_day, filter: user_id=eq.' + userId)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn('❌ Real-time subscription error/closed:', status, '- attempting to reconnect...')
          // Re-subscribe after a short delay
          setTimeout(() => {
            console.log('🔄 Attempting to re-subscribe...')
            this.subscribeToCurrentDay(onUpdate, userIdOverride).catch(console.error)
          }, 2000)
        } else {
          console.log('ℹ️ Subscription status:', status)
        }
      })

    this.currentDaySubscription = channel

    // Load initial data
    try {
      const entry = await this.loadCurrentDayEntry()
      onUpdate({ 
        content: entry.content, 
        updatedAt: entry.updatedAt, 
        commitTimestamp: null,
        mutationId: entry.mutationId,
        clientId: entry.clientId
      })
    } catch (error) {
      console.error('Failed to load initial current day content:', error)
    }
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

  setUserId(userId: string | null) {
    this.userIdCache = userId
  }

  hasUser(): boolean {
    return this.userIdCache !== null
  }
  
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
  private async loadCurrentDayEntry(): Promise<{ content: string; updatedAt: string | null; clientId: string | null; mutationId: string | null }> {
    const supabase = getSupabaseClient()
    if (!supabase) {
      console.log('⚠️ loadCurrentDayEntry: No Supabase client')
      return { content: '', updatedAt: null, clientId: null, mutationId: null }
    }
    
    // Ensure we have a user ID - retry up to 3 times with increasing delays
    let userId = await this.getUserId()
    let retries = 0
    while (!userId && retries < 3) {
      await new Promise(resolve => setTimeout(resolve, 500 * (retries + 1)))
      userId = await this.getUserId()
      retries++
    }
    
    if (!userId) {
      console.log('⚠️ loadCurrentDayEntry: No user ID after retries')
      return { content: '', updatedAt: null, clientId: null, mutationId: null }
    }

    const dateKey = this.getCurrentDateKey()
    console.log('📥 loadCurrentDayEntry: Fetching content for user:', userId, 'date:', dateKey)
    
    // STRATEGY: Get the MOST RECENT entry (by updated_at) for this user
    // If it was updated today (within last 24 hours), use it
    // This avoids date format issues entirely
    const { data: recentData, error: recentError } = await supabase
      .from('current_day')
      .select('content, updated_at, client_id, mutation_id, date')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (recentError) {
      console.error('❌ Error loading most recent entry:', recentError)
      // Try fallback: get all entries
      const { data: allData, error: allError } = await supabase
        .from('current_day')
        .select('content, updated_at, client_id, mutation_id, date')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
      
      if (allError) {
        console.error('❌ Error loading all entries:', allError)
        return { content: '', updatedAt: null, clientId: null, mutationId: null }
      }
      
      if (!allData || allData.length === 0) {
        console.log('📭 No entries found in database for user:', userId)
        return { content: '', updatedAt: null, clientId: null, mutationId: null }
      }
      
      // Use the most recent entry from the fallback query
      const mostRecent = allData[0]
      const content = mostRecent.content || ''
      console.log('✅ loadCurrentDayEntry: Using most recent entry from fallback, length:', content.length, 'date:', mostRecent.date, 'updated_at:', mostRecent.updated_at)
      return { 
        content, 
        updatedAt: mostRecent.updated_at || null,
        clientId: mostRecent.client_id || null,
        mutationId: mostRecent.mutation_id || null
      }
    }
    
    if (!recentData) {
      console.log('📭 No recent entry found in database for user:', userId)
      return { content: '', updatedAt: null, clientId: null, mutationId: null }
    }
    
    // Check if the most recent entry is from today
    // Compare the date field (normalized) with today's date
    const entryDate = recentData.date
    let entryDateStr: string = ''
    
    if (entryDate) {
      if (typeof entryDate === 'string') {
        entryDateStr = entryDate.split('T')[0]
      } else if (entryDate instanceof Date) {
        entryDateStr = entryDate.toISOString().split('T')[0]
      } else {
        entryDateStr = new Date(entryDate).toISOString().split('T')[0]
      }
    }
    
    // Also check if updated_at is from today (within last 24 hours)
    const updatedAt = recentData.updated_at
    const isFromToday = updatedAt ? this.isDateToday(updatedAt) : false
    const dateMatches = entryDateStr === dateKey
    
    console.log('📊 Entry check:', {
      entryDate: entryDate,
      entryDateStr,
      dateKey,
      dateMatches,
      updatedAt,
      isFromToday,
      contentLength: recentData.content?.length || 0
    })
    
    // Use the entry if date matches OR if it was updated today
    if (dateMatches || isFromToday) {
      const content = recentData.content || ''
      console.log('✅ loadCurrentDayEntry: Using entry (date matches or updated today), length:', content.length)
      return { 
        content, 
        updatedAt: recentData.updated_at || null,
        clientId: recentData.client_id || null,
        mutationId: recentData.mutation_id || null
      }
    }
    
    // Entry exists but is not from today - return empty
    console.log('📭 Most recent entry is not from today, returning empty')
    return { content: '', updatedAt: null, clientId: null, mutationId: null }
  }
  
  // Helper to check if a timestamp is from today (within last 24 hours)
  private isDateToday(timestamp: string): boolean {
    try {
      const entryTime = new Date(timestamp).getTime()
      const now = Date.now()
      const twentyFourHours = 24 * 60 * 60 * 1000
      return (now - entryTime) < twentyFourHours
    } catch {
      return false
    }
  }

  async loadCurrentDay(): Promise<string> {
    const entry = await this.loadCurrentDayEntry()
    return entry.content
  }

  // Save current day content to Supabase
  async saveCurrentDay(
    content: string,
    metadata?: { clientId: string | null; mutationId: string | null }
  ): Promise<{ updatedAt: string | null; mutationId: string | null } | null> {
    const supabase = getSupabaseClient()
    if (!supabase) return null
    
    const userId = await this.getUserId()
    if (!userId) return null

    const dateKey = this.getCurrentDateKey()
    const updatedAt = new Date().toISOString()

    const { error } = await supabase
      .from('current_day')
      .upsert(
        {
          user_id: userId,
          date: dateKey,
          content,
          updated_at: updatedAt,
          client_id: metadata?.clientId || null,
          mutation_id: metadata?.mutationId || null,
        },
        { onConflict: 'user_id,date' }
      )

    if (error) {
      console.error('Error saving current day to Supabase:', error)
      return null
    }
    return { updatedAt, mutationId: metadata?.mutationId || null }
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

  // Helper function - uses local timezone, not UTC
  private getCurrentDateKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; // YYYY-MM-DD format in local timezone
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

