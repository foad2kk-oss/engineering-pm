import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useData } from '../contexts/DataContext';
import { Users, Mail, Phone, Plus, Trash2, Edit2 } from 'lucide-react';
import { departmentColors, departmentLabels } from '../data/mockData';
import type { Engineer, Department, UserRole } from '../types';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import Modal from '../components/Modal';

const DEPTS: Department[] = ['architectural','structural','mechanical','electrical'];

const JOB_TITLES = [
  { value: 'senior-engineer', en: 'Senior Engineer',  ar: 'مهندس أول' },
  { value: 'engineer',        en: 'Engineer',          ar: 'مهندس' },
  { value: 'drafter',         en: 'Drafter',           ar: 'رسام' },
];

const ROLES: { value: UserRole; en: string; ar: string }[] = [
  { value: 'project-manager',    en: 'Project Manager',    ar: 'مدير مشاريع' },
  { value: 'department-manager', en: 'Department Manager', ar: 'مدير قسم' },
  { value: 'engineer',           en: 'Engineer',           ar: 'مهندس' },
];

const defaultForm = (): Omit<Engineer,'id'> => ({
  name: '', nameAr: '', department: 'architectural',
  title: 'engineer', titleAr: 'مهندس',
  email: '', phone: '',
  workingHours: 8.5, utilization: 0,
  vacationDays: [], leaveDays: [],
  role: 'engineer' as UserRole,
  projectsCount: 0, completedHours: 0, plannedHours: 0,
});

const Engineers: React.FC = () => {
  const { t, language, loggedInUser } = useApp();
  const myDept = loggedInUser?.role === 'department-manager' ? loggedInUser.department : undefined;
  const { engineers, addEngineer, updateEngineer, deleteEngineer } = useData();

  const [search,      setSearch]      = useState('');
  const [deptFilter,  setDeptFilter]  = useState<Department|'all'>('all');
  const [selected,    setSelected]    = useState<string|null>(null);
  const [showModal,   setShowModal]   = useState(false);
  const [editTarget,  setEditTarget]  = useState<Engineer|null>(null);
  const [form,        setForm]        = useState(defaultForm());
  const [errors,      setErrors]      = useState<Record<string,string>>({});

  const filtered = useMemo(() => engineers.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || (e.nameAr||'').includes(search);
    const matchDept   = deptFilter === 'all' || e.department === deptFilter;
    // Dept manager sees only their dept
    const matchMyDept = myDept ? e.department === myDept : true;
    return matchSearch && matchDept && matchMyDept;
  }), [engineers, search, deptFilter, myDept]);

  const selectedEngineer = useMemo(() => engineers.find(e => e.id === selected), [engineers, selected]);

  const openAdd = () => {
    setEditTarget(null);
    setForm(defaultForm());
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (e: Engineer) => {
    setEditTarget(e);
    setForm({ ...e });
    setErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const errs: Record<string,string> = {};
    if (!form.name.trim()) errs.name = language==='ar'?'مطلوب':'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    // sync titleAr with selected title
    const titleObj = JOB_TITLES.find(j => j.value === form.title) || JOB_TITLES[1];
    const fullForm = { ...form, titleAr: titleObj.ar, title: titleObj.en };
    if (editTarget) {
      updateEngineer({ ...fullForm, id: editTarget.id });
    } else {
      addEngineer({ ...fullForm, id: `eng-${Date.now()}` });
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (selected === id) setSelected(null);
    deleteEngineer(id);
  };

  const getUtilColor = (u: number) =>
    u >= 90 ? 'bg-red-500' : u >= 75 ? 'bg-amber-500' : 'bg-green-500';

  const radarData = selectedEngineer ? [
    { subject: language==='ar'?'الإنتاجية':'Productivity', A: Math.min(100, Math.round(selectedEngineer.utilization * 0.9)) },
    { subject: language==='ar'?'الجودة':'Quality',         A: 85 },
    { subject: language==='ar'?'الوقت':'Time Mgmt',        A: 78 },
    { subject: language==='ar'?'التواصل':'Communication',  A: 90 },
    { subject: language==='ar'?'الابتكار':'Innovation',    A: 72 },
  ] : [];

  const stats = useMemo(() => ({
    total:      engineers.length,
    available:  engineers.filter(e => e.utilization < 85).length,
    overloaded: engineers.filter(e => e.utilization >= 90).length,
    avgUtil:    engineers.length
      ? Math.round(engineers.reduce((s,e)=>s+e.utilization,0)/engineers.length)
      : 0,
  }), [engineers]);

  // resolve display title
  const displayTitle = (e: Engineer, lang: 'ar'|'en') => {
    const found = JOB_TITLES.find(j => j.en === e.title || j.value === e.title);
    if (found) return lang === 'ar' ? found.ar : found.en;
    return lang === 'ar' ? (e.titleAr || e.title) : e.title;
  };

  const displayRole = (e: Engineer, lang: 'ar'|'en') => {
    const found = ROLES.find(r => r.value === e.role);
    return found ? (lang === 'ar' ? found.ar : found.en) : e.role;
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('engineers')}</h1>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16}/>
          {language==='ar'?'إضافة موظف':'Add Staff'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: language==='ar'?'إجمالي الموظفين':'Total Staff',         value: stats.total,      color:'text-gray-900 dark:text-white' },
          { label: language==='ar'?'متاحون':'Available',                    value: stats.available,  color:'text-green-600' },
          { label: language==='ar'?'محمّلون بشكل زائد':'Overloaded',       value: stats.overloaded, color:'text-red-600' },
          { label: language==='ar'?'متوسط الاستخدام':'Avg Utilization',    value: engineers.length?`${stats.avgUtil}%`:'-', color:'text-blue-600' },
        ].map((s,i) => (
          <div key={i} className="card p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <input className="input ps-3" placeholder={t('search')} value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all',...DEPTS] as (Department|'all')[]).map(d => (
            <button key={d} onClick={()=>setDeptFilter(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${deptFilter===d?'bg-blue-600 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
              {d==='all'? t('all') : language==='ar'? departmentLabels[d].ar : departmentLabels[d].en}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Engineers Grid */}
        <div className="lg:col-span-2">
          {filtered.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-16 text-gray-400">
              <Users size={40} className="mb-3 opacity-30"/>
              <p className="text-sm font-medium">{language==='ar'?'لا يوجد موظفون بعد':'No staff yet'}</p>
              <button className="btn-primary mt-4 text-xs" onClick={openAdd}><Plus size={14}/>{language==='ar'?'إضافة موظف':'Add Staff'}</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map(e => {
                const dl = departmentLabels[e.department];
                const isSelected = selected === e.id;
                const isPM = e.role === 'project-manager';
                return (
                  <div key={e.id} onClick={()=>setSelected(isSelected? null : e.id)}
                    className={`card cursor-pointer hover:shadow-md transition-all ${isSelected?'ring-2 ring-blue-500':''}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 relative"
                        style={{background: departmentColors[e.department]}}>
                        {(e.nameAr||e.name).charAt(0)}
                        {isPM && (
                          <span className="absolute -top-1 -end-1 bg-amber-400 text-[8px] text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">م</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {language==='ar'? e.nameAr || e.name : e.name}
                        </h3>
                        <p className="text-[10px] text-gray-500">{displayTitle(e, language)}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-medium" style={{color:departmentColors[e.department]}}>
                            ● {language==='ar'? dl.ar : dl.en}
                          </span>
                          {isPM && (
                            <span className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium">
                              {language==='ar'?'مدير مشاريع':'PM'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={ev=>{ev.stopPropagation(); openEdit(e);}}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600">
                          <Edit2 size={13}/>
                        </button>
                        <button onClick={ev=>{ev.stopPropagation(); handleDelete(e.id);}}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600">
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-gray-500">{language==='ar'?'الاستخدام':'Utilization'}</span>
                        <span className="font-medium">{e.utilization}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className={`progress-fill ${getUtilColor(e.utilization)}`} style={{width:`${e.utilization}%`}}/>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-1.5">
                        <p className="text-gray-500">{language==='ar'?'مشاريع':'Projects'}</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{e.projectsCount}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-1.5">
                        <p className="text-gray-500">{language==='ar'?'منجز':'Done'}</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{e.completedHours}h</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-1.5">
                        <p className="text-gray-500">{language==='ar'?'مخطط':'Planned'}</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{e.plannedHours}h</p>
                      </div>
                    </div>

                    {(e.email || e.phone) && (
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        {e.email && <span className="flex items-center gap-1 text-[10px] text-gray-500 truncate"><Mail size={10}/>{e.email}</span>}
                        {e.phone && <span className="flex items-center gap-1 text-[10px] text-gray-500"><Phone size={10}/>{e.phone}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="card">
          {selectedEngineer ? (
            <div>
              <div className="text-center mb-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-2"
                  style={{background:departmentColors[selectedEngineer.department]}}>
                  {(selectedEngineer.nameAr||selectedEngineer.name).charAt(0)}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {language==='ar'? selectedEngineer.nameAr||selectedEngineer.name : selectedEngineer.name}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">{displayTitle(selectedEngineer, language)}</p>
                <p className="text-xs font-medium mt-0.5" style={{color:departmentColors[selectedEngineer.department]}}>
                  {language==='ar'? departmentLabels[selectedEngineer.department].ar : departmentLabels[selectedEngineer.department].en}
                </p>
                <span className={`text-xs font-bold text-white px-2 py-0.5 rounded-lg mt-1 inline-block ${getUtilColor(selectedEngineer.utilization)}`}>
                  {selectedEngineer.utilization}% {language==='ar'?'مستخدم':'utilized'}
                </span>
              </div>

              <ResponsiveContainer width="100%" height={180}>
                <RadarChart data={radarData}>
                  <PolarGrid/>
                  <PolarAngleAxis dataKey="subject" tick={{fontSize:9}}/>
                  <Radar name="Score" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3}/>
                </RadarChart>
              </ResponsiveContainer>

              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">{language==='ar'?'الدور':'Role'}</span><span className="font-medium">{displayRole(selectedEngineer, language)}</span></div>
                {selectedEngineer.email && <div className="flex justify-between"><span className="text-gray-500">{t('email')}</span><span className="truncate ms-2">{selectedEngineer.email}</span></div>}
                {selectedEngineer.phone && <div className="flex justify-between"><span className="text-gray-500">{t('phone')}</span><span>{selectedEngineer.phone}</span></div>}
                <div className="flex justify-between"><span className="text-gray-500">{language==='ar'?'ساعات/يوم':'Hours/day'}</span><span>{selectedEngineer.workingHours}h</span></div>
              </div>

              <button className="btn-secondary w-full mt-4 justify-center text-xs" onClick={()=>openEdit(selectedEngineer)}>
                <Edit2 size={13}/>{language==='ar'?'تعديل':'Edit'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <Users size={32} className="mb-2 opacity-30"/>
              <p className="text-sm">{language==='ar'?'اختر موظفاً للعرض':'Select a staff member'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={()=>setShowModal(false)}
        title={editTarget
          ? (language==='ar'?'تعديل موظف':'Edit Staff')
          : (language==='ar'?'إضافة موظف جديد':'New Staff Member')}
        maxWidth="max-w-xl"
        footer={
          <>
            <button className="btn-secondary" onClick={()=>setShowModal(false)}>{t('cancel')}</button>
            <button className="btn-primary" onClick={save}>{t('save')}</button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Name AR */}
          <div>
            <label className="label">{language==='ar'?'الاسم (عربي)':'Name (AR)'} <span className="text-red-500">*</span></label>
            <input className={`input ${errors.name?'border-red-400':''}`} dir="rtl"
              value={form.nameAr} onChange={e=>setForm({...form,nameAr:e.target.value,name:e.target.value})}
              placeholder="أحمد محمد"/>
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          {/* Name EN */}
          <div>
            <label className="label">{language==='ar'?'الاسم (إنجليزي)':'Name (EN)'}</label>
            <input className="input"
              value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
              placeholder="Ahmed Mohammed"/>
          </div>
          {/* Job Title dropdown */}
          <div>
            <label className="label">{language==='ar'?'المسمى الوظيفي':'Job Title'} <span className="text-red-500">*</span></label>
            <select className="input" value={form.title}
              onChange={e=>{
                const jt = JOB_TITLES.find(j=>j.en===e.target.value||j.value===e.target.value)||JOB_TITLES[1];
                setForm({...form, title: jt.value, titleAr: jt.ar});
              }}>
              {JOB_TITLES.map(j=>(
                <option key={j.value} value={j.value}>
                  {language==='ar'? j.ar : j.en}
                </option>
              ))}
            </select>
          </div>
          {/* Role */}
          <div>
            <label className="label">{language==='ar'?'الدور':'Role'}</label>
            <select className="input" value={form.role}
              onChange={e=>setForm({...form,role:e.target.value as UserRole})}>
              {ROLES.map(r=>(
                <option key={r.value} value={r.value}>
                  {language==='ar'? r.ar : r.en}
                </option>
              ))}
            </select>
          </div>
          {/* Department */}
          <div>
            <label className="label">{t('department')}</label>
            <select className="input" value={form.department}
              onChange={e=>setForm({...form,department:e.target.value as Department})}>
              {DEPTS.map(d=>(
                <option key={d} value={d}>
                  {language==='ar'? departmentLabels[d].ar : departmentLabels[d].en}
                </option>
              ))}
            </select>
          </div>
          {/* Working Hours */}
          <div>
            <label className="label">{language==='ar'?'ساعات العمل اليومية':'Daily Work Hours'}</label>
            <input type="number" className="input" min="4" max="12" step="0.5"
              value={form.workingHours} onChange={e=>setForm({...form,workingHours:+e.target.value})}/>
          </div>
          {/* Email - optional */}
          <div>
            <label className="label">{t('email')} <span className="text-gray-400 text-[10px]">({language==='ar'?'اختياري':'optional'})</span></label>
            <input type="email" className="input"
              value={form.email} onChange={e=>setForm({...form,email:e.target.value})}
              placeholder="ahmed@office.com"/>
          </div>
          {/* Phone - optional */}
          <div>
            <label className="label">{t('phone')} <span className="text-gray-400 text-[10px]">({language==='ar'?'اختياري':'optional'})</span></label>
            <input type="tel" className="input"
              value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}
              placeholder="+966 5x xxx xxxx"/>
          </div>
          {/* Utilization */}
          <div className="col-span-2">
            <label className="label">{language==='ar'?'نسبة الاستخدام الحالية %':'Current Utilization %'}</label>
            <input type="number" className="input" min="0" max="100"
              value={form.utilization} onChange={e=>setForm({...form,utilization:+e.target.value})}/>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Engineers;
