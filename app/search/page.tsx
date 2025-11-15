'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import { getHistory, DumpEntry } from '@/lib/storage';
import { searchInContent } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [entries, setEntries] = useState<DumpEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<DumpEntry[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    const history = getHistory().reverse();
    setEntries(history);
    
    // Get all tags
    const tags = new Set<string>();
    history.forEach(entry => {
      if (entry.tags) {
        entry.tags.forEach(tag => tags.add(tag));
      }
    });
    setAllTags(Array.from(tags).sort());
  }, []);

  useEffect(() => {
    let filtered = entries;

    // Filter by search query
    if (query.trim()) {
      filtered = filtered.filter(entry => searchInContent(entry.content, query));
    }

    // Filter by tag
    if (selectedTag) {
      filtered = filtered.filter(entry => 
        entry.tags && entry.tags.includes(selectedTag)
      );
    }

    setFilteredEntries(filtered);
  }, [query, selectedTag, entries]);

  const highlightText = (text: string, searchQuery: string): string => {
    if (!searchQuery.trim()) return text;
    
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
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
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-200">Search</h2>
          <Link 
            href="/" 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all duration-200 hover:scale-105 active:scale-95 touch-target border border-blue-200 dark:border-blue-800"
          >
            <span>⬅️</span>
            <span>Back to Dump Zone</span>
          </Link>
        </div>

        {/* Search Input */}
        <div className="mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your dumps..."
            className="w-full px-4 py-2.5 sm:py-2 text-sm sm:text-base border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
            autoFocus
          />
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-1 text-xs sm:text-sm rounded ${
                  selectedTag === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                All
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-3 py-1 text-xs sm:text-sm rounded ${
                    selectedTag === tag
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {filteredEntries.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p className="text-sm sm:text-base">
              {query.trim() || selectedTag 
                ? 'No results found.' 
                : 'Start typing to search your dumps...'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Found {filteredEntries.length} {filteredEntries.length === 1 ? 'result' : 'results'}
            </p>
            {filteredEntries.map((entry) => (
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
                  {entry.pinned && (
                    <span className="text-yellow-500" title="Pinned">📌</span>
                  )}
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
                  dangerouslySetInnerHTML={{ 
                    __html: query.trim() 
                      ? highlightText(entry.content, query) 
                      : entry.content 
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

