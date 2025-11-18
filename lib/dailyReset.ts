import { getCurrentDateKey } from './storage';
import { saveToHistory, clearCurrentDay, getContentForDate } from './storage-sync';
import { saveToNotion, isNotionConnected } from './notion';

let lastCheckedDate: string | null = null;
let resetInterval: NodeJS.Timeout | null = null;

export function initializeDailyReset(onReset?: () => void): void {
  if (typeof window === 'undefined') return;
  
  // Check immediately - this will handle the case where user opens app on a new day
  checkAndReset(onReset).catch((error) => {
    console.error('Daily reset check failed:', error);
  });
  
  // Check every minute
  resetInterval = setInterval(() => {
    checkAndReset(onReset).catch((error) => {
      console.error('Daily reset check failed:', error);
    });
  }, 60000); // Check every minute
}

export async function checkAndReset(onReset?: () => void): Promise<void> {
  const currentDate = getCurrentDateKey();
  
  // CRITICAL FIX: If lastCheckedDate is null (first load), check if we need to process yesterday
  // This handles the case where user opens app on a new day after not having it open at midnight
  if (lastCheckedDate === null) {
    // Check if there's content in the database for yesterday that needs to be archived
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    
    // Try to get yesterday's content from database
    const yesterdayContent = await getContentForDate(yesterdayKey);
    
    if (yesterdayContent && yesterdayContent.trim()) {
      console.log('🔄 Daily reset: Found unarchived content from yesterday:', yesterdayKey, 'length:', yesterdayContent.length);
      
      // Archive yesterday's content
      try {
        await saveToHistory(yesterdayContent, yesterdayKey);
        console.log('✅ Successfully archived yesterday to history:', yesterdayKey);
      } catch (error) {
        console.error('❌ Failed to save yesterday to history:', error);
      }
      
      // Save to Notion if connected
      if (isNotionConnected()) {
        try {
          await saveToNotion(yesterdayContent, yesterdayKey);
          console.log('✅ Successfully saved yesterday to Notion:', yesterdayKey);
        } catch (error) {
          console.error('❌ Failed to save yesterday to Notion:', error);
        }
      }
      
      // Clear yesterday's entry from current_day table (it's now in history)
      try {
        await clearCurrentDayForDate(yesterdayKey);
        console.log('✅ Cleared yesterday from current_day table');
      } catch (error) {
        console.error('❌ Failed to clear yesterday:', error);
      }
    }
    
    // Set lastCheckedDate to current date
    lastCheckedDate = currentDate;
    return;
  }
  
  // If date changed (it's a new day)
  if (lastCheckedDate !== currentDate) {
    const previousDate = lastCheckedDate;
    
    console.log('🔄 Daily reset triggered:', { previousDate, currentDate });
    
    // CRITICAL FIX: Get content for the PREVIOUS date from database, not current date
    // getCurrentDayContent() would return today's (empty) content, not yesterday's
    const previousContent = await getContentForDate(previousDate);
    
    console.log('📥 Daily reset: Retrieved previous day content, length:', previousContent?.length || 0);
    
    // Save previous day's content to history if it exists
    if (previousContent && previousContent.trim()) {
      try {
        await saveToHistory(previousContent, previousDate);
        console.log('✅ Successfully saved to history:', previousDate);
      } catch (error) {
        console.error('❌ Failed to save to history:', error);
      }
      
      // Also save to Notion if connected
      if (isNotionConnected()) {
        try {
          await saveToNotion(previousContent, previousDate);
          console.log('✅ Successfully saved to Notion:', previousDate);
        } catch (error) {
          console.error('❌ Failed to save to Notion:', error);
        }
      }
    } else {
      console.log('📭 No content to save for:', previousDate);
    }
    
    // Clear previous day's entry from current_day table (it's now archived)
    try {
      await clearCurrentDayForDate(previousDate);
      console.log('✅ Cleared previous day from current_day table');
    } catch (error) {
      console.error('❌ Failed to clear previous day:', error);
    }
    
    // Clear current day (today) - both local and remote
    try {
      await clearCurrentDay();
      console.log('✅ Successfully cleared current day');
    } catch (error) {
      console.error('❌ Failed to clear current day:', error);
    }
    
    // Update last checked date
    lastCheckedDate = currentDate;
    
    // Call reset callback
    if (onReset) {
      onReset();
    }
  }
}

// Helper to clear a specific date from current_day table
async function clearCurrentDayForDate(dateKey: string): Promise<void> {
  const { syncService } = await import('./sync');
  
  // Check if authenticated by checking if syncService has a user
  const hasUser = syncService.hasUser();
  
  if (hasUser) {
    try {
      await syncService.clearCurrentDayForDate(dateKey);
    } catch (error) {
      console.error('Failed to clear date from Supabase:', error);
    }
  }
  
  // Also clear from local storage if it matches
  if (typeof window !== 'undefined') {
    const { getCurrentDateKey } = await import('./storage');
    const storedDay = window.localStorage.getItem('dump-zone-current-day');
    if (storedDay === dateKey) {
      window.localStorage.removeItem('dump-zone-current-content');
      window.localStorage.setItem('dump-zone-current-day', getCurrentDateKey());
    }
  }
}

export function cleanupDailyReset(): void {
  if (resetInterval) {
    clearInterval(resetInterval);
    resetInterval = null;
  }
}

