'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import { 
  getNotionConfig, 
  initializeNotion, 
  disconnectNotion, 
  isNotionConnected 
} from '@/lib/notion';
import { exportBackup, restoreFromFile } from '@/lib/backup';
import { getHistory } from '@/lib/storage';
import { exportAllAsMarkdown, exportAllAsText, exportAsJSON, exportAsPDF } from '@/lib/export';

export default function SettingsPage() {
  const [notionToken, setNotionToken] = useState('');
  const [notionDatabaseId, setNotionDatabaseId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const connected = isNotionConnected();
    setIsConnected(connected);
    
    if (connected) {
      const config = getNotionConfig();
      setNotionToken(config.token || '');
      setNotionDatabaseId(config.databaseId || '');
    }
  }, []);

  const handleConnect = () => {
    if (!notionToken || !notionDatabaseId) {
      setMessage({ type: 'error', text: 'Please enter both token and database ID' });
      return;
    }

    try {
      initializeNotion(notionToken, notionDatabaseId);
      setIsConnected(true);
      setMessage({ type: 'success', text: 'Successfully connected to Notion!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to connect to Notion' });
    }
  };

  const handleDisconnect = () => {
    disconnectNotion();
    setIsConnected(false);
    setNotionToken('');
    setNotionDatabaseId('');
    setMessage({ type: 'success', text: 'Disconnected from Notion' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleBackup = () => {
    exportBackup();
    setMessage({ type: 'success', text: 'Backup exported successfully!' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = window.confirm(
      'Restoring a backup will replace all current data. Are you sure?'
    );

    if (!confirmed) {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const success = await restoreFromFile(file);
    if (success) {
      setMessage({ type: 'success', text: 'Backup restored successfully! Please refresh the page.' });
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      setMessage({ type: 'error', text: 'Failed to restore backup. Please check the file format.' });
    }
    setTimeout(() => setMessage(null), 5000);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportAll = (format: 'markdown' | 'text' | 'json' | 'pdf') => {
    const entries = getHistory();
    if (entries.length === 0) {
      setMessage({ type: 'error', text: 'No data to export' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      switch (format) {
        case 'markdown':
          exportAllAsMarkdown(entries);
          break;
        case 'text':
          exportAllAsText(entries);
          break;
        case 'json':
          exportAsJSON(entries);
          break;
        case 'pdf':
          exportAsPDF(entries);
          break;
      }
      setMessage({ type: 'success', text: `Exported as ${format.toUpperCase()} successfully!` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export data' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 w-full transition-colors">
      <div className="max-w-2xl mx-auto px-2 sm:px-4 md:px-6 lg:px-0 py-4 sm:py-6 md:py-8 w-full">
        <div className="flex justify-center items-center py-2 relative mb-4">
          <Link href="/" className="cursor-pointer">
            <Logo />
          </Link>
          <div className="absolute right-0 flex items-center">
            <ThemeToggle />
          </div>
        </div>
        
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-200">Settings</h2>
          <Link 
            href="/" 
            className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline touch-target"
          >
            Back to Dump Zone
          </Link>
        </div>

        {message && (
          <div
            className={`mb-4 p-3 rounded text-sm sm:text-base ${
              message.type === 'success' 
                ? 'bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-200' 
                : 'bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Theme Settings */}
        <div className="border dark:border-gray-700 rounded-lg p-3 sm:p-4 md:p-6 shadow-sm bg-white dark:bg-gray-800 mb-4">
          <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800 dark:text-gray-200">Theme</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Select theme:</span>
            <ThemeToggle />
          </div>
        </div>

        {/* Backup & Restore */}
        <div className="border dark:border-gray-700 rounded-lg p-3 sm:p-4 md:p-6 shadow-sm bg-white dark:bg-gray-800 mb-4">
          <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800 dark:text-gray-200">Backup & Restore</h3>
          <div className="space-y-3">
            <button
              onClick={handleBackup}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 active:bg-blue-800 text-sm sm:text-base touch-target min-h-[44px] sm:min-h-0"
            >
              Export Backup (JSON)
            </button>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleRestore}
                className="hidden"
                id="restore-file"
              />
              <label
                htmlFor="restore-file"
                className="inline-block px-4 py-2.5 sm:py-2 bg-green-600 text-white rounded hover:bg-green-700 active:bg-green-800 text-sm sm:text-base touch-target min-h-[44px] sm:min-h-0 cursor-pointer"
              >
                Restore from Backup
              </label>
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="border dark:border-gray-700 rounded-lg p-3 sm:p-4 md:p-6 shadow-sm bg-white dark:bg-gray-800 mb-4">
          <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800 dark:text-gray-200">Export All Data</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => handleExportAll('markdown')}
              className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 touch-target min-h-[44px]"
            >
              Markdown
            </button>
            <button
              onClick={() => handleExportAll('text')}
              className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 touch-target min-h-[44px]"
            >
              Text
            </button>
            <button
              onClick={() => handleExportAll('json')}
              className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 touch-target min-h-[44px]"
            >
              JSON
            </button>
            <button
              onClick={() => handleExportAll('pdf')}
              className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 touch-target min-h-[44px]"
            >
              PDF
            </button>
          </div>
        </div>

        {/* Notion Integration */}
        <div className="border dark:border-gray-700 rounded-lg p-3 sm:p-4 md:p-6 shadow-sm bg-white dark:bg-gray-800">
          <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800 dark:text-gray-200">Notion Integration</h3>
          
          {isConnected ? (
            <div>
              <p className="mb-3 sm:mb-4 text-sm sm:text-base text-green-600 dark:text-green-400">✓ Connected to Notion</p>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2.5 sm:py-2 bg-red-600 text-white rounded hover:bg-red-700 active:bg-red-800 text-sm sm:text-base touch-target min-h-[44px] sm:min-h-0"
              >
                Disconnect Notion
              </button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  Notion Integration Token
                </label>
                <input
                  type="text"
                  value={notionToken}
                  onChange={(e) => setNotionToken(e.target.value)}
                  placeholder="secret_..."
                  className="w-full px-3 py-2.5 sm:py-2 text-sm sm:text-base border dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Get your token from{' '}
                  <a
                    href="https://www.notion.so/my-integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    notion.so/my-integrations
                  </a>
                </p>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  Notion Database ID
                </label>
                <input
                  type="text"
                  value={notionDatabaseId}
                  onChange={(e) => setNotionDatabaseId(e.target.value)}
                  placeholder="database-id-here"
                  className="w-full px-3 py-2.5 sm:py-2 text-sm sm:text-base border dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  The database ID is in the URL when you open your Notion database.
                  Make sure your integration has access to the database.
                </p>
              </div>

              <button
                onClick={handleConnect}
                className="px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 active:bg-blue-800 text-sm sm:text-base touch-target min-h-[44px] sm:min-h-0 w-full sm:w-auto"
              >
                Connect to Notion
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 sm:mt-6 text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center px-2">
          <p>
            When connected, your daily dumps will automatically sync to Notion at midnight.
          </p>
        </div>
      </div>
    </main>
  );
}
