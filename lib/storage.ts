export interface DumpEntry {
  id: string;
  date: string;
  content: string;
  timestamp: number;
  tags?: string[];
  pinned?: boolean;
}

const STORAGE_KEY = 'dump-zone-entries';
const CURRENT_DAY_KEY = 'dump-zone-current-day';
const CURRENT_CONTENT_KEY = 'dump-zone-current-content';

export function getCurrentDateKey(): string {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
}

export function getCurrentDayContent(): string {
  if (typeof window === 'undefined') return '';
  
  const storedDay = localStorage.getItem(CURRENT_DAY_KEY);
  const currentDay = getCurrentDateKey();
  
  // If it's a new day, clear the content
  if (storedDay !== currentDay) {
    localStorage.setItem(CURRENT_DAY_KEY, currentDay);
    localStorage.setItem(CURRENT_CONTENT_KEY, '');
    return '';
  }
  
  return localStorage.getItem(CURRENT_CONTENT_KEY) || '';
}

export function saveCurrentDayContent(content: string): void {
  if (typeof window === 'undefined') return;
  
  const currentDay = getCurrentDateKey();
  localStorage.setItem(CURRENT_DAY_KEY, currentDay);
  localStorage.setItem(CURRENT_CONTENT_KEY, content);
}

export function saveToHistory(content: string, date: string, tags?: string[], pinned?: boolean): void {
  if (typeof window === 'undefined') return;
  
  const entries = getHistory();
  const entry: DumpEntry = {
    id: `${date}-${Date.now()}`,
    date,
    content,
    timestamp: Date.now(),
    tags: tags || [],
    pinned: pinned || false,
  };
  
  entries.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function updateEntry(entryId: string, updates: Partial<DumpEntry>): boolean {
  if (typeof window === 'undefined') return false;
  
  const entries = getHistory();
  const index = entries.findIndex(e => e.id === entryId);
  
  if (index === -1) return false;
  
  entries[index] = { ...entries[index], ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  return true;
}

export function togglePinEntry(entryId: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const entries = getHistory();
  const entry = entries.find(e => e.id === entryId);
  
  if (!entry) return false;
  
  entry.pinned = !entry.pinned;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  return true;
}

export function addTagsToEntry(entryId: string, tags: string[]): boolean {
  if (typeof window === 'undefined') return false;
  
  const entries = getHistory();
  const entry = entries.find(e => e.id === entryId);
  
  if (!entry) return false;
  
  const existingTags = entry.tags || [];
  const newTags = [...new Set([...existingTags, ...tags])];
  entry.tags = newTags;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  return true;
}

export function removeTagFromEntry(entryId: string, tag: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const entries = getHistory();
  const entry = entries.find(e => e.id === entryId);
  
  if (!entry) return false;
  
  const existingTags = entry.tags || [];
  entry.tags = existingTags.filter(t => t !== tag);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  return true;
}

export function getAllTags(): string[] {
  const entries = getHistory();
  const tagSet = new Set<string>();
  
  entries.forEach(entry => {
    if (entry.tags) {
      entry.tags.forEach(tag => tagSet.add(tag));
    }
  });
  
  return Array.from(tagSet).sort();
}

export function getPinnedEntries(): DumpEntry[] {
  return getHistory().filter(entry => entry.pinned);
}

export function getHistory(): DumpEntry[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function clearCurrentDay(): void {
  if (typeof window === 'undefined') return;
  
  const currentDay = getCurrentDateKey();
  localStorage.setItem(CURRENT_DAY_KEY, currentDay);
  localStorage.setItem(CURRENT_CONTENT_KEY, '');
}

