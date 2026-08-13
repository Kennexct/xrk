'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { translations, type Language } from './i18n';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof translations['id'];
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [lang, setLangState] = useState<Language>('id');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Load stored theme & lang
    const savedTheme = localStorage.getItem('syt_theme') as 'light' | 'dark' | null;
    const savedLang = localStorage.getItem('syt_lang') as Language | null;
    const savedSidebar = localStorage.getItem('syt_sidebar_collapsed');

    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') document.documentElement.classList.add('dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }

    if (savedLang === 'en' || savedLang === 'id') {
      setLangState(savedLang);
    }

    if (savedSidebar === 'true') {
      setSidebarCollapsed(true);
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('syt_theme', next);
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('syt_lang', newLang);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('syt_sidebar_collapsed', String(next));
      return next;
    });
  };

  const t = translations[lang];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        lang,
        setLang,
        t,
        sidebarCollapsed,
        toggleSidebar,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
