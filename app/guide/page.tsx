'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';

export const dynamic = 'force-dynamic';

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 w-full transition-colors">
      <div className="max-w-3xl mx-auto px-2 sm:px-4 md:px-6 lg:px-0 py-4 sm:py-6 md:py-8 w-full">
        <div className="flex justify-center items-center py-2 relative mb-4">
          <Link href="/" aria-label="Return to Dump Zone" className="cursor-pointer">
            <Logo />
          </Link>
          <div className="absolute right-0 flex items-center">
            <ThemeToggle />
          </div>
        </div>

        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-200">How to Use DumpZone</h2>
          <Link 
            href="/" 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all duration-200 hover:scale-105 active:scale-95 touch-target border border-blue-200 dark:border-blue-800"
          >
            <span>⬅️</span>
            <span>Back to Dump Zone</span>
          </Link>
        </div>

        <div className="border dark:border-gray-700 rounded-lg p-4 sm:p-6 bg-white dark:bg-gray-800 shadow-sm text-base sm:text-lg leading-relaxed text-gray-800 dark:text-gray-100">
          <p className="mb-4">
            Welcome to DumpZone 💭🚽! The place to shamelessly dump whatever's in your brain, in real time.
          </p>
          
          <p className="mb-4">
            Fire in text, photos, links, half-baked ideas, genius shower thoughts, whatever. As long as you're signed in, your Dump stays synced across all your devices.
          </p>
          
          <p className="mb-4">
            Then like magic, every night at 12:00 AM, today's Dump auto-archives so you wake up to a fresh, empty Dump ready for a brand-new chaos session.
          </p>
          
          <p className="mb-4">
            Want to revisit old brilliance? Hit the History button or hook up a dedicated Notion database to store and organize all your past Dumps.
          </p>
          
          <p className="mb-4">
            Questions, bug reports, feature ideas?
          </p>
          
          <p className="mb-4">
            Drop me a line anytime.
          </p>
          
          <p>
            –{' '}
            <a href="https://solimini.xyz" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-300 underline">
              MJS
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

