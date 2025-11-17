'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import { getHistory, togglePinEntry, addTagsToEntry, removeTagFromEntry, getAllTags, DumpEntry } from '@/lib/storage-sync';
import { exportEntryAsMarkdown, exportEntryAsText } from '@/lib/export';

export const dynamic = 'force-dynamic';

export default function HistoryPage() {
  const [entries, setEntries] = useState<DumpEntry[]>([]);
  const [editingTags, setEditingTags] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  useEffect(() => {
    loadEntries();
    loadTags();
    
    // Refresh data when page becomes visible (e.g., after daily reset)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadEntries();
        loadTags();
      }
    };
    
    // Refresh every 30 seconds to catch daily resets
    const interval = setInterval(() => {
      loadEntries();
      loadTags();
    }, 30000);
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [filterTag, showPinnedOnly]);

  const loadTags = async () => {
    const tags = await getAllTags();
    setAllTags(tags);
  };

  const loadEntries = async () => {
    let history = await getHistory();
    history = history.reverse();
    
    if (showPinnedOnly) {
      history = history.filter(e => e.pinned);
    }
    
    if (filterTag) {
      history = history.filter(e => e.tags && e.tags.includes(filterTag));
    }
    
    setEntries(history);
  };

  const handleTogglePin = async (entryId: string) => {
    await togglePinEntry(entryId);
    await loadEntries();
    await loadTags();
  };

  const handleAddTag = async (entryId: string, tag: string) => {
    if (tag.trim()) {
      await addTagsToEntry(entryId, [tag.trim()]);
      await loadEntries();
      await loadTags();
      setNewTag('');
    }
  };

  const handleRemoveTag = async (entryId: string, tag: string) => {
    await removeTagFromEntry(entryId, tag);
    await loadEntries();
    await loadTags();
  };

  const handleExport = (entry: DumpEntry, format: 'markdown' | 'text') => {
    if (format === 'markdown') {
      exportEntryAsMarkdown(entry);
    } else {
      exportEntryAsText(entry);
    }
  };

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 w-full transition-colors">
      <div className="max-w-4xl mx-auto px-2 sm:px-4 md:px-6 lg:px-0 py-4 sm:py-6 md:py-8 w-full">
        <div className="flex justify-center items-center py-2 relative mb-4">
          <Link href="/" aria-label="Return to Dump Zone" className="cursor-pointer">
            <Logo />
          </Link>
          <div className="absolute right-0 flex items-center">
            <ThemeToggle />
          </div>
        </div>
        
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-200">History</h2>
          <Link 
            href="/" 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all duration-200 hover:scale-105 active:scale-95 touch-target border border-blue-200 dark:border-blue-800"
          >
            <span>⬅️</span>
            <span>Back to Dump Zone</span>
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <button
            onClick={() => setShowPinnedOnly(!showPinnedOnly)}
            className={`px-3 py-1 text-xs sm:text-sm rounded ${
              showPinnedOnly
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {showPinnedOnly ? '📌 Pinned Only' : '📌 Show All'}
          </button>
          
          {allTags.length > 0 && (
            <>
              <button
                onClick={() => setFilterTag(null)}
                className={`px-3 py-1 text-xs sm:text-sm rounded ${
                  filterTag === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                All Tags
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setFilterTag(tag)}
                  className={`px-3 py-1 text-xs sm:text-sm rounded ${
                    filterTag === tag
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-8 sm:py-12 text-gray-500 dark:text-gray-400 px-4">
            <p className="text-sm sm:text-base">No history yet. Your daily dumps will appear here after midnight.</p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="border dark:border-gray-700 rounded-lg p-3 sm:p-4 md:p-6 shadow-sm bg-white dark:bg-gray-800"
              >
                <div className="flex justify-between items-start mb-2 sm:mb-3">
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    {new Date(entry.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTogglePin(entry.id)}
                      className={`text-lg ${entry.pinned ? 'text-yellow-500' : 'text-gray-400 dark:text-gray-600'}`}
                      title={entry.pinned ? 'Unpin' : 'Pin'}
                    >
                      📌
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setEditingTags(editingTags === entry.id ? null : entry.id)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        🏷️
                      </button>
                      {editingTags === entry.id && (
                        <div className="absolute right-0 mt-2 p-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow-lg z-10 min-w-[200px]">
                          <div className="flex flex-wrap gap-1 mb-2">
                            {entry.tags && entry.tags.map(tag => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded flex items-center gap-1"
                              >
                                #{tag}
                                <button
                                  onClick={() => handleRemoveTag(entry.id, tag)}
                                  className="hover:text-red-600"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={newTag}
                              onChange={(e) => setNewTag(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleAddTag(entry.id, newTag);
                                }
                              }}
                              placeholder="Add tag..."
                              className="flex-1 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                            />
                            <button
                              onClick={() => handleAddTag(entry.id, newTag)}
                              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="relative group">
                      <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                        ⬇️
                      </button>
                      <div className="absolute right-0 mt-2 p-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow-lg z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                        <button
                          onClick={() => handleExport(entry, 'markdown')}
                          className="block w-full text-left px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded whitespace-nowrap"
                        >
                          Export as Markdown
                        </button>
                        <button
                          onClick={() => handleExport(entry, 'text')}
                          className="block w-full text-left px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded whitespace-nowrap"
                        >
                          Export as Text
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {entry.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                
                <div
                  className="prose prose-sm sm:prose max-w-none text-sm sm:text-base dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: entry.content }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
