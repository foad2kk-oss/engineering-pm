import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Language, Theme, UserRole, Department } from '../types';
import { translations } from '../i18n/translations';
import type { TranslationKey } from '../i18n/translations';

export interface LoggedInUser {
  engineerId: string;
  name: string;
  nameAr: string;
  role: UserRole;
  department?: Department;
}

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  t: (key: TranslationKey) => string;
  dir: 'rtl' | 'ltr';
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentUser: { name: string; nameAr: string; role: UserRole; email: string };
  // Auth
  loggedInUser: LoggedInUser | null;
  isLoggedIn: boolean;
  login: (user: LoggedInUser) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

function loadAuth(): LoggedInUser | null {
  try {
    const raw = sessionStorage.getItem('pm_auth');
    return raw ? JSON.parse(raw) as LoggedInUser : null;
  } catch { return null; }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('ar');
  const [theme, setThemeState] = useState<Theme>('light');
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');
  const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(loadAuth);

  const currentUser = {
    name: loggedInUser?.name || 'Ahmed Al-Rashidi',
    nameAr: loggedInUser?.nameAr || 'أحمد الراشدي',
    role: currentRole,
    email: 'admin@engineering.com',
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const login = (user: LoggedInUser) => {
    setLoggedInUser(user);
    sessionStorage.setItem('pm_auth', JSON.stringify(user));
  };

  const logout = () => {
    setLoggedInUser(null);
    sessionStorage.removeItem('pm_auth');
  };

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  useEffect(() => {
    document.documentElement.setAttribute('dir', 'rtl');
    document.documentElement.setAttribute('lang', 'ar');
  }, []);

  return (
    <AppContext.Provider value={{
      language, setLanguage, theme, setTheme, t,
      dir: language === 'ar' ? 'rtl' : 'ltr',
      currentRole, setCurrentRole, currentUser,
      loggedInUser, isLoggedIn: !!loggedInUser,
      login, logout,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
