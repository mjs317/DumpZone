import { DumpEntry, getHistory } from './storage';
import { getCurrentDayContent, getCurrentDateKey } from './storage';

export interface BackupData {
  version: string;
  exportDate: string;
  currentDay: string;
  currentContent: string;
  history: DumpEntry[];
}

export function createBackup(): BackupData {
  return {
    version: '1.0',
    exportDate: new Date().toISOString(),
    currentDay: getCurrentDateKey(),
    currentContent: getCurrentDayContent(),
    history: getHistory(),
  };
}

export function exportBackup(): void {
  const backup = createBackup();
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dump-zone-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function importBackup(backupData: BackupData): boolean {
  try {
    // Validate backup structure
    if (!backupData.history || !Array.isArray(backupData.history)) {
      return false;
    }

    // Restore history
    localStorage.setItem('dump-zone-entries', JSON.stringify(backupData.history));

    // Restore current day if it matches today
    if (backupData.currentDay === getCurrentDateKey() && backupData.currentContent) {
      localStorage.setItem('dump-zone-current-day', backupData.currentDay);
      localStorage.setItem('dump-zone-current-content', backupData.currentContent);
    }

    return true;
  } catch (error) {
    console.error('Failed to import backup:', error);
    return false;
  }
}

export function restoreFromFile(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backupData = JSON.parse(e.target?.result as string) as BackupData;
        const success = importBackup(backupData);
        resolve(success);
      } catch (error) {
        console.error('Failed to parse backup file:', error);
        resolve(false);
      }
    };
    reader.onerror = () => resolve(false);
    reader.readAsText(file);
  });
}

