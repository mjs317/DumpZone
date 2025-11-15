'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import { getHistory, getPinnedEntries } from '@/lib/storage';
import { getWordCount, getCharacterCount } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default function StatsPage() {
  const [stats, setStats] = useState({
    totalDumps: 0,
    totalWords: 0,
    totalCharacters: 0,
    averageWords: 0,
    averageCharacters: 0,
    pinnedCount: 0,
    longestDump: { date: '', words: 0 },
    shortestDump: { date: '', words: Infinity },
    currentStreak: 0,
    longestStreak: 0,
  });

  useEffect(() => {
    const entries = getHistory();
    const pinned = getPinnedEntries();
    
    let totalWords = 0;
    let totalChars = 0;
    let longest = { date: '', words: 0 };
    let shortest = { date: '', words: Infinity };
    
    entries.forEach(entry => {
      const words = getWordCount(entry.content);
      const chars = getCharacterCount(entry.content);
      
      totalWords += words;
      totalChars += chars;
      
      if (words > longest.words) {
        longest = { date: entry.date, words };
      }
      if (words < shortest.words && words > 0) {
        shortest = { date: entry.date, words };
      }
    });

    // Calculate streaks
    const sortedDates = entries
      .map(e => e.date)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort()
      .reverse();
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    sortedDates.forEach(dateStr => {
      const date = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      
      if (lastDate === null) {
        const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) {
          currentStreak = 1;
          tempStreak = 1;
        } else if (diffDays === 1) {
          currentStreak = 1;
          tempStreak = 1;
        }
      } else {
        const diffDays = Math.floor((lastDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
          if (lastDate.getTime() === today.getTime() || (lastDate.getTime() === today.getTime() - 86400000)) {
            currentStreak = tempStreak;
          }
        } else {
          tempStreak = 1;
        }
      }
      
      longestStreak = Math.max(longestStreak, tempStreak);
      lastDate = date;
    });

    setStats({
      totalDumps: entries.length,
      totalWords,
      totalCharacters: totalChars,
      averageWords: entries.length > 0 ? Math.round(totalWords / entries.length) : 0,
      averageCharacters: entries.length > 0 ? Math.round(totalChars / entries.length) : 0,
      pinnedCount: pinned.length,
      longestDump: longest,
      shortestDump: shortest.words === Infinity ? { date: '', words: 0 } : shortest,
      currentStreak,
      longestStreak,
    });
  }, []);

  const StatCard = ({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) => (
    <div className="border dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm">
      <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</div>
      <div className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-200">{value}</div>
      {subtitle && (
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</div>
      )}
    </div>
  );

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
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-200">Statistics</h2>
          <Link 
            href="/" 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all duration-200 hover:scale-105 active:scale-95 touch-target border border-blue-200 dark:border-blue-800"
          >
            <span>⬅️</span>
            <span>Back to Dump Zone</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard 
            title="Total Dumps" 
            value={stats.totalDumps}
            subtitle="All time"
          />
          <StatCard 
            title="Total Words" 
            value={stats.totalWords.toLocaleString()}
            subtitle="Words written"
          />
          <StatCard 
            title="Total Characters" 
            value={stats.totalCharacters.toLocaleString()}
            subtitle="Characters typed"
          />
          <StatCard 
            title="Average Words" 
            value={stats.averageWords}
            subtitle="Per dump"
          />
          <StatCard 
            title="Average Characters" 
            value={stats.averageCharacters}
            subtitle="Per dump"
          />
          <StatCard 
            title="Pinned Dumps" 
            value={stats.pinnedCount}
            subtitle="Favorites"
          />
          <StatCard 
            title="Current Streak" 
            value={stats.currentStreak}
            subtitle="Days in a row"
          />
          <StatCard 
            title="Longest Streak" 
            value={stats.longestStreak}
            subtitle="Best streak"
          />
          {stats.longestDump.date && (
            <StatCard 
              title="Longest Dump" 
              value={stats.longestDump.words}
              subtitle={new Date(stats.longestDump.date).toLocaleDateString()}
            />
          )}
          {stats.shortestDump.date && (
            <StatCard 
              title="Shortest Dump" 
              value={stats.shortestDump.words}
              subtitle={new Date(stats.shortestDump.date).toLocaleDateString()}
            />
          )}
        </div>
      </div>
    </main>
  );
}

