import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Sun, Moon, Globe, Shield, Building, Bell, KeyRound, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

const DEFAULT_PIN = '1234';

function getPin(engineerId: string): string {
  try {
    const pins = JSON.parse(localStorage.getItem('pm_pins') || '{}');
    return pins[engineerId] || DEFAULT_PIN;
  } catch { return DEFAULT_PIN; }
}

function savePin(engineerId: string, pin: string) {
  try {
    const pins = JSON.parse(localStorage.getItem('pm_pins') || '{}');
    pins[engineerId] = pin;
    localStorage.setItem('pm_pins', JSON.stringify(pins));
  } catch {}
}

const Settings: React.FC = () => {
  const { language, setLanguage, theme, setTheme, currentRole, setCurrentRole, loggedInUser } = useApp();

  // Change PIN state
  const [currentPin,  setCurrentPin]  = useState('');
  const [newPin,      setNewPin]      = useState('');
  const [confirmPin,  setConfirmPin]  = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pinStatus,   setPinStatus]   = useState<'idle'|'success'|'error'>('idle');
  const [pinMsg,      setPinMsg]      = useState('');

  const ar = language === 'ar';

  const handleChangePin = () => {
    setPinStatus('idle');
    const engId = loggedInUser?.engineerId || 'default';
    const storedPin = getPin(engId);

    if (currentPin !== storedPin) {
      setPinStatus('error');
      setPinMsg(ar ? 'كلمة المرور الحالية غير صحيحة' : 'Current PIN is incorrect');
      return;
    }
    if (newPin.length < 4) {
      setPinStatus('error');
      setPinMsg(ar ? 'كلمة المرور الجديدة يجب أن تكون 4 أرقام على الأقل' : 'New PIN must be at least 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setPinStatus('error');
      setPinMsg(ar ? 'كلمة المرور الجديدة غير متطابقة' : 'New PINs do not match');
      return;
    }

    savePin(engId, newPin);
    setPinStatus('success');
    setPinMsg(ar ? 'تم تغيير كلمة المرور بنجاح' : 'PIN changed successfully');
    setCurrentPin(''); setNewPin(''); setConfirmPin('');
    setTimeout(() => setPinStatus('idle'), 4000);
  };

  const roles = [
    { value: 'admin',              label: { en: 'Admin',              ar: 'مدير النظام' } },
    { value: 'general-manager',    label: { en: 'General Manager',    ar: 'المدير العام' } },
    { value: 'project-manager',    label: { en: 'Project Manager',    ar: 'مدير المشاريع' } },
    { value: 'department-manager', label: { en: 'Department Manager', ar: 'مدير القسم' } },
    { value: 'engineer',           label: { en: 'Engineer',           ar: 'مهندس' } },
    { value: 'sales-manager',      label: { en: 'Sales Manager',      ar: 'مدير المبيعات' } },
  ];

  return (
    <div className="space-y-6 fade-in max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">
        {ar ? 'الإعدادات' : 'Settings'}
      </h1>

      {/* Appearance */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Sun size={16} />
          {ar ? 'المظهر' : 'Appearance'}
        </h2>
        <div>
          <label className="label">{ar ? 'السمة' : 'Theme'}</label>
          <div className="flex gap-3">
            <button onClick={() => setTheme('light')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all ${theme === 'light' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}>
              <Sun size={16} />{ar ? 'فاتح' : 'Light'}
            </button>
            <button onClick={() => setTheme('dark')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all ${theme === 'dark' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}>
              <Moon size={16} />{ar ? 'داكن' : 'Dark'}
            </button>
          </div>
        </div>
        <div>
          <label className="label">{ar ? 'اللغة' : 'Language'}</label>
          <div className="flex gap-3">
            <button onClick={() => setLanguage('ar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all ${language === 'ar' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}>
              <Globe size={16} />العربية (RTL)
            </button>
            <button onClick={() => setLanguage('en')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all ${language === 'en' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}>
              <Globe size={16} />English (LTR)
            </button>
          </div>
        </div>
      </div>

      {/* Change PIN */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <KeyRound size={16} />
          {ar ? 'تغيير كلمة المرور (PIN)' : 'Change PIN / Password'}
        </h2>

        {loggedInUser && (
          <p className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
            {ar ? 'الحساب الحالي:' : 'Current account:'}{' '}
            <strong className="text-blue-600">{ar ? loggedInUser.nameAr : loggedInUser.name}</strong>
          </p>
        )}

        <div className="space-y-3">
          {/* Current PIN */}
          <div>
            <label className="label">{ar ? 'كلمة المرور الحالية' : 'Current PIN'}</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={8}
                className="input pe-10 tracking-widest"
                placeholder="••••"
                value={currentPin}
                onChange={e => setCurrentPin(e.target.value)}
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCurrent ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
          </div>

          {/* New PIN */}
          <div>
            <label className="label">{ar ? 'كلمة المرور الجديدة' : 'New PIN'}</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={8}
                className="input pe-10 tracking-widest"
                placeholder="••••"
                value={newPin}
                onChange={e => setNewPin(e.target.value)}
              />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
          </div>

          {/* Confirm PIN */}
          <div>
            <label className="label">{ar ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New PIN'}</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={8}
                className="input pe-10 tracking-widest"
                placeholder="••••"
                value={confirmPin}
                onChange={e => setConfirmPin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleChangePin()}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
          </div>
        </div>

        {/* Status message */}
        {pinStatus !== 'idle' && (
          <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
            pinStatus === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
          }`}>
            {pinStatus === 'success' ? <CheckCircle size={15}/> : <AlertCircle size={15}/>}
            {pinMsg}
          </div>
        )}

        <button onClick={handleChangePin} className="btn-primary">
          <KeyRound size={14}/>
          {ar ? 'تغيير كلمة المرور' : 'Change PIN'}
        </button>
      </div>

      {/* User Role */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Shield size={16} />
          {ar ? 'دور المستخدم (للتجربة)' : 'User Role (Demo)'}
        </h2>
        <p className="text-xs text-gray-500">
          {ar ? 'غيّر الدور لتجربة أذونات مختلفة' : 'Switch role to preview different permissions'}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {roles.map(r => (
            <button key={r.value} onClick={() => setCurrentRole(r.value as any)}
              className={`px-3 py-2 rounded-lg border text-sm text-start transition-all ${currentRole === r.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'}`}>
              {ar ? r.label.ar : r.label.en}
            </button>
          ))}
        </div>
      </div>

      {/* Office Info */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Building size={16} />
          {ar ? 'معلومات المكتب' : 'Office Information'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label">{ar ? 'اسم المكتب' : 'Office Name'}</label><input className="input" defaultValue="الحصان للاستشارات المهنية" /></div>
          <div><label className="label">{ar ? 'البريد الإلكتروني' : 'Email'}</label><input className="input" type="email" defaultValue="info@engineering.com" /></div>
          <div><label className="label">{ar ? 'الهاتف' : 'Phone'}</label><input className="input" defaultValue="+966 11 234 5678" /></div>
          <div><label className="label">{ar ? 'المدينة' : 'City'}</label><input className="input" defaultValue="الرياض، المملكة العربية السعودية" /></div>
        </div>
        <button className="btn-primary">{ar ? 'حفظ التغييرات' : 'Save Changes'}</button>
      </div>

      {/* Work Settings */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Bell size={16} />
          {ar ? 'إعدادات العمل' : 'Work Settings'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div><label className="label">{ar ? 'بداية العمل' : 'Work Start'}</label><input type="time" className="input" defaultValue="08:00" /></div>
          <div><label className="label">{ar ? 'نهاية العمل' : 'Work End'}</label><input type="time" className="input" defaultValue="17:00" /></div>
          <div><label className="label">{ar ? 'ساعات/يوم' : 'Hours/Day'}</label><input type="number" className="input" defaultValue="8.5" step="0.5" /></div>
        </div>
        <p className="text-xs text-gray-500">{ar ? 'أيام العطلة: الجمعة والسبت' : 'Weekend: Friday & Saturday'}</p>
      </div>
    </div>
  );
};

export default Settings;
