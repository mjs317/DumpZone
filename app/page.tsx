'use client';

import { useEffect, useRef, useState } from 'react';
import Logo from '@/components/Logo';
import TextEditor from '@/components/TextEditor';
import ThemeToggle from '@/components/ThemeToggle';
import { initializeDailyReset, cleanupDailyReset } from '@/lib/dailyReset';
import { getCurrentDateKey } from '@/lib/storage';
import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const fetchCache = 'force-no-store'

export default function Home() {
  const [currentDate, setCurrentDate] = useState('');
  const { user, signOut } = useAuth();
  const headerRef = useRef<HTMLDivElement>(null);
  const [toolbarOffset, setToolbarOffset] = useState(0);

  // Initialize date on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentDate(getCurrentDateKey());
    }
  }, []);

  useEffect(() => {
    // Initialize daily reset checker
    const handleReset = () => {
      setCurrentDate(getCurrentDateKey());
      // Force reload to get fresh content
      window.location.reload();
    };

    initializeDailyReset(handleReset);

    // Cleanup on unmount
    return () => {
      cleanupDailyReset();
    };
  }, []);

  useEffect(() => {
    const updateHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.getBoundingClientRect().height;
        setToolbarOffset(height + 12);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 w-full transition-colors">
      <div className="max-w-4xl mx-auto px-2 sm:px-4 md:px-6 lg:px-0 w-full min-h-screen flex flex-col">
        <div
          ref={headerRef}
          className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-200/70 dark:border-gray-800/70"
        >
          <div className="flex justify-center items-center py-2 relative">
            <Link href="/" aria-label="Return home" className="cursor-pointer">
              <Logo />
            </Link>
            <div className="absolute right-0 flex items-center">
              <ThemeToggle />
            </div>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col">
          <div className="px-2 sm:px-4 mb-3 md:mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            <div className="flex gap-2 sm:gap-3 items-center flex-wrap">
              <Link 
                href="/search" 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all duration-200 hover:scale-105 active:scale-95 touch-target border border-blue-200 dark:border-blue-800"
              >
                <span>🔍</span>
                <span>Search</span>
              </Link>
              <Link 
                href="/history" 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-all duration-200 hover:scale-105 active:scale-95 touch-target border border-purple-200 dark:border-purple-800"
              >
                <span>📚</span>
                <span>History</span>
              </Link>
              <Link 
                href="/stats" 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 transition-all duration-200 hover:scale-105 active:scale-95 touch-target border border-green-200 dark:border-green-800"
              >
                <span>📊</span>
                <span>Stats</span>
              </Link>
              <Link 
                href="/guide" 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-all duration-200 hover:scale-105 active:scale-95 touch-target border border-orange-200 dark:border-orange-800"
              >
                <span>💡</span>
                <span>How to Use</span>
              </Link>
              {user ? (
                <button
                  onClick={signOut}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105 active:scale-95 touch-target border border-gray-300 dark:border-gray-600"
                >
                  <span>🚪</span>
                  <span>Sign Out</span>
                </button>
              ) : (
                <Link 
                  href="/login" 
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all duration-200 hover:scale-105 active:scale-95 touch-target border border-blue-200 dark:border-blue-800"
                >
                  <span>🔑</span>
                  <span>Sign In</span>
                </Link>
              )}
            </div>
          </div>

          <div className="border dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800 w-full flex-1 flex flex-col">
            <TextEditor stickyOffset={toolbarOffset} />
          </div>

          <div className="text-center py-3 md:py-4">
            <Link 
              href="/settings" 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105 active:scale-95 touch-target border border-gray-200 dark:border-gray-700"
            >
              <span>⚙️</span>
              <span>Settings</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

