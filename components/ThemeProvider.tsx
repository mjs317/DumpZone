'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { getTheme, setTheme, applyTheme, Theme } from '@/lib/theme';

const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void; mounted: boolean } | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    setMounted(true);
    const currentTheme = getTheme();
    setThemeState(currentTheme);
    applyTheme(currentTheme);
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (typeof window === 'undefined') return;
      if (!localStorage.getItem('dump-zone-theme')) {
        const newTheme = mediaQuery.matches ? 'dark' : 'light';
        setThemeState(newTheme);
        applyTheme(newTheme);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: updateTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

