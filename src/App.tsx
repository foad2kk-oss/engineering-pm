import React, { useState, Suspense, lazy, useEffect } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { DataProvider, useData } from './contexts/DataContext';
import Layout from './components/Layout';
import Login from './pages/Login';

const Dashboard   = lazy(() => import('./pages/Dashboard'));
const Projects    = lazy(() => import('./pages/Projects'));
const Tasks       = lazy(() => import('./pages/Tasks'));
const Schedule    = lazy(() => import('./pages/Schedule'));
const Meetings    = lazy(() => import('./pages/Meetings'));
const CRM         = lazy(() => import('./pages/CRM'));
const Engineers   = lazy(() => import('./pages/Engineers'));
const Reports     = lazy(() => import('./pages/Reports'));
const AIAssistant = lazy(() => import('./pages/AIAssistant'));
const Settings    = lazy(() => import('./pages/Settings'));

type Page = 'dashboard' | 'projects' | 'tasks' | 'schedule' | 'meetings'
          | 'crm' | 'engineers' | 'reports' | 'ai' | 'settings';

const Loader = () => (
  <div className="flex items-center justify-center h-48">
    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

function AppInner() {
  const { isLoggedIn, loggedInUser } = useApp();
  const { loading } = useData();

  if (loading) return (
    <div className="min-h-screen bg-blue-900 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      <p className="text-white text-sm font-medium">جاري تحميل البيانات...</p>
    </div>
  );
  const [activePage, setActivePage] = useState<Page>('dashboard');

  useEffect(() => {
    const handler = (e: Event) => {
      const page = (e as CustomEvent).detail as Page;
      if (page) setActivePage(page);
    };
    window.addEventListener('pm-navigate', handler);
    return () => window.removeEventListener('pm-navigate', handler);
  }, []);

  // When role is dept-manager, restrict page access
  const canAccess = (page: Page): boolean => {
    const role = loggedInUser?.role;
    if (role === 'admin') return true;
    if (role === 'project-manager') {
      // Project manager cannot see clients
      if (page === 'crm') return false;
      return true;
    }
    if (role === 'department-manager') {
      if (page === 'crm') return false;
      return true;
    }
    return true;
  };

  const navigate = (p: string) => {
    const page = p as Page;
    if (canAccess(page)) setActivePage(page);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':  return <Dashboard />;
      case 'projects':   return <Projects />;
      case 'tasks':      return <Tasks />;
      case 'schedule':   return <Schedule />;
      case 'meetings':   return <Meetings />;
      case 'crm':        return canAccess('crm') ? <CRM /> : <Dashboard />;
      case 'engineers':  return <Engineers />;
      case 'reports':    return <Reports />;
      case 'ai':         return <AIAssistant />;
      case 'settings':   return <Settings />;
      default:           return <Dashboard />;
    }
  };

  if (!isLoggedIn) return <Login />;

  return (
    <Layout activePage={activePage} onNavigate={navigate}>
      <Suspense fallback={<Loader />}>
        {renderPage()}
      </Suspense>
    </Layout>
  );
}

function App() {
  return (
    <AppProvider>
      <DataProvider>
        <AppInner />
      </DataProvider>
    </AppProvider>
  );
}

export default App;
