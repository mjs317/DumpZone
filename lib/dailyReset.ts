import { getCurrentDateKey } from './storage';
import { saveToHistory, clearCurrentDay, getContentForDate } from './storage-sync';
import { saveToNotion, isNotionConnected } from './notion';

const LAST_CHECKED_DATE_KEY = 'dump-zone-last-checked-date';

// Get last checked date from localStorage (persists across page reloads)
function getLastCheckedDate(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(LAST_CHECKED_DATE_KEY);
}

// Set last checked date in localStorage
function setLastCheckedDate(date: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LAST_CHECKED_DATE_KEY, date);
}

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
  let lastCheckedDate = getLastCheckedDate();
  
  console.log('🕐 Daily reset check:', { currentDate, lastCheckedDate });
  
  // CRITICAL FIX: If lastCheckedDate is null (first load), check if we need to process yesterday
  // This handles the case where user opens app on a new day after not having it open at midnight
  if (lastCheckedDate === null) {
    console.log('📅 First load - checking for unarchived content from previous days...');
    
    // Check if there's content in the database for yesterday that needs to be archived
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    
    console.log('🔍 Checking for unarchived content from:', yesterdayKey);
    
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
          const notionResult = await saveToNotion(yesterdayContent, yesterdayKey);
          if (notionResult) {
            console.log('✅ Successfully saved yesterday to Notion:', yesterdayKey);
          } else {
            console.error('❌ Failed to save to Notion (returned false)');
          }
        } catch (error) {
          console.error('❌ Failed to save yesterday to Notion:', error);
        }
      } else {
        console.log('ℹ️ Notion not connected, skipping Notion save');
      }
      
      // Clear yesterday's entry from current_day table (it's now in history)
      try {
        await clearCurrentDayForDate(yesterdayKey);
        console.log('✅ Cleared yesterday from current_day table');
      } catch (error) {
        console.error('❌ Failed to clear yesterday:', error);
      }
    } else {
      console.log('📭 No unarchived content found for:', yesterdayKey);
    }
    
    // Set lastCheckedDate to current date
    setLastCheckedDate(currentDate);
    return;
  }
  
  // If date changed (it's a new day)
  if (lastCheckedDate !== currentDate) {
    // CRITICAL FIX: Calculate yesterday's date from currentDate, not from lastCheckedDate
    // This ensures we always use the correct date (yesterday = currentDate - 1 day)
    // Using lastCheckedDate could be stale or incorrect if there were timing issues
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const previousDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    
    console.log('🔄 Daily reset triggered - date changed!', { 
      lastCheckedDate, 
      currentDate, 
      calculatedPreviousDate: previousDate 
    });
    
    // CRITICAL FIX: Get content for the PREVIOUS date (yesterday) from database
    // getCurrentDayContent() would return today's (empty) content, not yesterday's
    // Also try to get content from current_day table as a backup (in case it wasn't cleared yet)
    let previousContent = await getContentForDate(previousDate);
    
    // If we didn't find content, try getting it from current_day table directly
    // This is a safeguard to ensure we don't lose content
    if (!previousContent || !previousContent.trim()) {
      console.log('⚠️ No content found via getContentForDate, trying current_day table directly...');
      const { getCurrentDayContent } = await import('./storage-sync');
      // Check if the stored day matches previousDate
      if (typeof window !== 'undefined') {
        const storedDay = window.localStorage.getItem('dump-zone-current-day');
        if (storedDay === previousDate) {
          const currentDayContent = await getCurrentDayContent();
          if (currentDayContent && currentDayContent.trim()) {
            console.log('✅ Found content in current_day storage, using it');
            previousContent = currentDayContent;
          }
        }
      }
    }
    
    console.log('📥 Daily reset: Retrieved previous day content for date:', previousDate, 'length:', previousContent?.length || 0);
    
    // Save previous day's content to history if it exists
    // Use the calculated previousDate (yesterday) to ensure correct date
    if (previousContent && previousContent.trim()) {
      try {
        await saveToHistory(previousContent, previousDate);
        console.log('✅ Successfully saved to history with date:', previousDate);
      } catch (error) {
        console.error('❌ Failed to save to history:', error);
      }
      
      // Also save to Notion if connected
      if (isNotionConnected()) {
        try {
          console.log('📝 Attempting to save to Notion for date:', previousDate);
          const notionResult = await saveToNotion(previousContent, previousDate);
          if (notionResult) {
            console.log('✅ Successfully saved to Notion:', previousDate);
          } else {
            console.error('❌ Failed to save to Notion (returned false) for date:', previousDate);
          }
        } catch (error) {
          console.error('❌ Failed to save to Notion (error thrown):', error);
        }
      } else {
        console.log('ℹ️ Notion not connected, skipping Notion save');
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
    
    // Update last checked date in localStorage
    setLastCheckedDate(currentDate);
    
    // Call reset callback
    if (onReset) {
      onReset();
    }
  } else {
    console.log('✓ Date unchanged, no reset needed');
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

