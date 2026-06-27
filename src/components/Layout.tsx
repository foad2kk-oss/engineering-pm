import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import {
  LayoutDashboard, FolderKanban, CheckSquare, Calendar, Users, Building2,
  Bell, Settings, BarChart3, MessageSquare, Menu, X, Sun, Moon,
  Globe, ChevronDown, Search, LogOut, Briefcase, Bot
} from 'lucide-react';
import { useData } from '../contexts/DataContext';

interface NavItem {
  id: string;
  icon: React.ReactNode;
  labelKey: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', icon: <LayoutDashboard size={18} />, labelKey: 'dashboard' },
  { id: 'projects', icon: <FolderKanban size={18} />, labelKey: 'projects' },
  { id: 'tasks', icon: <CheckSquare size={18} />, labelKey: 'tasks' },
  { id: 'schedule', icon: <BarChart3 size={18} />, labelKey: 'schedule' },
  { id: 'meetings', icon: <Calendar size={18} />, labelKey: 'meetings' },
  { id: 'crm', icon: <Briefcase size={18} />, labelKey: 'crm' },
  { id: 'engineers', icon: <Users size={18} />, labelKey: 'engineers' },
  { id: 'reports', icon: <BarChart3 size={18} />, labelKey: 'reports' },
  { id: 'ai', icon: <Bot size={18} />, labelKey: 'aiAssistant' },
];

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const beepCount = 3;
    for (let i = 0; i < beepCount; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.4, ctx.currentTime + i * 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.4 + 0.3);
      osc.start(ctx.currentTime + i * 0.4);
      osc.stop(ctx.currentTime + i * 0.4 + 0.35);
    }
  } catch {}
}

const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate }) => {
  const { t, language, setLanguage, theme, setTheme, dir, currentUser, loggedInUser, logout } = useApp();
  const { notifications, meetings, engineers } = useData();

  // Show the actual project manager from engineers list if exists
  const pmEngineer = engineers.find(e => e.role === 'project-manager');
  const displayUser = pmEngineer
    ? { name: pmEngineer.name, nameAr: pmEngineer.nameAr || pmEngineer.name }
    : { name: currentUser.name, nameAr: currentUser.nameAr };
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [meetingAlert, setMeetingAlert] = useState<{title:string;time:string}|null>(null);
  const alertedRef = useRef<Set<string>>(new Set());

  const checkMeetings = useCallback(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const nowMins  = now.getHours() * 60 + now.getMinutes();

    meetings.forEach(m => {
      if (m.date !== todayStr) return;
      const [h, min] = m.startTime.split(':').map(Number);
      const meetingMins = h * 60 + min;
      const diff = meetingMins - nowMins;
      // alert when diff is between 29 and 31 minutes (±1 min tolerance)
      if (diff >= 29 && diff <= 31) {
        const key = `${m.id}-${m.date}`;
        if (!alertedRef.current.has(key)) {
          alertedRef.current.add(key);
          playBeep();
          setMeetingAlert({
            title: language==='ar' ? m.titleAr||m.title : m.title,
            time: m.startTime,
          });
          setTimeout(() => setMeetingAlert(null), 8000);
        }
      }
    });
  }, [meetings, language]);

  useEffect(() => {
    checkMeetings();
    const interval = setInterval(checkMeetings, 60000);
    return () => clearInterval(interval);
  }, [checkMeetings]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden`} dir={dir}>

      {/* Meeting Alert Toast */}
      {meetingAlert && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] animate-bounce">
          <div className="bg-amber-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 min-w-72">
            <span className="text-2xl">🔔</span>
            <div>
              <p className="font-bold text-sm">{language==='ar'?'اجتماع بعد 30 دقيقة!':'Meeting in 30 minutes!'}</p>
              <p className="text-xs opacity-90">{meetingAlert.title} — {meetingAlert.time}</p>
            </div>
            <button onClick={()=>setMeetingAlert(null)} className="ms-auto text-white/80 hover:text-white text-lg leading-none">×</button>
          </div>
        </div>
      )}
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} transition-all duration-300 bg-white dark:bg-gray-800 border-e border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0`}>
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building2 size={16} className="text-white" />
              </div>
              <span className="font-bold text-sm text-gray-900 dark:text-white">
                {language === 'ar' ? 'الحصان للاستشارات المهنية' : 'Al-Hussan Consulting'}
              </span>
            </div>
          )}
          {!sidebarOpen && (
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center mx-auto">
              <Building2 size={16} className="text-white" />
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            // Hide CRM from department-manager and project-manager
            if (item.id === 'crm' && (loggedInUser?.role === 'department-manager' || loggedInUser?.role === 'project-manager')) return null;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`sidebar-link w-full ${activePage === item.id ? 'sidebar-link-active' : ''} ${!sidebarOpen ? 'justify-center' : ''}`}
                title={!sidebarOpen ? t(item.labelKey as any) : undefined}
              >
                {item.icon}
                {sidebarOpen && <span>{t(item.labelKey as any)}</span>}
              </button>
            );
          })}
        </nav>

        {/* Settings + Logout */}
        <div className="p-2 border-t border-gray-200 dark:border-gray-700 space-y-0.5">
          <button
            onClick={() => onNavigate('settings')}
            className={`sidebar-link w-full ${activePage === 'settings' ? 'sidebar-link-active' : ''} ${!sidebarOpen ? 'justify-center' : ''}`}
          >
            <Settings size={18} />
            {sidebarOpen && <span>{t('settings')}</span>}
          </button>
          <button
            onClick={logout}
            className={`sidebar-link w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 ${!sidebarOpen ? 'justify-center' : ''}`}
            title={language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
          >
            <LogOut size={18} />
            {sidebarOpen && <span>{language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            {/* Search */}
            <div className="relative hidden md:flex items-center">
              <Search size={15} className="absolute start-3 text-gray-400" />
              <input
                type="text"
                placeholder={t('search')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="ps-9 pe-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center gap-1 text-xs font-medium"
            >
              <Globe size={16} />
              <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
            </button>

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            >
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 relative"
              >
                <Bell size={17} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -end-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute top-10 end-0 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 fade-in">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">{t('notifications')}</span>
                    <span className="text-xs text-blue-600">{language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all read'}</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.slice(0, 5).map(n => (
                      <div key={n.id} className={`p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                        <div className="flex gap-2">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? 'bg-blue-500' : 'bg-gray-300'}`} />
                          <div>
                            <p className="text-xs font-medium text-gray-900 dark:text-white">{language === 'ar' ? n.titleAr : n.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{language === 'ar' ? n.messageAr : n.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-2">
                    <button onClick={() => { onNavigate('notifications'); setNotifOpen(false); }} className="w-full text-center text-xs text-blue-600 hover:text-blue-700 py-1">
                      {language === 'ar' ? 'عرض جميع الإشعارات' : 'View all notifications'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Company name */}
            <div className="hidden sm:flex flex-col items-end ps-2 border-s border-gray-200 dark:border-gray-700 me-1">
              <p className="text-xs font-bold text-blue-700 dark:text-blue-400 leading-tight">
                {language === 'ar' ? 'الحصان للاستشارات المهنية' : 'Al-Hussan Consulting'}
              </p>
              <p className="text-[10px] text-gray-400 leading-tight">
                {language === 'ar' ? 'إدارة المشاريع الهندسية' : 'Engineering PM'}
              </p>
            </div>

            {/* User + logout */}
            <div className="flex items-center gap-2 ps-2 border-s border-gray-200 dark:border-gray-700">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {(language === 'ar' ? (loggedInUser?.nameAr || displayUser.nameAr) : (loggedInUser?.name || displayUser.name)).charAt(0) || 'م'}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">
                  {language === 'ar' ? (loggedInUser?.nameAr || displayUser.nameAr) : (loggedInUser?.name || displayUser.name)}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                  {language === 'ar'
                    ? loggedInUser?.role === 'admin' ? 'مدير المكتب الهندسي'
                      : loggedInUser?.role === 'project-manager' ? 'مدير المشاريع'
                      : loggedInUser?.role === 'department-manager' ? 'مدير القسم'
                      : 'موظف'
                    : loggedInUser?.role === 'admin' ? 'Office Manager'
                      : loggedInUser?.role === 'project-manager' ? 'Project Manager'
                      : loggedInUser?.role === 'department-manager' ? 'Dept Manager'
                      : 'Staff'}
                </p>
              </div>
              <button onClick={logout} title={language === 'ar' ? 'خروج' : 'Logout'}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-5">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
