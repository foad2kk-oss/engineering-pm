import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useData } from '../contexts/DataContext';
import { Building2, LogIn, Eye, EyeOff } from 'lucide-react';
import type { UserRole, Department } from '../types';

const ROLE_OPTIONS: { value: UserRole; ar: string; en: string; icon: string }[] = [
  { value: 'admin',              ar: 'مدير المكتب الهندسي', en: 'Office Manager',    icon: '🏢' },
  { value: 'project-manager',   ar: 'مدير المشاريع',       en: 'Project Manager',   icon: '📋' },
  { value: 'department-manager',ar: 'مدير القسم',           en: 'Department Manager',icon: '👷' },
];

const DEPARTMENTS: { value: Department; ar: string }[] = [
  { value: 'architectural', ar: 'معماري' },
  { value: 'structural',    ar: 'إنشائي' },
  { value: 'mechanical',    ar: 'ميكانيكا' },
  { value: 'electrical',    ar: 'كهربا' },
];

const DEFAULT_PIN = '1234';

function getPin(key: string): string {
  try {
    const pins = JSON.parse(localStorage.getItem('pm_pins') || '{}');
    return pins[key] || DEFAULT_PIN;
  } catch { return DEFAULT_PIN; }
}

const Login: React.FC = () => {
  const { language, setLanguage, login } = useApp();
  const { engineers } = useData();

  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [selectedEngId, setSelectedEngId] = useState('');
  const [selectedDept, setSelectedDept] = useState<Department | ''>('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isDeptManager = selectedRole === 'department-manager';

  // Engineers list for admin/project-manager
  const roleEngineers = useMemo(() => {
    if (!selectedRole || isDeptManager) return [];
    if (selectedRole === 'admin')
      return engineers.filter(e => e.role === 'admin' || e.role === 'general-manager' || e.role === 'project-manager');
    return engineers.filter(e => e.role === selectedRole);
  }, [engineers, selectedRole, isDeptManager]);

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setSelectedEngId('');
    setSelectedDept('');
    setPin('');
    setError('');
  };

  const handleLogin = () => {
    setError('');
    if (!selectedRole) {
      setError('اختر الدور الوظيفي');
      return;
    }

    if (isDeptManager) {
      if (!selectedDept) { setError('اختر القسم'); return; }
      const pinKey = `dept-${selectedDept}`;
      if (pin !== getPin(pinKey)) { setError('كلمة المرور غير صحيحة'); return; }
      const deptLabel = DEPARTMENTS.find(d => d.value === selectedDept)?.ar || selectedDept;
      setLoading(true);
      setTimeout(() => {
        login({
          engineerId: pinKey,
          name: `مدير قسم ${deptLabel}`,
          nameAr: `مدير قسم ${deptLabel}`,
          role: 'department-manager',
          department: selectedDept as Department,
        });
        setLoading(false);
      }, 600);
      return;
    }

    if (roleEngineers.length > 0 && !selectedEngId) {
      setError('اختر الاسم'); return;
    }
    const storedPin = getPin(selectedEngId || 'default');
    if (pin !== storedPin) { setError('كلمة المرور غير صحيحة'); return; }

    setLoading(true);
    setTimeout(() => {
      const eng = engineers.find(e => e.id === selectedEngId);
      login({
        engineerId: selectedEngId || 'admin-default',
        name:   eng?.name   || 'مدير المكتب',
        nameAr: eng?.nameAr || 'مدير المكتب الهندسي',
        role:   selectedRole as UserRole,
        department: eng?.department,
      });
      setLoading(false);
    }, 600);
  };

  const ar = language === 'ar';
  const showPinField = selectedRole && (isDeptManager ? !!selectedDept : (roleEngineers.length === 0 || !!selectedEngId));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-xl mb-4">
            <Building2 size={32} className="text-blue-700" />
          </div>
          <h1 className="text-2xl font-bold text-white">الحصان للاستشارات المهنية</h1>
          <p className="text-blue-200 text-sm mt-1">نظام إدارة المشاريع الهندسية</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 space-y-5">
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">تسجيل الدخول</h2>
            <p className="text-xs text-gray-500 mt-1">الرمز الافتراضي: 1234</p>
          </div>

          {/* Role selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">الدور الوظيفي</label>
            <div className="grid grid-cols-1 gap-2">
              {ROLE_OPTIONS.map(r => (
                <button key={r.value} onClick={() => handleRoleChange(r.value)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-start transition-all ${
                    selectedRole === r.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 text-gray-700 dark:text-gray-300'
                  }`}>
                  <span className="text-2xl">{r.icon}</span>
                  <p className="font-semibold text-sm">{r.ar}</p>
                  {selectedRole === r.value && (
                    <span className="ms-auto w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-white" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Department dropdown for dept-manager */}
          {isDeptManager && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">القسم</label>
              <select className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedDept} onChange={e => { setSelectedDept(e.target.value as Department); setError(''); }}>
                <option value="">-- اختر القسم --</option>
                {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.ar}</option>)}
              </select>
            </div>
          )}

          {/* Name selector for admin/project-manager */}
          {!isDeptManager && selectedRole && roleEngineers.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">الاسم</label>
              <select className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedEngId} onChange={e => { setSelectedEngId(e.target.value); setError(''); }}>
                <option value="">-- اختر الاسم --</option>
                {roleEngineers.map(e => (
                  <option key={e.id} value={e.id}>{e.nameAr || e.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* PIN */}
          {showPinField && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">كلمة المرور (PIN)</label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric" maxLength={6}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-widest text-center text-lg"
                  placeholder="••••" value={pin}
                  onChange={e => { setPin(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
                <button type="button" onClick={() => setShowPin(!showPin)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-500 text-xs text-center bg-red-50 dark:bg-red-900/20 rounded-lg py-2 px-3">⚠️ {error}</p>
          )}

          <button onClick={handleLogin} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors disabled:opacity-60">
            {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <LogIn size={16} />}
            دخول
          </button>

          <div className="text-center">
            <button onClick={() => setLanguage(ar ? 'en' : 'ar')} className="text-xs text-gray-400 hover:text-blue-600 transition-colors">
              {ar ? 'English' : 'العربية'}
            </button>
          </div>
        </div>

        <p className="text-center text-blue-300 text-xs mt-6 opacity-70">جميع الحقوق محفوظة © 2026</p>
      </div>
    </div>
  );
};

export default Login;
