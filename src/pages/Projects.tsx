import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { useData } from '../contexts/DataContext';
import { Plus, Search, Clock, Calendar, TrendingUp, Trash2, FolderKanban, User, Edit2 } from 'lucide-react';
import { statusConfig, departmentLabels, departmentColors } from '../data/mockData';
import type { Project, Department, ProjectStatus, ProjectType } from '../types';
import Modal from '../components/Modal';

const DEPTS: Department[] = ['architectural','structural','mechanical','electrical'];
const HOURS_PER_DAY = 8.5;

const PROJECT_TYPES: { value: ProjectType; en: string; ar: string }[] = [
  { value: 'factory',     en: 'Factory',              ar: 'مصنع' },
  { value: 'commercial',  en: 'Commercial / Admin',   ar: 'مبنى تجاري / إداري' },
  { value: 'gas-station', en: 'Gas Station',          ar: 'محطة وقود' },
  { value: 'residential', en: 'Residential Building', ar: 'مبنى سكني' },
  { value: 'other',       en: 'Other Project',        ar: 'مشروع آخر' },
];

function getWorkDays(start: string, end: string): number {
  if (!start || !end) return 0;
  let count = 0;
  const d = new Date(start);
  const e = new Date(end);
  while (d <= e) {
    const day = d.getDay();
    if (day !== 5 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

const defaultForm = () => ({
  name: '', nameAr: '',
  projectType: 'other' as ProjectType,
  clientName: '',
  managerId: '',
  department: 'architectural' as Department,
  startDate: '', deadline: '',
  totalHours: 0,
  selectedEngineers: [] as string[],
  priority: 'medium' as const,
  description: '',
});

const Projects: React.FC = () => {
  const { t, language, loggedInUser } = useApp();
  const canEditSchedule = loggedInUser?.role === 'admin' || loggedInUser?.role === 'project-manager';
  const { projects, engineers, addProject, updateProject, deleteProject } = useData();

  // Edit deadline state
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState({ deadline: '', startDate: '', progress: 0, status: 'planning' as ProjectStatus });

  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState<ProjectStatus|'all'>('all');
  const [filterDept,   setFilterDept]   = useState<Department|'all'>('all');
  const [showModal,    setShowModal]    = useState(false);
  const [form,         setForm]         = useState(defaultForm());
  const [generatedTasks, setGeneratedTasks] = useState<string[]>([]);
  const [showPreview,  setShowPreview]  = useState(false);
  const [errors,       setErrors]       = useState<Record<string,string>>({});

  // Exclude project managers from hour distribution
  const deptEngineers = useMemo(
    () => engineers.filter(e => e.department === form.department && e.role !== 'project-manager'),
    [engineers, form.department]
  );

  // Project manager dropdown = project-managers + department-managers
  const projectManagers = useMemo(
    () => engineers.filter(e => e.role === 'project-manager' || e.role === 'department-manager'),
    [engineers]
  );

  const autoCalcHours = useCallback((startDate: string, deadline: string, dept: Department) => {
    const workDays = getWorkDays(startDate, deadline);
    const engCount = engineers.filter(e => e.department === dept && e.role !== 'project-manager').length;
    if (workDays > 0 && engCount > 0) return Math.round(workDays * engCount * HOURS_PER_DAY);
    return 0;
  }, [engineers]);

  const handleDateOrDeptChange = (patch: Partial<typeof form>) => {
    const next = { ...form, ...patch };
    if (next.startDate && next.deadline) {
      next.totalHours = autoCalcHours(next.startDate, next.deadline, next.department);
      next.selectedEngineers = engineers.filter(e => e.department === next.department && e.role !== 'project-manager').map(e => e.id);
    }
    setForm(next);
  };

  const workDays    = getWorkDays(form.startDate, form.deadline);
  const maxCapacity = workDays * (form.selectedEngineers.length || 1) * HOURS_PER_DAY;
  const feasible    = form.totalHours > 0 && form.totalHours <= maxCapacity && form.selectedEngineers.length > 0;

  const validate = () => {
    const errs: Record<string,string> = {};
    if (!form.name.trim()) errs.name = language==='ar'?'مطلوب':'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const generateTasks = () => {
    if (!validate()) return;
    if (!form.startDate || !form.deadline || !form.selectedEngineers.length) {
      saveProject(); return;
    }
    const engObjs = engineers.filter(e => form.selectedEngineers.includes(e.id));
    const hoursPerEng = Math.ceil(form.totalHours / engObjs.length);
    const tasks: string[] = [];
    engObjs.forEach(eng => {
      let remaining = hoursPerEng;
      const day = new Date(form.startDate);
      while (remaining > 0 && day <= new Date(form.deadline)) {
        const dow = day.getDay();
        if (dow !== 5 && dow !== 6 && !eng.vacationDays.includes(day.toISOString().split('T')[0])) {
          const h = Math.min(remaining, HOURS_PER_DAY);
          tasks.push(`${language==='ar'? eng.nameAr||eng.name : eng.name} | ${day.toISOString().split('T')[0]} | ${h}h`);
          remaining -= h;
        }
        day.setDate(day.getDate() + 1);
      }
    });
    setGeneratedTasks(tasks);
    setShowPreview(true);
  };

  const saveProject = () => {
    if (!validate()) return;
    const mgr = engineers.find(e => e.id === form.managerId);
    const newProject: Project = {
      id:            `proj-${Date.now()}`,
      name:          form.name,
      nameAr:        form.nameAr || form.name,
      clientId:      '',
      clientName:    form.clientName,
      department:    form.department,
      startDate:     form.startDate || new Date().toISOString().split('T')[0],
      deadline:      form.deadline  || new Date().toISOString().split('T')[0],
      status:        'planning',
      totalHours:    form.totalHours,
      completedHours: 0,
      engineers:     form.selectedEngineers,
      progress:      0,
      priority:      form.priority,
      description:   form.description,
      projectType:   form.projectType,
      managerId:     form.managerId,
      value:         undefined,
    };
    addProject(newProject);
    setShowModal(false);
    setForm(defaultForm());
    setGeneratedTasks([]);
    setShowPreview(false);
    setErrors({});
  };

  const filtered = useMemo(() => projects.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = (language==='ar'? p.nameAr : p.name).toLowerCase().includes(q) ||
      p.clientName.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchDept   = filterDept   === 'all' || p.department === filterDept;
    return matchSearch && matchStatus && matchDept;
  }), [projects, search, filterStatus, filterDept, language]);

  const openModal = () => {
    setForm(defaultForm());
    setShowPreview(false);
    setErrors({});
    setGeneratedTasks([]);
    setShowModal(true);
  };

  const openEdit = (p: Project) => {
    setEditProject(p);
    setEditForm({ deadline: p.deadline, startDate: p.startDate, progress: p.progress, status: p.status });
  };

  const saveEdit = () => {
    if (!editProject) return;
    const wd = getWorkDays(editForm.startDate, editForm.deadline);
    const engCount = engineers.filter(e => e.department === editProject.department && e.role !== 'project-manager').length;
    updateProject({
      ...editProject,
      startDate:  editForm.startDate,
      deadline:   editForm.deadline,
      progress:   editForm.progress,
      status:     editForm.status as ProjectStatus,
      totalHours: wd > 0 && engCount > 0 ? Math.round(wd * engCount * HOURS_PER_DAY) : editProject.totalHours,
    });
    setEditProject(null);
  };

  const getProjectTypeLabel = (p: Project) => {
    const found = PROJECT_TYPES.find(t => t.value === p.projectType);
    return found ? (language==='ar' ? found.ar : found.en) : '';
  };

  const getManagerName = (p: Project) => {
    if (!p.managerId) return null;
    const m = engineers.find(e => e.id === p.managerId);
    if (!m) return null;
    return language==='ar' ? (m.nameAr||m.name) : m.name;
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('projects')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} {language==='ar'?'مشروع':'projects'}</p>
        </div>
        {canEditSchedule && (
          <button className="btn-primary" onClick={openModal}>
            <Plus size={16}/>{t('newProject')}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input ps-9" placeholder={t('search')} value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="input w-auto" value={filterStatus} onChange={e=>setFilterStatus(e.target.value as any)}>
          <option value="all">{t('all')}</option>
          <option value="on-time">{t('onTime')}</option>
          <option value="at-risk">{t('atRisk')}</option>
          <option value="delayed">{t('delayed')}</option>
          <option value="completed">{t('completed')}</option>
          <option value="planning">{t('planning')}</option>
        </select>
        <select className="input w-auto" value={filterDept} onChange={e=>setFilterDept(e.target.value as any)}>
          <option value="all">{t('all')}</option>
          {DEPTS.map(d=><option key={d} value={d}>{language==='ar'? departmentLabels[d].ar : departmentLabels[d].en}</option>)}
        </select>
      </div>

      {filtered.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-16 text-gray-400">
          <FolderKanban size={40} className="mb-3 opacity-30"/>
          <p className="text-sm font-medium">{language==='ar'?'لا توجد مشاريع بعد':'No projects yet'}</p>
          {canEditSchedule && <button className="btn-primary mt-4 text-xs" onClick={openModal}><Plus size={14}/>{t('newProject')}</button>}
        </div>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(p => {
          const sc       = statusConfig[p.status];
          const dl       = departmentLabels[p.department];
          const barColor = p.status==='delayed'?'bg-red-500':p.status==='at-risk'?'bg-yellow-500':'bg-blue-500';
          const mgrName  = getManagerName(p);
          const typeLabel = getProjectTypeLabel(p);
          return (
            <div key={p.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                    {language==='ar'? p.nameAr : p.name}
                  </h3>
                  {typeLabel && <p className="text-[10px] text-gray-400 mt-0.5">{typeLabel}</p>}
                  {p.clientName && <p className="text-[10px] text-gray-500">{p.clientName}</p>}
                </div>
                <div className="flex items-center gap-1 ms-2">
                  <span className={sc.badge}>{language==='ar'? sc.label.ar : sc.label.en}</span>
                  {canEditSchedule && (
                    <button onClick={()=>openEdit(p)}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600">
                      <Edit2 size={13}/>
                    </button>
                  )}
                  {canEditSchedule && (
                    <button onClick={()=>deleteProject(p.id)}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600">
                      <Trash2 size={13}/>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-[10px] text-white px-2 py-0.5 rounded-full font-medium"
                  style={{background: departmentColors[p.department]}}>
                  {language==='ar'? dl.ar : dl.en}
                </span>
                {mgrName && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                    <User size={9}/>{mgrName}
                  </span>
                )}
                <span className="text-[10px] text-gray-500">
                  {p.engineers.length} {language==='ar'?'مهندس':'eng'}
                </span>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">{t('progress')}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{p.progress}%</span>
                </div>
                <div className="progress-bar">
                  <div className={`progress-fill ${barColor}`} style={{width:`${p.progress}%`}}/>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1"><Clock size={11}/><span>{p.totalHours}h</span></div>
                <div className="flex items-center gap-1"><Calendar size={11}/><span>{p.deadline||'-'}</span></div>
                <div className="flex items-center gap-1"><TrendingUp size={11}/><span>{p.completedHours}h</span></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Project Modal */}
      <Modal
        isOpen={showModal}
        onClose={()=>{ setShowModal(false); setShowPreview(false); }}
        title={t('newProject')}
        maxWidth="max-w-2xl"
        footer={
          <>
            <button className="btn-secondary" onClick={()=>{ setShowModal(false); setShowPreview(false); }}>{t('cancel')}</button>
            {!showPreview
              ? <button className="btn-primary" onClick={generateTasks}>{language==='ar'?'حفظ / توليد مهام':'Save / Generate Tasks'}</button>
              : <button className="btn-primary" onClick={saveProject}>{t('save')}</button>
            }
          </>
        }
      >
        {!showPreview ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* === الحقول الأساسية === */}
            {/* Project name AR */}
            <div>
              <label className="label">{language==='ar'?'اسم المشروع':'Project Name'} <span className="text-red-500">*</span></label>
              <input className={`input ${errors.name?'border-red-400':''}`} dir="rtl"
                value={form.nameAr}
                onChange={e=>setForm({...form, nameAr:e.target.value, name:e.target.value})}
                placeholder={language==='ar'?'مشروع البرج السكني':'Project name'}/>
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            {/* Project name EN */}
            <div>
              <label className="label">{language==='ar'?'اسم المشروع (إنجليزي)':'Project Name (EN)'}</label>
              <input className="input"
                value={form.name}
                onChange={e=>setForm({...form, name:e.target.value})}
                placeholder="Residential Tower Project"/>
            </div>

            {/* Project Type */}
            <div>
              <label className="label">{language==='ar'?'نوع المشروع':'Project Type'} <span className="text-red-500">*</span></label>
              <select className="input" value={form.projectType}
                onChange={e=>setForm({...form, projectType:e.target.value as ProjectType})}>
                {PROJECT_TYPES.map(pt=>(
                  <option key={pt.value} value={pt.value}>
                    {language==='ar'? pt.ar : pt.en}
                  </option>
                ))}
              </select>
            </div>

            {/* Client Name */}
            <div>
              <label className="label">{t('clientName')} <span className="text-gray-400 text-[10px]">({language==='ar'?'اختياري':'optional'})</span></label>
              <input className="input" value={form.clientName}
                onChange={e=>setForm({...form,clientName:e.target.value})}
                placeholder={language==='ar'?'اسم العميل':'Client name'}/>
            </div>

            {/* Project Manager */}
            <div>
              <label className="label">{language==='ar'?'مدير المشروع':'Project Manager'} <span className="text-gray-400 text-[10px]">({language==='ar'?'اختياري':'optional'})</span></label>
              <select className="input" value={form.managerId}
                onChange={e=>setForm({...form,managerId:e.target.value})}>
                <option value="">{language==='ar'?'-- بدون مدير --':'-- None --'}</option>
                {(projectManagers.length > 0 ? projectManagers : engineers).map(e=>(
                  <option key={e.id} value={e.id}>
                    {language==='ar'? e.nameAr||e.name : e.name}
                  </option>
                ))}
              </select>
              {projectManagers.length === 0 && engineers.length > 0 && (
                <p className="text-[10px] text-amber-500 mt-1">
                  {language==='ar'?'لا يوجد مدير مشاريع — يظهر جميع الموظفين':'No PM found — showing all staff'}
                </p>
              )}
            </div>

            {/* Department */}
            <div>
              <label className="label">{t('department')}</label>
              <select className="input" value={form.department}
                onChange={e=>handleDateOrDeptChange({department:e.target.value as Department})}>
                {DEPTS.map(d=><option key={d} value={d}>{language==='ar'? departmentLabels[d].ar : departmentLabels[d].en}</option>)}
              </select>
              {/* Show dept manager */}
              {(()=>{
                const dm = engineers.find(e => e.department===form.department && e.role==='department-manager');
                return dm ? (
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                    <User size={10}/>
                    {language==='ar'?'مدير القسم:':'Dept Manager:'}
                    <strong>{language==='ar'? dm.nameAr||dm.name : dm.name}</strong>
                  </p>
                ) : null;
              })()}
            </div>

            {/* Dates */}
            <div>
              <label className="label">{t('startDate')} <span className="text-gray-400 text-[10px]">({language==='ar'?'اختياري':'optional'})</span></label>
              <input type="date" className="input" value={form.startDate}
                onChange={e=>handleDateOrDeptChange({startDate:e.target.value})}/>
            </div>
            <div>
              <label className="label">{t('deadline')} <span className="text-gray-400 text-[10px]">({language==='ar'?'اختياري':'optional'})</span></label>
              <input type="date" className="input" value={form.deadline}
                onChange={e=>handleDateOrDeptChange({deadline:e.target.value})}/>
            </div>

            {/* Auto-calculated hours */}
            {(form.startDate && form.deadline) && (
              <div>
                <label className="label">
                  {t('totalHours')}
                  <span className="text-[10px] text-blue-500 ms-1 font-normal">
                    ({language==='ar'?'محسوب تلقائياً':'auto-calculated'})
                  </span>
                </label>
                <input type="number" className="input" value={form.totalHours}
                  onChange={e=>setForm({...form,totalHours:+e.target.value})}/>
              </div>
            )}

            {/* Feasibility */}
            {form.startDate && form.deadline && (
              <div className={`sm:col-span-2 p-3 rounded-lg text-xs border ${feasible? 'bg-green-50 dark:bg-green-900/20 border-green-200':'bg-amber-50 dark:bg-amber-900/20 border-amber-200'}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-2">{language==='ar'?'تحليل الجدوى':'Feasibility'}</p>
                <div className="grid grid-cols-3 gap-3 text-gray-600 dark:text-gray-400">
                  <div>{language==='ar'?'أيام العمل':'Work Days'}: <strong>{workDays}</strong></div>
                  <div>{language==='ar'?'مهندسو القسم':'Dept Eng'}: <strong>{deptEngineers.length}</strong></div>
                  <div>{language==='ar'?'الطاقة':'Capacity'}: <strong>{Math.round(maxCapacity)}h</strong></div>
                </div>
                {deptEngineers.length === 0 && (
                  <p className="text-amber-600 mt-2">⚠️ {language==='ar'?'لا يوجد مهندسون في هذا القسم':'No engineers in this department'}</p>
                )}
                {deptEngineers.length > 0 && form.totalHours > maxCapacity && (
                  <p className="text-red-600 mt-2">⚠️ {language==='ar'?'الساعات تتجاوز الطاقة المتاحة':'Hours exceed available capacity'}</p>
                )}
              </div>
            )}

            {/* Engineers selection */}
            {deptEngineers.length > 0 && (
              <div className="sm:col-span-2">
                <label className="label">{t('assignEngineers')}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                  {deptEngineers.map(e=>(
                    <label key={e.id} className="flex items-center gap-2 text-xs cursor-pointer p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <input type="checkbox"
                        checked={form.selectedEngineers.includes(e.id)}
                        onChange={ev=>setForm({...form,
                          selectedEngineers: ev.target.checked
                            ? [...form.selectedEngineers, e.id]
                            : form.selectedEngineers.filter(id=>id!==e.id)
                        })}/>
                      <span className="text-gray-700 dark:text-gray-300 truncate">
                        {language==='ar'? e.nameAr||e.name : e.name}
                      </span>
                      <span className={`ms-auto text-[9px] text-white px-1 rounded ${e.utilization>=90?'bg-red-500':e.utilization>=75?'bg-amber-500':'bg-green-500'}`}>
                        {e.utilization}%
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                {language==='ar'?`المهام المولّدة (${generatedTasks.length})`:`Generated Tasks (${generatedTasks.length})`}
              </h3>
              <button className="text-xs text-blue-600 hover:underline" onClick={()=>setShowPreview(false)}>
                {language==='ar'?'← تعديل':'← Edit'}
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-1">
              {generatedTasks.map((task,i)=>{
                const [eng,date,hours] = task.split(' | ');
                return (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-xs">
                    <span className="font-medium text-blue-600 w-28 truncate">{eng}</span>
                    <span className="text-gray-500 flex-1">{date}</span>
                    <span className="badge-blue">{hours}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Project Modal */}
      <Modal
        isOpen={!!editProject}
        onClose={() => setEditProject(null)}
        title={language === 'ar' ? 'تعديل بيانات المشروع' : 'Edit Project'}
        maxWidth="max-w-md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditProject(null)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</button>
            <button className="btn-primary" onClick={saveEdit}>{language === 'ar' ? 'حفظ التعديل' : 'Save'}</button>
          </>
        }
      >
        {editProject && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 text-sm font-semibold text-blue-800 dark:text-blue-300">
              {language === 'ar' ? editProject.nameAr || editProject.name : editProject.name}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">{language === 'ar' ? 'تاريخ البدء' : 'Start Date'}</label>
                <input type="date" className="input"
                  value={editForm.startDate}
                  onChange={e => setEditForm({ ...editForm, startDate: e.target.value })} />
              </div>
              <div>
                <label className="label">{language === 'ar' ? 'تاريخ التسليم' : 'Deadline'}</label>
                <input type="date" className="input"
                  value={editForm.deadline}
                  onChange={e => setEditForm({ ...editForm, deadline: e.target.value })} />
              </div>
            </div>

            {editForm.startDate && editForm.deadline && (
              <p className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Calendar size={11} />
                {language === 'ar' ? 'أيام العمل:' : 'Work days:'}
                <strong>{getWorkDays(editForm.startDate, editForm.deadline)}</strong>
                {' '}{language === 'ar' ? 'يوم' : 'days'}
              </p>
            )}

            <div>
              <label className="label">{language === 'ar' ? 'نسبة الإنجاز %' : 'Progress %'}</label>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={100} className="flex-1"
                  value={editForm.progress}
                  onChange={e => setEditForm({ ...editForm, progress: Number(e.target.value) })} />
                <span className="text-sm font-bold text-blue-600 w-10 text-end">{editForm.progress}%</span>
              </div>
            </div>

            <div>
              <label className="label">{language === 'ar' ? 'حالة المشروع' : 'Status'}</label>
              <select className="input" value={editForm.status}
                onChange={e => setEditForm({ ...editForm, status: e.target.value as ProjectStatus })}>
                <option value="planning">{language === 'ar' ? 'تخطيط' : 'Planning'}</option>
                <option value="on-time">{language === 'ar' ? 'في الموعد' : 'On Time'}</option>
                <option value="at-risk">{language === 'ar' ? 'في خطر' : 'At Risk'}</option>
                <option value="delayed">{language === 'ar' ? 'متأخر' : 'Delayed'}</option>
                <option value="completed">{language === 'ar' ? 'مكتمل' : 'Completed'}</option>
              </select>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Projects;
