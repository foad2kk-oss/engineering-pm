import React, { useMemo, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { useData } from '../contexts/DataContext';
import { statusConfig, departmentColors, departmentLabels } from '../data/mockData';
import { BarChart3, Printer, Table2 } from 'lucide-react';

const MONTHS = Array.from({length:12},(_,i)=>({
  i,
  days: new Date(2026,i+1,0).getDate(),
}));
const YEAR_DAYS = 365;
const START_REF = new Date('2026-01-01').getTime();

const statusBarColor: Record<string,string> = {
  'on-time':'bg-green-500','at-risk':'bg-yellow-500',
  'delayed':'bg-red-500','completed':'bg-blue-400','planning':'bg-gray-400',
};

const statusHex: Record<string,string> = {
  'on-time':'#22c55e','at-risk':'#eab308',
  'delayed':'#ef4444','completed':'#60a5fa','planning':'#9ca3af',
};

const Schedule: React.FC = () => {
  const { language, loggedInUser } = useApp();
  const { projects: allProjects, engineers } = useData();

  // Dept manager sees only their dept
  const myDept = loggedInUser?.role === 'department-manager' ? loggedInUser.department : undefined;
  const projects = myDept ? allProjects.filter(p => p.department === myDept) : allProjects;
  const printRef = useRef<HTMLDivElement>(null);

  const [view, setView] = React.useState<'gantt'|'table'|'bydate'>('gantt');

  // Group projects by deadline date
  const byDate = useMemo(() => {
    const map = new Map<string, typeof projects>();
    [...projects]
      .filter(p => p.deadline)
      .sort((a,b) => a.deadline.localeCompare(b.deadline))
      .forEach(p => {
        const key = p.deadline;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(p);
      });
    return map;
  }, [projects]);

  const monthLabels = useMemo(()=> MONTHS.map(m=>({
    ...m,
    label: new Date(2026,m.i,1).toLocaleString(language==='ar'?'ar-SA':'en-US',{month:'short'}),
    leftPct: (MONTHS.slice(0,m.i).reduce((s,mm)=>s+mm.days,0)/YEAR_DAYS)*100,
    widthPct: (m.days/YEAR_DAYS)*100,
  })),[language]);

  const getBar = (start:string, end:string) => {
    const s = new Date(start).getTime() - START_REF;
    const e = new Date(end).getTime()   - new Date(start).getTime();
    const left  = Math.max(0,(s/86400000/YEAR_DAYS)*100);
    const width = Math.min((e/86400000/YEAR_DAYS)*100, 100-left);
    return { left:`${left}%`, width:`${Math.max(width,1)}%` };
  };

  const getManagerName = (managerId?: string) => {
    if (!managerId) return '-';
    const m = engineers.find(e => e.id === managerId);
    return m ? (language==='ar' ? m.nameAr||m.name : m.name) : '-';
  };

  const printTable = () => {
    const el = printRef.current;
    if (!el) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const html = `<!DOCTYPE html>
<html dir="${language==='ar'?'rtl':'ltr'}" lang="${language==='ar'?'ar':'en'}">
<head>
<meta charset="UTF-8"/>
<title>${language==='ar'?'جدول تسليم المشاريع':'Project Delivery Schedule'}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Cairo',sans-serif; background:#fff; color:#111; padding:32px; }
  h1 { font-size:20px; font-weight:700; margin-bottom:4px; }
  p.sub { color:#666; font-size:13px; margin-bottom:24px; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  th { background:#1e3a5f; color:#fff; padding:10px 14px; text-align:${language==='ar'?'right':'left'}; font-weight:600; }
  td { padding:9px 14px; border-bottom:1px solid #e5e7eb; }
  tr:nth-child(even) td { background:#f8fafc; }
  .badge { display:inline-block; padding:2px 10px; border-radius:9999px; font-size:11px; font-weight:600; color:#fff; }
  .dept { display:inline-block; padding:2px 8px; border-radius:6px; font-size:11px; color:#fff; }
  @media print {
    body { padding:16px; }
    button { display:none; }
  }
</style>
</head>
<body>
<h1>${language==='ar'?'جدول تسليم المشاريع':'Project Delivery Schedule'}</h1>
<p class="sub">${new Date().toLocaleDateString(language==='ar'?'ar-SA':'en-US', {year:'numeric',month:'long',day:'numeric'})}</p>
<table>
<thead><tr>
  <th>#</th>
  <th>${language==='ar'?'اسم المشروع':'Project Name'}</th>
  <th>${language==='ar'?'نوع المشروع':'Type'}</th>
  <th>${language==='ar'?'القسم':'Department'}</th>
  <th>${language==='ar'?'مدير المشروع':'Manager'}</th>
  <th>${language==='ar'?'تاريخ البدء':'Start Date'}</th>
  <th>${language==='ar'?'تاريخ التسليم':'Deadline'}</th>
  <th>${language==='ar'?'التقدم':'Progress'}</th>
  <th>${language==='ar'?'الحالة':'Status'}</th>
</tr></thead>
<tbody>
${projects.map((p,i)=>{
  const sc  = statusConfig[p.status];
  const dl  = departmentLabels[p.department];
  const mgrName = getManagerName(p.managerId);
  const color = statusHex[p.status] || '#9ca3af';
  const deptColor = departmentColors[p.department] || '#3b82f6';
  return `<tr>
    <td>${i+1}</td>
    <td><strong>${language==='ar'?p.nameAr||p.name:p.name}</strong></td>
    <td>${p.projectType||'-'}</td>
    <td><span class="dept" style="background:${deptColor}">${language==='ar'?dl.ar:dl.en}</span></td>
    <td>${mgrName}</td>
    <td>${p.startDate||'-'}</td>
    <td><strong>${p.deadline||'-'}</strong></td>
    <td>${p.progress}%</td>
    <td><span class="badge" style="background:${color}">${language==='ar'?sc.label.ar:sc.label.en}</span></td>
  </tr>`;
}).join('')}
</tbody>
</table>
<p style="margin-top:24px;font-size:11px;color:#999;text-align:center">
  ${language==='ar'?`إجمالي المشاريع: ${projects.length}`:`Total Projects: ${projects.length}`}
</p>
<script>window.onload=()=>{window.print();}<\/script>
</body></html>`;
    win.document.write(html);
    win.document.close();
  };

  if (projects.length === 0) {
    return (
      <div className="space-y-5 fade-in">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {language==='ar'?'جدول التسليم الرئيسي':'Master Delivery Schedule'}
        </h1>
        <div className="card flex flex-col items-center justify-center py-20 text-gray-400">
          <BarChart3 size={40} className="mb-3 opacity-30"/>
          <p className="text-sm font-medium">{language==='ar'?'لا توجد مشاريع بعد':'No projects yet'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {language==='ar'?'جدول التسليم الرئيسي':'Master Delivery Schedule'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">2026</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 gap-1">
            <button onClick={()=>setView('gantt')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${view==='gantt'?'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white':'text-gray-500'}`}>
              <BarChart3 size={12} className="inline me-1"/>Gantt
            </button>
            <button onClick={()=>setView('table')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${view==='table'?'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white':'text-gray-500'}`}>
              <Table2 size={12} className="inline me-1"/>{language==='ar'?'جدول':'Table'}
            </button>
            <button onClick={()=>setView('bydate')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${view==='bydate'?'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white':'text-gray-500'}`}>
              📅 {language==='ar'?'بالتاريخ':'By Date'}
            </button>
          </div>
          {/* Print button */}
          <button onClick={printTable} className="btn-secondary text-xs">
            <Printer size={14}/>{language==='ar'?'طباعة / تصدير':'Print / Export'}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-xs flex-wrap">
        {Object.entries(statusBarColor).map(([s,c])=>(
          <div key={s} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${c}`}/>
            <span className="text-gray-600 dark:text-gray-400">
              {language==='ar'? statusConfig[s as keyof typeof statusConfig].label.ar : statusConfig[s as keyof typeof statusConfig].label.en}
            </span>
          </div>
        ))}
      </div>

      {/* GANTT VIEW */}
      {view==='gantt' && (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <div style={{minWidth:900}}>
              <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <div className="w-60 flex-shrink-0 p-3 border-e border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-semibold text-gray-500 uppercase">{language==='ar'?'المشروع':'Project'}</span>
                </div>
                <div className="flex-1 relative flex">
                  {monthLabels.map(m=>(
                    <div key={m.i} className="text-center border-e border-gray-200 dark:border-gray-700 py-3 text-xs font-medium text-gray-600 dark:text-gray-400"
                      style={{width:`${m.widthPct}%`,flexShrink:0}}>
                      {m.label}
                    </div>
                  ))}
                </div>
                <div className="w-32 flex-shrink-0 p-3 border-s border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-semibold text-gray-500 uppercase">{language==='ar'?'الساعات':'Hours'}</span>
                </div>
              </div>

              {projects.map((p,idx)=>{
                const sc  = statusConfig[p.status];
                const dl  = departmentLabels[p.department];
                const bar = getBar(p.startDate, p.deadline);
                return (
                  <div key={p.id} className={`flex border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${idx%2===0?'':'bg-gray-50/30 dark:bg-gray-900/10'}`}>
                    <div className="w-60 flex-shrink-0 p-3 border-e border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                        {language==='ar'?p.nameAr||p.name:p.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px]" style={{color:departmentColors[p.department]}}>
                          ● {language==='ar'?dl.ar:dl.en}
                        </span>
                        <span className={`text-[10px] ${sc.badge}`}>{language==='ar'?sc.label.ar:sc.label.en}</span>
                      </div>
                      <div className="mt-1.5">
                        <div className="progress-bar">
                          <div className={`progress-fill ${statusBarColor[p.status]}`} style={{width:`${p.progress}%`}}/>
                        </div>
                        <span className="text-[9px] text-gray-400">{p.progress}%</span>
                      </div>
                    </div>

                    <div className="flex-1 relative py-4">
                      {monthLabels.map(m=>(
                        <div key={m.i} className="absolute top-0 bottom-0 border-e border-gray-100 dark:border-gray-700/50"
                          style={{left:`${m.leftPct}%`,width:`${m.widthPct}%`}}/>
                      ))}
                      <div className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-md ${statusBarColor[p.status]} opacity-85 hover:opacity-100 transition-opacity flex items-center px-2`}
                        style={bar} title={`${p.startDate} → ${p.deadline}`}>
                        <span className="text-white text-[9px] font-medium truncate">{p.engineers.length}👤</span>
                      </div>
                    </div>

                    <div className="w-32 flex-shrink-0 p-3 border-s border-gray-200 dark:border-gray-700 text-end">
                      <p className="text-[10px] text-gray-500">{language==='ar'?'منجز/إجمالي':'Done/Total'}</p>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">{p.completedHours}/{p.totalHours}h</p>
                      <p className="text-[10px] text-gray-500 mt-1">{p.deadline}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* BY DATE VIEW */}
      {view==='bydate' && (
        <div className="space-y-4">
          {byDate.size === 0 && (
            <div className="card flex flex-col items-center justify-center py-12 text-gray-400">
              <p className="text-sm">{language==='ar'?'لا توجد مشاريع بتواريخ تسليم':'No projects with deadlines'}</p>
            </div>
          )}
          {Array.from(byDate.entries()).map(([date, dateProjects]) => {
            const depts = [...new Set(dateProjects.map(p => p.department))];
            const isToday = date === new Date().toISOString().split('T')[0];
            const isPast  = date < new Date().toISOString().split('T')[0];
            return (
              <div key={date} className={`card border-2 ${isToday?'border-amber-400':isPast?'border-red-200 dark:border-red-800':'border-gray-200 dark:border-gray-700'}`}>
                {/* Date header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`text-center px-3 py-1.5 rounded-xl ${isToday?'bg-amber-500 text-white':isPast?'bg-red-100 dark:bg-red-900/30 text-red-600':'bg-blue-100 dark:bg-blue-900/30 text-blue-600'}`}>
                      <p className="text-xs font-bold">{new Date(date+'T12:00:00').toLocaleDateString(language==='ar'?'ar-SA':'en-US',{day:'2-digit',month:'short'})}</p>
                      <p className="text-[10px]">{new Date(date+'T12:00:00').getFullYear()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {isToday ? (language==='ar'?'اليوم':'Today') :
                         isPast  ? (language==='ar'?'انتهى الموعد':'Past Due') :
                         (language==='ar'?'موعد التسليم':'Delivery Date')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {dateProjects.length} {language==='ar'?'مشروع':'project(s)'} —&nbsp;
                        {depts.length} {language==='ar'?'قسم':'dept(s)'}
                      </p>
                    </div>
                  </div>
                  {/* Dept badges */}
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {depts.map(d => (
                      <span key={d} className="text-[10px] text-white px-2 py-0.5 rounded-full font-medium"
                        style={{background: departmentColors[d]}}>
                        {language==='ar'? departmentLabels[d].ar : departmentLabels[d].en}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Projects in this date */}
                <div className="space-y-2">
                  {dateProjects.map(p => {
                    const sc = statusConfig[p.status];
                    const dl = departmentLabels[p.department];
                    const barColor = p.status==='delayed'?'bg-red-500':p.status==='at-risk'?'bg-yellow-500':p.status==='completed'?'bg-green-500':'bg-blue-500';
                    const mgrName = p.managerId ? engineers.find(e=>e.id===p.managerId) : null;
                    return (
                      <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/40">
                        <div className="w-1 h-10 rounded-full flex-shrink-0" style={{background: departmentColors[p.department]}}/>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                              {language==='ar'? p.nameAr||p.name : p.name}
                            </p>
                            <span className={`text-[10px] ${sc.badge} flex-shrink-0`}>
                              {language==='ar'? sc.label.ar : sc.label.en}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-medium" style={{color: departmentColors[p.department]}}>
                              {language==='ar'? dl.ar : dl.en}
                            </span>
                            {mgrName && (
                              <span className="text-[10px] text-amber-600">
                                👤 {language==='ar'? mgrName.nameAr||mgrName.name : mgrName.name}
                              </span>
                            )}
                            <span className="text-[10px] text-gray-400">{p.engineers.length} {language==='ar'?'مهندس':'eng'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="progress-bar w-14">
                            <div className={`progress-fill ${barColor}`} style={{width:`${p.progress}%`}}/>
                          </div>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-8">{p.progress}%</span>
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

      {/* TABLE VIEW */}
      {view==='table' && (
        <div ref={printRef} className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="bg-blue-900 dark:bg-blue-950">
                <th className="px-4 py-3 text-start text-xs font-semibold text-white">#</th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-white">{language==='ar'?'اسم المشروع':'Project'}</th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-white">{language==='ar'?'القسم':'Department'}</th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-white">{language==='ar'?'مدير المشروع':'Manager'}</th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-white">{language==='ar'?'تاريخ البدء':'Start'}</th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-white">{language==='ar'?'تاريخ التسليم':'Deadline'}</th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-white">{language==='ar'?'التقدم':'Progress'}</th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-white">{language==='ar'?'الحالة':'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p,i)=>{
                const sc = statusConfig[p.status];
                const dl = departmentLabels[p.department];
                const mgrName = getManagerName(p.managerId);
                return (
                  <tr key={p.id} className={`border-b border-gray-100 dark:border-gray-700 ${i%2===0?'':'bg-gray-50/50 dark:bg-gray-900/20'}`}>
                    <td className="px-4 py-3 text-xs text-gray-500">{i+1}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">{language==='ar'?p.nameAr||p.name:p.name}</p>
                      {p.clientName && <p className="text-[10px] text-gray-400">{p.clientName}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] text-white px-2 py-0.5 rounded-full font-medium" style={{background:departmentColors[p.department]}}>
                        {language==='ar'?dl.ar:dl.en}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">{mgrName}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{p.startDate||'-'}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-900 dark:text-white">{p.deadline||'-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="progress-bar w-16">
                          <div className={`progress-fill ${statusBarColor[p.status]}`} style={{width:`${p.progress}%`}}/>
                        </div>
                        <span className="text-xs">{p.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={sc.badge}>{language==='ar'?sc.label.ar:sc.label.en}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Schedule;
