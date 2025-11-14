export type Theme = 'light' | 'dark' | 'blue' | 'green' | 'purple' | 'orange';

const THEME_KEY = 'dump-zone-theme';

export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  
  const stored = localStorage.getItem(THEME_KEY) as Theme;
  if (stored && ['light', 'dark', 'blue', 'green', 'purple', 'orange'].includes(stored)) {
    return stored;
  }
  
  // Check system preference
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  
  return 'light';
}

export function setTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

export function applyTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  
  const html = document.documentElement;
  
  // Remove all theme classes
  const allThemes = ['light', 'dark', 'theme-blue', 'theme-green', 'theme-purple', 'theme-orange'];
  allThemes.forEach(t => html.classList.remove(t));
  
  // Add the selected theme class
  if (theme === 'light') {
    html.classList.add('light');
  } else if (theme === 'dark') {
    html.classList.add('dark');
  } else {
    // For custom themes, ensure dark class is removed and add theme class
    html.classList.remove('dark');
    html.classList.add(`theme-${theme}`);
  }
}

