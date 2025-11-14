import { getCurrentDateKey, getCurrentDayContent, saveToHistory, clearCurrentDay } from './storage';
import { saveToNotion, isNotionConnected } from './notion';

let lastCheckedDate: string | null = null;
let resetInterval: NodeJS.Timeout | null = null;

export function initializeDailyReset(onReset?: () => void): void {
  if (typeof window === 'undefined') return;
  
  // Check immediately
  checkAndReset(onReset);
  
  // Check every minute
  resetInterval = setInterval(() => {
    checkAndReset(onReset);
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
    const previousContent = getCurrentDayContent();
    
    // Save previous day's content to history if it exists
    if (previousContent.trim()) {
      saveToHistory(previousContent, previousDate);
      
      // Also save to Notion if connected
      if (isNotionConnected()) {
        try {
          await saveToNotion(previousContent, previousDate);
        } catch (error) {
          console.error('Failed to save to Notion:', error);
        }
      }
    }
    
    // Clear current day
    clearCurrentDay();
    
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

