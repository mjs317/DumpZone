'use client';

import { useTheme } from './ThemeProvider';
import { Theme } from '@/lib/theme';

export default function ThemeToggle() {
  const { theme, setTheme, mounted } = useTheme();

  if (!mounted) {
    return <div className="w-8 h-8" />; // Placeholder to prevent layout shift
  }

  const themes: Theme[] = ['light', 'dark', 'blue', 'green', 'purple', 'orange'];
  
  const getThemeColor = (t: Theme): string => {
    switch (t) {
      case 'light':
        return 'bg-white border-gray-300';
      case 'dark':
        return 'bg-gray-900 border-gray-700';
      case 'blue':
        return 'bg-blue-500 border-blue-400';
      case 'green':
        return 'bg-green-500 border-green-400';
      case 'purple':
        return 'bg-purple-500 border-purple-400';
      case 'orange':
        return 'bg-orange-500 border-orange-400';
      default:
        return 'bg-white border-gray-300';
    }
  };

  const getThemeTitle = (t: Theme): string => {
    switch (t) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'blue':
        return 'Blue';
      case 'green':
        return 'Green';
      case 'purple':
        return 'Purple';
      case 'orange':
        return 'Orange';
      default:
        return 'Theme';
    }
  };

  const handleClick = () => {
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getGlowStyle = (t: Theme): React.CSSProperties => {
    switch (t) {
      case 'light':
        return { boxShadow: '0 0 12px rgba(255, 255, 255, 0.4), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' };
      case 'dark':
        return { boxShadow: '0 0 12px rgba(17, 24, 39, 0.6), 0 4px 6px -1px rgba(0, 0, 0, 0.3)' };
      case 'blue':
        return { boxShadow: '0 0 12px rgba(59, 130, 246, 0.5), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' };
      case 'green':
        return { boxShadow: '0 0 12px rgba(34, 197, 94, 0.5), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' };
      case 'purple':
        return { boxShadow: '0 0 12px rgba(139, 92, 246, 0.5), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' };
      case 'orange':
        return { boxShadow: '0 0 12px rgba(249, 115, 22, 0.5), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' };
      default:
        return { boxShadow: '0 0 12px rgba(156, 163, 175, 0.4), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' };
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`
        w-8 h-8 rounded-full border-2
        ${getThemeColor(theme)}
        hover:scale-110 active:scale-95
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400
        touch-target
        relative
      `}
      style={getGlowStyle(theme)}
      title={`Current theme: ${getThemeTitle(theme)}. Click to switch.`}
      aria-label={`Switch theme. Current: ${getThemeTitle(theme)}`}
    />
  );
}

