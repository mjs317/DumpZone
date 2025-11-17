import { getCurrentDateKey } from './storage';
import { getCurrentDayContent, saveToHistory, clearCurrentDay } from './storage-sync';
import { saveToNotion, isNotionConnected } from './notion';

let lastCheckedDate: string | null = null;
let resetInterval: NodeJS.Timeout | null = null;

export function initializeDailyReset(onReset?: () => void): void {
  if (typeof window === 'undefined') return;
  
  // Check immediately
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
  
  if (lastCheckedDate === null) {
    lastCheckedDate = currentDate;
    return;
  }
  
  // If date changed (it's a new day)
  if (lastCheckedDate !== currentDate) {
    const previousDate = lastCheckedDate;
    const previousContent = await getCurrentDayContent();
    
    console.log('Daily reset triggered:', { previousDate, currentDate, contentLength: previousContent.length });
    
    // Save previous day's content to history if it exists
    if (previousContent.trim()) {
      try {
        await saveToHistory(previousContent, previousDate);
        console.log('Successfully saved to history:', previousDate);
      } catch (error) {
        console.error('Failed to save to history:', error);
      }
      
      // Also save to Notion if connected
      if (isNotionConnected()) {
        try {
          await saveToNotion(previousContent, previousDate);
          console.log('Successfully saved to Notion:', previousDate);
        } catch (error) {
          console.error('Failed to save to Notion:', error);
        }
      }
    } else {
      console.log('No content to save for:', previousDate);
    }
    
    // Clear current day
    try {
      await clearCurrentDay();
      console.log('Successfully cleared current day');
    } catch (error) {
      console.error('Failed to clear current day:', error);
    }
    
    // Update last checked date
    lastCheckedDate = currentDate;
    
    // Call reset callback
    if (onReset) {
      onReset();
    }
  }
}

export function cleanupDailyReset(): void {
  if (resetInterval) {
    clearInterval(resetInterval);
    resetInterval = null;
  }
}

