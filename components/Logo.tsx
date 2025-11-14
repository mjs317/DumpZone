'use client';

import { useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import { Theme } from '@/lib/theme';

const taglines = [
  "Where your thoughts take out the trash themselves.",
  "Brain full? Back it up to the dumpster.",
  "Dump first, make sense later.",
  "Because your brain needed a landfill.",
  "Wow, this really is trash.",
  "From brain clutter to dumpster butter.",
  "Trashy ideas welcome.",
  "The internet's friendliest mental dumpster.",
];

export default function Logo() {
  const [isHovered, setIsHovered] = useState(false);
  const [tagline, setTagline] = useState('');
  const { theme } = useTheme();

  useEffect(() => {
    // Randomly select a tagline on mount
    const randomTagline = taglines[Math.floor(Math.random() * taglines.length)];
    setTagline(randomTagline);
  }, []);

  // Get colors based on theme - keep green for light and dark
  const getColors = (currentTheme: Theme) => {
    if (currentTheme === 'light' || currentTheme === 'dark') {
      return {
        light: '#86EFAC', // Light green
        medium: '#6EE7B7', // Medium green
        dark: '#22C55E', // Dark green
        text: currentTheme === 'light' ? '#15803D' : '#86EFAC', // Dark green or light green
      };
    }
    
    switch (currentTheme) {
      case 'blue':
        return {
          light: '#93C5FD', // Light blue
          medium: '#60A5FA', // Medium blue
          dark: '#3B82F6', // Dark blue
          text: '#1E40AF', // Dark blue text
        };
      case 'green':
        return {
          light: '#86EFAC', // Light green
          medium: '#6EE7B7', // Medium green
          dark: '#22C55E', // Dark green
          text: '#15803D', // Dark green text
        };
      case 'purple':
        return {
          light: '#C4B5FD', // Light purple
          medium: '#A78BFA', // Medium purple
          dark: '#8B5CF6', // Dark purple
          text: '#6D28D9', // Dark purple text
        };
      case 'orange':
        return {
          light: '#FCD34D', // Light orange
          medium: '#FBBF24', // Medium orange
          dark: '#F59E0B', // Dark orange
          text: '#D97706', // Dark orange text
        };
      default:
        return {
          light: '#86EFAC',
          medium: '#6EE7B7',
          dark: '#22C55E',
          text: '#15803D',
        };
    }
  };

  const colors = getColors(theme);

  return (
    <div className="text-center py-3 md:py-6 flex flex-col items-center">
      {/* Dumpster Character */}
      <div 
        className="mb-0 cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img
          src="/dumpster-logo.png"
          alt="Dumpzone dumpster logo"
          className={`mx-auto transition-transform duration-300 ${isHovered ? 'scale-110' : 'scale-100'}`}
          style={{ width: '160px', height: '160px', objectFit: 'contain' }}
        />
      </div>
      
      {/* Logo Text - "DumpZone" */}
      <h1 
        className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight transition-colors -mt-2 sm:-mt-3"
        style={{ color: colors.text }}
      >
        DumpZone
      </h1>
      
      {/* Tagline */}
      {tagline && (
        <p 
          className="text-sm sm:text-base md:text-lg mt-2 sm:mt-3 px-4 text-center italic opacity-75 transition-all duration-500 animate-fade-in"
          style={{ color: colors.text }}
        >
          {tagline}
        </p>
      )}
    </div>
  );
}
