import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useData } from '../contexts/DataContext';
import { Building2, LogIn, Eye, EyeOff } from 'lucide-react';
import type { UserRole } from '../types';

const ROLE_OPTIONS: { value: UserRole; ar: string; en: string; icon: string }[] = [
  { value: 'admin',              ar: 'مدير المكتب الهندسي', en: 'Office Manager',    icon: '🏢' },
  { value: 'project-manager',   ar: 'مدير المشاريع',       en: 'Project Manager',   icon: '📋' },
  { value: 'department-manager',ar: 'مدير القسم',           en: 'Department Manager',icon: '👷' },
];

const DEFAULT_PIN = '1234';

function getPin(engineerId: string): string {
  try {
    const pins = JSON.parse(localStorage.getItem('pm_pins') || '{}');
    return pins[engineerId] || DEFAULT_PIN;
  } catch { return DEFAULT_PIN; }
}

const Login: React.FC = () => {
  const { language, setLanguage, login } = useApp();
  const { engineers } = useData();

  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [selectedEngId, setSelectedEngId] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Filter engineers by selected role
  const roleEngineers = useMemo(() => {
    if (!selectedRole) return [];
    if (selectedRole === 'admin') {
      // Office manager = any engineer with role 'admin' or 'general-manager', or first engineer
      return engineers.filter(e => e.role === 'admin' || e.role === 'general-manager' || e.role === 'project-manager');
    }
    return engineers.filter(e => e.role === selectedRole);
  }, [engineers, selectedRole]);

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setSelectedEngId('');
    setError('');
  };

  const handleLogin = () => {
    setError('');
    if (!selectedRole) {
      setError(language === 'ar' ? 'اختر الدور الوظيفي' : 'Select a role');
      return;
    }
    if (roleEngineers.length > 0 && !selectedEngId) {
      setError(language === 'ar' ? 'اختر الاسم' : 'Select your name');
      return;
    }
    const storedPin = getPin(selectedEngId || 'default');
    if (pin !== storedPin) {
      setError(language === 'ar' ? 'كلمة المرور غير صحيحة' : 'Incorrect PIN');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const eng = engineers.find(e => e.id === selectedEngId);
      login({
        engineerId: selectedEngId || 'admin-default',
        name:       eng?.name    || (language === 'ar' ? 'مدير المكتب' : 'Office Manager'),
        nameAr:     eng?.nameAr  || 'مدير المكتب الهندسي',
        role:       selectedRole as UserRole,
        department: eng?.department,
      });
      setLoading(false);
    }, 600);
  };

  const ar = language === 'ar';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 flex items-center justify-center p-4" dir={ar ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-xl mb-4">
            <Building2 size={32} className="text-blue-700" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {ar ? 'الحصان للاستشارات المهنية' : 'Al-Hussan Consulting'}
          </h1>
          <p className="text-blue-200 text-sm mt-1">
            {ar ? 'نظام إدارة المشاريع الهندسية' : 'Engineering Project Management'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 space-y-5">
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {ar ? 'تسجيل الدخول' : 'Sign In'}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {ar ? 'الرمز الافتراضي: 1234' : 'Default PIN: 1234'}
            </p>
          </div>

          {/* Role selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {ar ? 'الدور الوظيفي' : 'Role'}
            </label>
            <div className="grid grid-cols-1 gap-2">
              {ROLE_OPTIONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => handleRoleChange(r.value)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-start transition-all ${
                    selectedRole === r.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="text-2xl">{r.icon}</span>
                  <div>
                    <p className="font-semibold text-sm">{ar ? r.ar : r.en}</p>
                  </div>
                  {selectedRole === r.value && (
                    <span className="ms-auto w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-white" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Name selector — shown when engineers exist for this role */}
          {selectedRole && roleEngineers.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {ar ? 'الاسم' : 'Name'}
              </label>
              <select
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedEngId}
                onChange={e => { setSelectedEngId(e.target.value); setError(''); }}
              >
                <option value="">{ar ? '-- اختر الاسم --' : '-- Select Name --'}</option>
                {roleEngineers.map(e => (
                  <option key={e.id} value={e.id}>
                    {ar ? e.nameAr || e.name : e.name}
                    {e.department ? ` — ${e.department}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* No engineers message for this role */}
          {selectedRole && roleEngineers.length === 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
              {ar
                ? 'لا يوجد موظفون بهذا الدور بعد. أضف موظفاً من صفحة الموظفين أولاً.'
                : 'No staff found with this role. Add staff in the Engineers page first.'}
            </div>
          )}

          {/* PIN */}
          {selectedRole && (roleEngineers.length === 0 || selectedEngId) && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {ar ? 'كلمة المرور (PIN)' : 'PIN / Password'}
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={6}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-widest text-center text-lg"
                  placeholder="••••"
                  value={pin}
                  onChange={e => { setPin(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-red-500 text-xs text-center bg-red-50 dark:bg-red-900/20 rounded-lg py-2 px-3">
              ⚠️ {error}
            </p>
          )}

          {/* Login button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors disabled:opacity-60"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <LogIn size={16} />
            )}
            {ar ? 'دخول' : 'Sign In'}
          </button>

          {/* Language toggle */}
          <div className="text-center">
            <button
              onClick={() => setLanguage(ar ? 'en' : 'ar')}
              className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
            >
              {ar ? 'English' : 'العربية'}
            </button>
          </div>
        </div>

        <p className="text-center text-blue-300 text-xs mt-6 opacity-70">
          {ar ? 'جميع الحقوق محفوظة © 2026' : '© 2026 All Rights Reserved'}
        </p>
      </div>
    </div>
  );
};

export default Login;
