import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useData } from '../contexts/DataContext';
import { Calendar, ChevronLeft, ChevronRight, Briefcase, User, Clock } from 'lucide-react';
import { departmentColors, departmentLabels } from '../data/mockData';
import type { Department } from '../types';

const DEPTS: Department[] = ['architectural', 'structural', 'mechanical', 'electrical'];

function isWorkDay(dateStr: string): boolean {
  const d = new Date(dateStr + 'T12:00:00');
  return d.getDay() !== 5 && d.getDay() !== 6;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function formatDate(dateStr: string, lang: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(
    lang === 'ar' ? 'ar-SA' : 'en-US',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  );
}

function workDaysBetween(start: string, end: string): number {
  let count = 0;
  const d = new Date(start + 'T12:00:00');
  const e = new Date(end + 'T12:00:00');
  while (d <= e) {
    if (d.getDay() !== 5 && d.getDay() !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

type EngTask = {
  engineerId: string;
  engineerName: string;
  engineerNameAr: string;
  jobTitle: string;
  department: Department;
  projects: {
    projectId: string;
    projectName: string;
    projectNameAr: string;
    hours: number;
    progress: number;
    deadline: string;
    status: string;
  }[];
};

const Tasks: React.FC = () => {
  const { language, loggedInUser } = useApp();
  const { projects, engineers } = useData();

  // Dept manager sees only their dept
  const myDept = loggedInUser?.role === 'department-manager' ? loggedInUser.department : undefined;

  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [filterDept, setFilterDept] = useState<Department | 'all'>('all');

  const isHoliday = !isWorkDay(selectedDate);
  const isToday = selectedDate === today;

  // Build per-engineer task list for the selected day
  const engTasks = useMemo<EngTask[]>(() => {
    if (isHoliday) return [];

    const map = new Map<string, EngTask>();

    projects.forEach(p => {
      if (p.status === 'completed') return;
      if (!p.deadline) return;
      // Dept manager: only see their dept's projects
      if (myDept && p.department !== myDept) return;
      const start = p.startDate || '2000-01-01';
      if (selectedDate < start || selectedDate > p.deadline) return;

      const wdTotal = workDaysBetween(start, p.deadline);

      const assignedIds = p.engineers ?? [];
      let assigned = engineers.filter(
        e => assignedIds.includes(e.id) && e.role !== 'project-manager'
      );
      if (assigned.length === 0) {
        assigned = engineers.filter(
          e => e.department === p.department && e.role !== 'project-manager'
        );
      }
      // Dept manager: only see engineers in their dept
      if (myDept) {
        assigned = assigned.filter(e => e.department === myDept);
      }
      if (assigned.length === 0) return;

      // Hours per engineer per day = fixed 8.5h (total = workDays × engineers × 8.5)
      const hoursPerEng = 8.5;

      assigned.forEach(eng => {
        if (!map.has(eng.id)) {
          map.set(eng.id, {
            engineerId: eng.id,
            engineerName: eng.name,
            engineerNameAr: eng.nameAr || eng.name,
            jobTitle: eng.title || eng.titleAr || '',
            department: eng.department,
            projects: [],
          });
        }
        map.get(eng.id)!.projects.push({
          projectId:      p.id,
          projectName:    p.name,
          projectNameAr:  p.nameAr || p.name,
          hours:          hoursPerEng,
          progress:       p.progress,
          deadline:       p.deadline,
          status:         p.status,
        });
      });
    });

    return Array.from(map.values());
  }, [projects, engineers, selectedDate, isHoliday]);

  const filtered = useMemo(() =>
    filterDept === 'all' ? engTasks : engTasks.filter(e => e.department === filterDept),
    [engTasks, filterDept]
  );

  // Group by department
  const byDept = useMemo(() => {
    const m = new Map<Department, EngTask[]>();
    DEPTS.forEach(d => m.set(d, []));
    filtered.forEach(e => m.get(e.department)?.push(e));
    return m;
  }, [filtered]);

  const totalStaff = filtered.length;
  const totalHours = filtered.reduce((s, e) => s + e.projects.reduce((ss, p) => ss + p.hours, 0), 0);
  const activeDepts = DEPTS.filter(d => (byDept.get(d)?.length ?? 0) > 0);

  return (
    <div className="space-y-4 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {language === 'ar' ? 'المهام اليومية' : 'Daily Tasks'}
        </h1>
        <select
          className="input w-auto text-xs py-1.5"
          value={filterDept}
          onChange={e => setFilterDept(e.target.value as Department | 'all')}
        >
          <option value="all">{language === 'ar' ? 'جميع الأقسام' : 'All Departments'}</option>
          {DEPTS.map(d => (
            <option key={d} value={d}>
              {language === 'ar' ? departmentLabels[d].ar : departmentLabels[d].en}
            </option>
          ))}
        </select>
      </div>

      {/* Date navigator */}
      <div className="card p-3">
        <div className="flex items-center gap-2 justify-between">
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
          >
            {language === 'ar' ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>

          <div className="flex-1 text-center">
            <input
              type="date"
              className="input text-center font-semibold text-sm w-auto mb-1"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
            <p className="text-xs text-gray-500">{formatDate(selectedDate, language)}</p>
            <div className="flex items-center justify-center gap-2 mt-1">
              {isToday && (
                <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-full font-semibold">
                  {language === 'ar' ? 'اليوم' : 'Today'}
                </span>
              )}
              {isHoliday && (
                <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded-full font-semibold">
                  {language === 'ar' ? 'عطلة' : 'Weekend'}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
          >
            {language === 'ar' ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      </div>

      {/* Stats row */}
      {!isHoliday && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{totalStaff}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{language === 'ar' ? 'موظف يعمل' : 'Working'}</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{Math.round(totalHours)}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{language === 'ar' ? 'ساعة إجمالي' : 'Total Hours'}</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">{activeDepts.length}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{language === 'ar' ? 'أقسام نشطة' : 'Active Depts'}</p>
          </div>
        </div>
      )}

      {/* Weekend */}
      {isHoliday && (
        <div className="card flex flex-col items-center justify-center py-16 text-gray-400">
          <span className="text-5xl mb-3">🏖️</span>
          <p className="text-sm font-medium">{language === 'ar' ? 'يوم عطلة' : 'Weekend'}</p>
          <p className="text-xs mt-1 opacity-60">{language === 'ar' ? 'الجمعة والسبت أيام إجازة' : 'Friday & Saturday are days off'}</p>
        </div>
      )}

      {/* No data */}
      {!isHoliday && projects.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-16 text-gray-400">
          <Briefcase size={40} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">{language === 'ar' ? 'لا توجد مشاريع' : 'No projects yet'}</p>
          <p className="text-xs mt-1 opacity-60">{language === 'ar' ? 'أضف مشاريع لتظهر المهام تلقائياً' : 'Add projects to auto-generate daily tasks'}</p>
        </div>
      )}

      {!isHoliday && projects.length > 0 && totalStaff === 0 && (
        <div className="card flex flex-col items-center justify-center py-12 text-gray-400">
          <Calendar size={36} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">{language === 'ar' ? 'لا توجد مهام في هذا اليوم' : 'No tasks on this day'}</p>
          <p className="text-xs mt-1 opacity-60">{language === 'ar' ? 'لا يوجد مشاريع نشطة في هذا التاريخ' : 'No active projects on this date'}</p>
        </div>
      )}

      {/* Tasks by department */}
      {!isHoliday && totalStaff > 0 && DEPTS.map(dept => {
        const list = byDept.get(dept) ?? [];
        if (list.length === 0) return null;
        const color = departmentColors[dept];
        const dl = departmentLabels[dept];
        const dHours = list.reduce((s, e) => s + e.projects.reduce((ss, p) => ss + p.hours, 0), 0);

        return (
          <div key={dept} className="card overflow-hidden p-0">
            {/* Dept header */}
            <div className="flex items-center justify-between px-4 py-2.5 text-white" style={{ background: color }}>
              <span className="font-bold text-sm">
                {language === 'ar' ? dl.ar : dl.en}
                <span className="ms-2 text-[11px] bg-white/20 px-2 py-0.5 rounded-full">
                  {list.length} {language === 'ar' ? 'موظف' : 'staff'}
                </span>
              </span>
              <span className="flex items-center gap-1 text-xs text-white/90">
                <Clock size={12} />
                {Math.round(dHours)}h
              </span>
            </div>

            {/* Engineers list */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {list.map(eng => (
                <div key={eng.engineerId} className="p-3">
                  {/* Engineer row */}
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                      style={{ background: color }}
                    >
                      {(language === 'ar' ? eng.engineerNameAr : eng.engineerName).charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {language === 'ar' ? eng.engineerNameAr : eng.engineerName}
                      </p>
                      {eng.jobTitle && (
                        <p className="text-[11px] text-gray-400 flex items-center gap-1">
                          <User size={10} />
                          {eng.jobTitle}
                        </p>
                      )}
                    </div>
                    <div className="text-end flex-shrink-0">
                      <p className="text-sm font-bold text-blue-600">
                        {Math.round(eng.projects.reduce((s, p) => s + p.hours, 0) * 10) / 10}h
                      </p>
                      <p className="text-[10px] text-gray-400">{language === 'ar' ? 'اليوم' : 'today'}</p>
                    </div>
                  </div>

                  {/* Project cards for this engineer */}
                  <div className="space-y-1.5 ps-3 border-s-2 ms-5" style={{ borderColor: color + '60' }}>
                    {eng.projects.map(proj => (
                      <div
                        key={proj.projectId}
                        className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2"
                      >
                        <Briefcase size={13} className="flex-shrink-0 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">
                            {language === 'ar' ? proj.projectNameAr : proj.projectName}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {language === 'ar' ? 'التسليم:' : 'Due:'} {proj.deadline}
                          </p>
                        </div>
                        {/* Progress */}
                        <div className="flex-shrink-0 flex items-center gap-1.5">
                          <div className="w-14 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${proj.progress}%`, background: color }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-500 w-6">{proj.progress}%</span>
                        </div>
                        <div className="flex-shrink-0 text-end">
                          <span className="text-[11px] font-bold text-blue-600">{proj.hours}h</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Tasks;
