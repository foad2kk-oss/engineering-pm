import React, { useMemo, useRef, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useData } from '../contexts/DataContext';
import { statusConfig, departmentColors, departmentLabels } from '../data/mockData';
import { BarChart3, Printer, Table2, X, Calendar, Clock } from 'lucide-react';
import type { Department } from '../types';

const YEAR  = 2026;
const START_REF = new Date(`${YEAR}-01-01`).getTime();
const YEAR_DAYS = 365;

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  i,
  days: new Date(YEAR, i + 1, 0).getDate(),
}));

const statusHex: Record<string, string> = {
  'on-time': '#22c55e', 'at-risk': '#eab308',
  'delayed': '#ef4444', 'completed': '#60a5fa', 'planning': '#9ca3af',
};

function getWorkDays(start: string, end: string): number {
  if (!start || !end) return 0;
  let count = 0;
  const d = new Date(start);
  const e = new Date(end);
  while (d <= e) { if (d.getDay() !== 5 && d.getDay() !== 6) count++; d.setDate(d.getDate() + 1); }
  return count;
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function pctOfYear(dateStr: string) {
  return Math.max(0, Math.min(100, (new Date(dateStr).getTime() - START_REF) / 86400000 / YEAR_DAYS * 100));
}

const Schedule: React.FC = () => {
  const { language, loggedInUser } = useApp();
  const { projects: allProjects, engineers } = useData();
  const ar = language === 'ar';

  const myDept = loggedInUser?.role === 'department-manager' ? loggedInUser.department : undefined;
  const projects = myDept ? allProjects.filter(p => p.department === myDept) : allProjects;

  const [view,          setView]          = useState<'gantt' | 'table' | 'bydate'>('gantt');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [selectedDay,   setSelectedDay]   = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Unique project names for filter dropdown
  const uniqueNames = useMemo(() => [...new Set(projects.map(p => p.nameAr || p.name))].sort(), [projects]);

  // Filtered projects for Gantt/table
  const visibleProjects = useMemo(() => {
    if (filterProject === 'all') return projects;
    return projects.filter(p => (p.nameAr || p.name) === filterProject);
  }, [projects, filterProject]);

  // Today marker
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPct = `${pctOfYear(todayStr)}%`;

  // Month labels with positions
  const monthLabels = useMemo(() => {
    let acc = 0;
    return MONTHS.map(m => {
      const leftPct  = (acc / YEAR_DAYS) * 100;
      const widthPct = (m.days / YEAR_DAYS) * 100;
      acc += m.days;
      return {
        ...m,
        label: new Date(YEAR, m.i, 1).toLocaleString(ar ? 'ar-SA' : 'en-US', { month: 'short' }),
        leftPct, widthPct,
      };
    });
  }, [ar]);

  // Bar position
  const getBar = (start: string, end: string) => {
    if (!start || !end) return null;
    const left  = pctOfYear(start);
    const right = pctOfYear(end);
    const width = Math.max(right - left, 0.5);
    return { left: `${left}%`, width: `${Math.min(width, 100 - left)}%` };
  };

  // Click on Gantt area → compute date from mouse X
  const handleGanttClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    const day  = Math.floor(pct * YEAR_DAYS);
    const d    = new Date(`${YEAR}-01-01`);
    d.setDate(d.getDate() + day);
    setSelectedDay(d.toISOString().split('T')[0]);
  };

  // Day panel: all projects active on selectedDay
  const dayProjects = useMemo(() => {
    if (!selectedDay) return [];
    return projects
      .filter(p => p.startDate && p.deadline && p.startDate <= selectedDay && selectedDay <= p.deadline)
      .map(p => {
        const wDays = getWorkDays(p.startDate, p.deadline);
        const engCount = p.engineers.length || 1;
        const hPerEngPerDay = wDays > 0 ? Math.round((p.totalHours / (engCount * wDays)) * 10) / 10 : 0;
        return { ...p, hPerEngPerDay };
      })
      .sort((a, b) => b.hPerEngPerDay - a.hPerEngPerDay);
  }, [selectedDay, projects]);

  const totalDayHours = useMemo(() => dayProjects.reduce((s, p) => s + p.hPerEngPerDay, 0), [dayProjects]);

  // By-date grouping
  const byDate = useMemo(() => {
    const map = new Map<string, typeof projects>();
    [...visibleProjects].filter(p => p.deadline).sort((a, b) => a.deadline.localeCompare(b.deadline))
      .forEach(p => { if (!map.has(p.deadline)) map.set(p.deadline, []); map.get(p.deadline)!.push(p); });
    return map;
  }, [visibleProjects]);

  const getManagerName = (managerId?: string) => {
    if (!managerId) return '-';
    const m = engineers.find(e => e.id === managerId);
    return m ? (ar ? m.nameAr || m.name : m.name) : '-';
  };

  const printTable = () => {
    const el = printRef.current;
    if (!el) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html dir="${ar ? 'rtl' : 'ltr'}"><head><meta charset="UTF-8"/>
      <title>${ar ? 'جدول التسليم' : 'Delivery Schedule'}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px}table{width:100%;border-collapse:collapse}
      th{background:#1e3a5f;color:#fff;padding:8px 12px;text-align:${ar?'right':'left'}}
      td{padding:7px 12px;border-bottom:1px solid #e5e7eb}tr:nth-child(even)td{background:#f9fafb}
      .badge{padding:2px 8px;border-radius:10px;font-size:11px;color:#fff}</style></head>
      <body>${el.innerHTML}<script>window.onload=()=>window.print()<\/script></body></html>`);
    win.document.close();
  };

  if (projects.length === 0) {
    return (
      <div className="space-y-5 fade-in">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{ar ? 'جدول التسليم الرئيسي' : 'Master Delivery Schedule'}</h1>
        <div className="card flex flex-col items-center justify-center py-20 text-gray-400">
          <BarChart3 size={40} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">{ar ? 'لا توجد مشاريع بعد' : 'No projects yet'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{ar ? 'جدول التسليم الرئيسي' : 'Master Delivery Schedule'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{YEAR}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 gap-1">
            {[
              { key: 'gantt',  icon: <BarChart3 size={12} className="inline me-1" />, label: 'Gantt' },
              { key: 'table',  icon: <Table2    size={12} className="inline me-1" />, label: ar ? 'جدول' : 'Table' },
              { key: 'bydate', icon: <Calendar  size={12} className="inline me-1" />, label: ar ? 'بالتاريخ' : 'By Date' },
            ].map(v => (
              <button key={v.key} onClick={() => setView(v.key as any)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === v.key ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                {v.icon}{v.label}
              </button>
            ))}
          </div>
          <button onClick={printTable} className="btn-secondary text-xs">
            <Printer size={14} />{ar ? 'طباعة' : 'Print'}
          </button>
        </div>
      </div>

      {/* Date picker — any day */}
      <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
        <Calendar size={15} className="text-indigo-500 flex-shrink-0" />
        <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
          {ar ? 'اختر يوم لعرض خطة عمله:' : 'Pick any day:'}
        </span>
        <input
          type="date"
          className="input text-sm py-1.5 flex-1 max-w-[180px] border-indigo-200 dark:border-indigo-700 focus:ring-indigo-400"
          value={selectedDay || ''}
          onChange={e => setSelectedDay(e.target.value || null)}
        />
        {selectedDay && (
          <button onClick={() => setSelectedDay(null)}
            className="text-xs text-indigo-400 hover:text-red-500 flex items-center gap-1">
            <X size={12} />{ar ? 'مسح' : 'Clear'}
          </button>
        )}
      </div>

      {/* Project filter */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {ar ? 'فلتر المشروع:' : 'Project:'}
        </label>
        <select className="input w-64 text-sm"
          value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="all">{ar ? '-- جميع المشاريع --' : '-- All Projects --'}</option>
          {uniqueNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        {filterProject !== 'all' && (
          <button onClick={() => setFilterProject('all')}
            className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
            <X size={12} />{ar ? 'مسح' : 'Clear'}
          </button>
        )}
        <span className="text-xs text-gray-400 ms-auto">
          {visibleProjects.length} {ar ? 'مشروع' : 'project(s)'}
          {filterProject !== 'all' && ` — ${[...new Set(visibleProjects.map(p => p.department))].length} ${ar ? 'قسم' : 'dept(s)'}`}
        </span>
      </div>

      {/* Status legend */}
      <div className="flex items-center gap-4 text-xs flex-wrap">
        {Object.entries(statusHex).map(([s, c]) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: c }} />
            <span className="text-gray-600 dark:text-gray-400">
              {ar ? statusConfig[s as keyof typeof statusConfig]?.label.ar : statusConfig[s as keyof typeof statusConfig]?.label.en}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ms-auto">
          <div className="w-0.5 h-4 bg-amber-400" />
          <span className="text-gray-500 text-[10px]">{ar ? 'اليوم' : 'Today'}</span>
        </div>
      </div>

      {/* ─── GANTT ─── */}
      {view === 'gantt' && (
        <div className="card overflow-hidden p-0 shadow-md">
          <div className="overflow-x-auto">
            <div style={{ minWidth: 960 }}>

              {/* Month header */}
              <div className="flex border-b-2 border-gray-200 dark:border-gray-700 bg-gradient-to-b from-blue-900 to-blue-800">
                <div className="w-64 flex-shrink-0 p-3 border-e border-blue-700">
                  <span className="text-xs font-bold text-blue-200 uppercase tracking-wide">{ar ? 'المشروع' : 'Project'}</span>
                </div>
                <div className="flex-1 relative flex">
                  {monthLabels.map(m => (
                    <div key={m.i}
                      className={`text-center border-e border-blue-700/60 py-3 text-xs font-semibold text-white ${m.i % 2 === 0 ? 'bg-blue-800/40' : ''}`}
                      style={{ width: `${m.widthPct}%`, flexShrink: 0 }}>
                      {m.label}
                    </div>
                  ))}
                  {/* Today line in header */}
                  <div className="absolute top-0 bottom-0 w-px bg-amber-400 opacity-80 pointer-events-none z-10"
                    style={{ left: todayPct }} />
                </div>
                <div className="w-28 flex-shrink-0 p-3 border-s border-blue-700 text-end">
                  <span className="text-xs font-bold text-blue-200 uppercase tracking-wide">{ar ? 'الساعات' : 'Hours'}</span>
                </div>
              </div>

              {/* Rows */}
              {visibleProjects.map((p, idx) => {
                const bar    = getBar(p.startDate, p.deadline);
                const dl     = departmentLabels[p.department];
                const dColor = departmentColors[p.department];
                const sColor = statusHex[p.status] || '#9ca3af';
                const sc     = statusConfig[p.status];
                const wDays  = getWorkDays(p.startDate, p.deadline);
                const hPerDay = wDays > 0 && p.engineers.length > 0
                  ? Math.round((p.totalHours / (p.engineers.length * wDays)) * 10) / 10
                  : 0;
                const durationLabel = wDays > 0 ? `${wDays}${ar ? 'ي' : 'd'}` : '';

                return (
                  <div key={p.id}
                    className={`flex border-b border-gray-100 dark:border-gray-700/60 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors ${idx % 2 !== 0 ? 'bg-gray-50/40 dark:bg-gray-900/10' : 'bg-white dark:bg-transparent'}`}>

                    {/* Project info */}
                    <div className="w-64 flex-shrink-0 p-3 border-e border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate leading-tight">
                        {ar ? p.nameAr || p.name : p.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] text-white px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: dColor }}>
                          {ar ? dl.ar : dl.en}
                        </span>
                        {p.phase && (
                          <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded-full">
                            {p.phase.replace('-', ' ')}
                          </span>
                        )}
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full text-white"
                          style={{ background: sColor }}>
                          {ar ? sc.label.ar : sc.label.en}
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${p.progress}%`, background: sColor }} />
                        </div>
                        <p className="text-[9px] text-gray-400 mt-0.5">{p.progress}%</p>
                      </div>
                    </div>

                    {/* Bar area — click to see day details */}
                    <div className="flex-1 relative cursor-crosshair" style={{ height: 72 }}
                      onClick={handleGanttClick}>
                      {/* Month alternating bg */}
                      {monthLabels.map(m => (
                        <div key={m.i}
                          className={`absolute top-0 bottom-0 ${m.i % 2 === 0 ? '' : 'bg-gray-50/60 dark:bg-gray-900/20'}`}
                          style={{ left: `${m.leftPct}%`, width: `${m.widthPct}%` }} />
                      ))}
                      {/* Month grid lines */}
                      {monthLabels.map(m => (
                        <div key={m.i} className="absolute top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700/60"
                          style={{ left: `${m.leftPct}%` }} />
                      ))}
                      {/* Today line */}
                      <div className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10 pointer-events-none"
                        style={{ left: todayPct }} />

                      {/* Bar */}
                      {bar && (
                        <div className="absolute top-1/2 -translate-y-1/2 h-8 rounded-xl shadow-md flex items-center px-3 gap-2 overflow-hidden"
                          style={{ ...bar, background: `linear-gradient(135deg, ${dColor}ee, ${dColor}99)`, border: `1.5px solid ${dColor}` }}>
                          {/* Shimmer stripe */}
                          <div className="absolute inset-0 bg-white/10 rounded-xl" />
                          <span className="relative text-white text-[10px] font-bold whitespace-nowrap drop-shadow">
                            👤 {p.engineers.length}
                          </span>
                          {hPerDay > 0 && (
                            <span className="relative text-white/90 text-[9px] whitespace-nowrap drop-shadow">
                              {hPerDay}h/{ar ? 'ي' : 'd'}
                            </span>
                          )}
                          {durationLabel && (
                            <span className="relative text-white/70 text-[9px] ms-auto whitespace-nowrap drop-shadow">
                              {durationLabel}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Deadline diamond marker */}
                      {p.deadline && (
                        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 border-2 border-white shadow-md z-10"
                          style={{ left: `calc(${pctOfYear(p.deadline)}% - 6px)`, background: sColor }}
                          title={p.deadline} />
                      )}
                    </div>

                    {/* Hours column */}
                    <div className="w-28 flex-shrink-0 p-3 border-s border-gray-200 dark:border-gray-700 text-end">
                      <p className="text-[9px] text-gray-400">{ar ? 'منجز/إجمالي' : 'Done/Total'}</p>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">{p.completedHours}/{p.totalHours}h</p>
                      <p className="text-[9px] text-gray-500 mt-0.5">{p.deadline}</p>
                      {hPerDay > 0 && (
                        <p className="text-[9px] text-indigo-500 mt-0.5">
                          {hPerDay}h × {ar ? 'مهندس/يوم' : 'eng/day'}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {visibleProjects.length === 0 && (
                <div className="py-16 text-center text-gray-400 text-sm">{ar ? 'لا توجد نتائج' : 'No results'}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TABLE ─── */}
      {view === 'table' && (
        <div ref={printRef} className="card overflow-hidden p-0 shadow-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-blue-900 to-blue-800">
                {['#', ar?'اسم المشروع':'Project', ar?'المرحلة':'Phase', ar?'القسم':'Dept', ar?'مدير المشروع':'Manager', ar?'تاريخ البدء':'Start', ar?'تاريخ التسليم':'Deadline', ar?'التقدم':'%', ar?'الحالة':'Status']
                  .map((h, i) => (
                    <th key={i} className="px-4 py-3 text-start text-xs font-semibold text-white">{h}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {visibleProjects.map((p, i) => {
                const sc = statusConfig[p.status];
                const dl = departmentLabels[p.department];
                return (
                  <tr key={p.id}
                    className={`border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors ${i % 2 !== 0 ? 'bg-gray-50/50 dark:bg-gray-900/20' : ''}`}>
                    <td className="px-4 py-3 text-xs text-gray-400 font-medium">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-bold text-gray-900 dark:text-white">{ar ? p.nameAr || p.name : p.name}</p>
                      {p.clientName && <p className="text-[10px] text-gray-400">{p.clientName}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {p.phase ? (
                        <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                          {p.phase.replace('-', ' ')}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] text-white px-2 py-0.5 rounded-full font-medium"
                        style={{ background: departmentColors[p.department] }}>
                        {ar ? dl.ar : dl.en}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">{getManagerName(p.managerId)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{p.startDate || '—'}</td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white">{p.deadline || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${p.progress}%`, background: statusHex[p.status] }} />
                        </div>
                        <span className="text-xs">{p.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium"
                        style={{ background: statusHex[p.status] }}>
                        {ar ? sc.label.ar : sc.label.en}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── BY DATE ─── */}
      {view === 'bydate' && (
        <div className="space-y-4">
          {byDate.size === 0 && (
            <div className="card flex flex-col items-center py-16 text-gray-400">
              <p className="text-sm">{ar ? 'لا توجد مشاريع بتواريخ تسليم' : 'No projects with deadlines'}</p>
            </div>
          )}
          {Array.from(byDate.entries()).map(([date, dProjects]) => {
            const depts   = [...new Set(dProjects.map(p => p.department))] as Department[];
            const isToday = date === todayStr;
            const isPast  = date < todayStr;
            const dateObj = new Date(date + 'T12:00:00');

            // ── حساب ملخص اليوم ──
            const projectsWithHours = dProjects.map(p => {
              const wDays = getWorkDays(p.startDate, p.deadline);
              const hDay  = wDays > 0 && p.engineers.length > 0
                ? Math.round((p.totalHours / (p.engineers.length * wDays)) * 10) / 10 : 0;
              return { ...p, hDay };
            });
            // إجمالي ساعات اليوم (مجموع hDay × عدد مهندسي كل مشروع)
            const totalHoursDay   = projectsWithHours.reduce((s, p) => s + p.hDay * p.engineers.length, 0);
            // إجمالي المهندسين الفريدين
            const allEngIds       = [...new Set(dProjects.flatMap(p => p.engineers))];
            const totalEngineers  = allEngIds.length;
            // متوسط ساعات لكل مهندس
            const avgHoursPerEng  = totalEngineers > 0
              ? Math.round((totalHoursDay / totalEngineers) * 10) / 10 : 0;
            const loadPct         = Math.min((avgHoursPerEng / 8.5) * 100, 100);
            const loadColor       = avgHoursPerEng > 8.5 ? '#ef4444' : avgHoursPerEng >= 6 ? '#eab308' : '#22c55e';

            return (
              <div key={date}
                className={`card border-2 transition-shadow hover:shadow-lg ${isToday ? 'border-amber-400' : isPast ? 'border-red-200 dark:border-red-800' : 'border-gray-200 dark:border-gray-700'}`}>

                {/* ── رأس البطاقة ── */}
                <div className="flex items-start justify-between mb-4 gap-3">
                  {/* التاريخ قابل للنقر لفتح لوح المشاريع النشطة */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedDay(date)}
                      className={`text-center px-4 py-2 rounded-2xl shadow-sm flex-shrink-0 transition-transform hover:scale-105 active:scale-95 ${isToday ? 'bg-amber-500 text-white' : isPast ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-blue-600 text-white'}`}
                      title={ar ? 'انقر لعرض مشاريع هذا اليوم' : 'Click to see active projects'}>
                      <p className="text-xl font-black leading-none">{dateObj.getDate()}</p>
                      <p className="text-[10px] font-medium opacity-90">
                        {dateObj.toLocaleString(ar ? 'ar-SA' : 'en-US', { month: 'short' })}
                      </p>
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {isToday ? (ar ? '⚡ اليوم' : '⚡ Today') :
                           isPast  ? (ar ? '⚠️ انتهى الموعد' : '⚠️ Past Due') :
                           (ar ? '📅 موعد التسليم' : '📅 Delivery')}
                        </p>
                        <button onClick={() => setSelectedDay(date)}
                          className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                          <Clock size={10}/>{ar ? 'عرض خطة اليوم' : 'Day plan'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {dProjects.length} {ar ? 'مشروع' : 'project(s)'} · {depts.length} {ar ? 'قسم' : 'dept(s)'}
                      </p>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {depts.map(d => (
                          <span key={d} className="text-[10px] text-white px-2 py-0.5 rounded-full font-medium"
                            style={{ background: departmentColors[d] }}>
                            {ar ? departmentLabels[d].ar : departmentLabels[d].en}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── ملخص ساعات اليوم ── */}
                  <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-700/40 rounded-2xl p-3 min-w-[160px] border border-gray-100 dark:border-gray-600">
                    <p className="text-[10px] text-gray-500 font-semibold mb-2 text-center">
                      {ar ? 'توزيع اليوم' : "Day Summary"}
                    </p>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="text-center">
                        <p className="text-xl font-black text-blue-600">{totalEngineers}</p>
                        <p className="text-[9px] text-gray-400">{ar ? 'مهندس' : 'engineers'}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-black" style={{ color: loadColor }}>
                          {totalHoursDay.toFixed(1)}
                        </p>
                        <p className="text-[9px] text-gray-400">{ar ? 'ساعة كلي' : 'total hrs'}</p>
                      </div>
                    </div>
                    {/* شريط تحميل اليوم */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] text-gray-400">
                        <span>{ar ? 'معدل/مهندس' : 'avg/eng'}</span>
                        <span className="font-bold" style={{ color: loadColor }}>{avgHoursPerEng}h / 8.5h</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${loadPct}%`, background: loadColor }} />
                      </div>
                    </div>
                    {/* تقسيم الـ 8.5h على المشاريع */}
                    {projectsWithHours.length > 1 && (
                      <div className="mt-2">
                        <p className="text-[9px] text-gray-400 mb-1">{ar ? 'توزيع الـ 8.5h:' : '8.5h split:'}</p>
                        <div className="flex h-3 rounded-full overflow-hidden gap-px">
                          {projectsWithHours.map((p, i) => {
                            const segPct = avgHoursPerEng > 0 ? (p.hDay / avgHoursPerEng) * 100 : 0;
                            return (
                              <div key={p.id} title={`${p.nameAr || p.name}: ${p.hDay}h`}
                                className="h-full transition-all"
                                style={{ width: `${segPct}%`, background: departmentColors[p.department], opacity: 0.85 + i * 0.05 }} />
                            );
                          })}
                        </div>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                          {projectsWithHours.map(p => (
                            <span key={p.id} className="text-[8px] text-gray-500 flex items-center gap-0.5">
                              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: departmentColors[p.department] }} />
                              {p.hDay}h
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── قائمة المشاريع ── */}
                <div className="space-y-2">
                  {projectsWithHours.map(p => {
                    const sc     = statusConfig[p.status];
                    const dl     = departmentLabels[p.department];
                    const mgrObj = p.managerId ? engineers.find(e => e.id === p.managerId) : null;
                    const pct    = avgHoursPerEng > 0 ? Math.round((p.hDay / avgHoursPerEng) * 100) : 0;
                    return (
                      <div key={p.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/30 hover:border-blue-200 dark:hover:border-blue-700 transition-colors">
                        <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: departmentColors[p.department] }} />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                              {ar ? p.nameAr || p.name : p.name}
                            </p>
                            <span className="text-[9px] text-white px-1.5 py-0.5 rounded-full"
                              style={{ background: statusHex[p.status] }}>
                              {ar ? sc.label.ar : sc.label.en}
                            </span>
                            {p.phase && (
                              <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 px-1.5 py-0.5 rounded-full">
                                {p.phase.replace('-', ' ')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-[10px] font-semibold" style={{ color: departmentColors[p.department] }}>
                              {ar ? dl.ar : dl.en}
                            </span>
                            {mgrObj && (
                              <span className="text-[10px] text-amber-600">
                                👤 {ar ? mgrObj.nameAr || mgrObj.name : mgrObj.name}
                              </span>
                            )}
                            <span className="text-[10px] text-gray-400">
                              {p.engineers.length} {ar ? 'مهندس' : 'eng'}
                            </span>
                          </div>
                          {/* شريط حصة المشروع من اليوم */}
                          {p.hDay > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: departmentColors[p.department] }} />
                              </div>
                              <span className="text-[9px] text-gray-400 whitespace-nowrap">{pct}%</span>
                            </div>
                          )}
                        </div>
                        {/* ساعات المشروع لهذا اليوم */}
                        <div className="flex-shrink-0 text-end">
                          <p className="text-lg font-black text-blue-600 leading-none">{p.hDay}</p>
                          <p className="text-[9px] text-gray-400">{ar ? 'ساعة/مهندس' : 'h/eng'}</p>
                          <p className="text-[9px] text-gray-500 mt-1">{p.progress}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── DAY DETAIL PANEL ─── */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end" onClick={() => setSelectedDay(null)}>
          <div className="w-full max-w-md h-full bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto"
            dir={ar ? 'rtl' : 'ltr'}
            onClick={e => e.stopPropagation()}>

            {/* Panel header */}
            <div className="bg-gradient-to-br from-blue-900 to-blue-700 px-6 py-5 text-white">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-bold">{ar ? 'توزيع يوم العمل' : 'Daily Work Split'}</h2>
                <button onClick={() => setSelectedDay(null)}
                  className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <p className="text-blue-200 text-sm">
                {new Date(selectedDay + 'T12:00:00').toLocaleDateString(ar ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-blue-300" />
                  <span className="text-sm font-bold">{totalDayHours.toFixed(1)}h</span>
                  <span className="text-blue-300 text-xs">/ 8.5h</span>
                </div>
                <div className="flex-1 h-2 bg-blue-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: `${Math.min((totalDayHours / 8.5) * 100, 100)}%` }} />
                </div>
                <span className="text-xs text-blue-300">
                  {Math.round((totalDayHours / 8.5) * 100)}%
                </span>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {dayProjects.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Calendar size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{ar ? 'لا توجد مشاريع نشطة في هذا اليوم' : 'No active projects this day'}</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-500 font-medium">
                    {dayProjects.length} {ar ? 'مشروع نشط — ساعات العمل المطلوبة:' : 'active project(s) — required daily hours:'}
                  </p>
                  {dayProjects.map((p, idx) => {
                    const dl = departmentLabels[p.department];
                    const pct = totalDayHours > 0 ? (p.hPerEngPerDay / totalDayHours) * 100 : 0;
                    return (
                      <div key={p.id}
                        className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold text-gray-400">#{idx + 1}</span>
                              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                {ar ? p.nameAr || p.name : p.name}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] text-white px-2 py-0.5 rounded-full font-medium"
                                style={{ background: departmentColors[p.department] }}>
                                {ar ? dl.ar : dl.en}
                              </span>
                              {p.phase && (
                                <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 px-1.5 py-0.5 rounded-full">
                                  {p.phase.replace('-', ' ')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-end flex-shrink-0">
                            <p className="text-xl font-black text-blue-600">{p.hPerEngPerDay}</p>
                            <p className="text-[10px] text-gray-400">{ar ? 'ساعة/مهندس/يوم' : 'h/eng/day'}</p>
                          </div>
                        </div>

                        {/* Bar share */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-gray-500">
                            <span>{ar ? 'حصة هذا المشروع من اليوم' : 'Share of today'}</span>
                            <span>{Math.round(pct)}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, background: departmentColors[p.department] }} />
                          </div>
                        </div>

                        <div className="flex gap-4 text-[10px] text-gray-500 pt-1">
                          <span>📅 {ar ? 'ينتهي:' : 'Ends:'} {p.deadline}</span>
                          <span>👥 {p.engineers.length} {ar ? 'مهندس' : 'eng'}</span>
                          <span>⏱ {p.totalHours}h {ar ? 'إجمالي' : 'total'}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Summary */}
                  <div className={`p-3 rounded-xl text-xs font-semibold text-center mt-2 ${totalDayHours > 8.5 ? 'bg-red-100 dark:bg-red-900/30 text-red-700' : totalDayHours >= 7 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700' : 'bg-green-100 dark:bg-green-900/30 text-green-700'}`}>
                    {totalDayHours > 8.5
                      ? (ar ? `⚠️ الحمل يتجاوز 8.5h (${totalDayHours.toFixed(1)}h)` : `⚠️ Overloaded: ${totalDayHours.toFixed(1)}h`)
                      : totalDayHours >= 7
                      ? (ar ? `✅ يوم مكتظ: ${totalDayHours.toFixed(1)}h من 8.5h` : `✅ Busy day: ${totalDayHours.toFixed(1)}h / 8.5h`)
                      : (ar ? `🟢 يوم خفيف: ${totalDayHours.toFixed(1)}h من 8.5h` : `🟢 Light day: ${totalDayHours.toFixed(1)}h / 8.5h`)}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
