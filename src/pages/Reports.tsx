import React, { useMemo, useRef, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useData } from '../contexts/DataContext';
import { Download, FileText, BarChart3, TrendingUp, Users, Calendar, Printer, Upload, CheckCircle, AlertCircle, Table2, Home } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { statusConfig, departmentLabels, departmentColors } from '../data/mockData';
import type { Department } from '../types';

const DEPTS: Department[] = ['architectural','structural','mechanical','electrical'];

const Reports: React.FC = () => {
  const { language } = useApp();
  const { projects, engineers, clients, meetings } = useData();

  const fileRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle'|'success'|'error'>('idle');
  const [importMsg,    setImportMsg]    = useState('');

  // ── JSON export ──────────────────────────────────────────────
  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      engineers, projects,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `engineering-pm-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        JSON.parse(ev.target?.result as string); // validate only
        setImportStatus('success');
        setImportMsg(language==='ar' ? 'الملف صحيح — استخدم استيراد البيانات من الإعدادات' : 'File valid — use Data Import in Settings');
      } catch {
        setImportStatus('error');
        setImportMsg(language==='ar' ? 'ملف JSON غير صحيح' : 'Invalid JSON file');
      }
      setTimeout(() => setImportStatus('idle'), 4000);
      if (fileRef.current) fileRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // ── Print helpers ─────────────────────────────────────────────
  const printHtmlPage = (html: string) => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  const baseStyle = (lang: string) => `
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Cairo',sans-serif;background:#fff;color:#111;padding:28px;font-size:13px}
    h1{font-size:20px;font-weight:700;margin-bottom:3px}
    .sub{color:#888;font-size:12px;margin-bottom:20px}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    th{background:#1e3a5f;color:#fff;padding:9px 12px;text-align:${lang==='ar'?'right':'left'};font-weight:600;font-size:12px}
    td{padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px}
    tr:nth-child(even) td{background:#f8fafc}
    .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;color:#fff}
    h2{font-size:14px;font-weight:700;margin:20px 0 8px;padding-bottom:4px;border-bottom:2px solid #1e3a5f}
    .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}
    .stat{border:1px solid #ddd;border-radius:8px;padding:12px;text-align:center}
    .stat-num{font-size:22px;font-weight:700;color:#2563eb}
    .stat-lbl{font-size:11px;color:#666;margin-top:2px}
    @media print{body{padding:12px}}
  `;

  const dateStr = new Date().toLocaleDateString(language==='ar'?'ar-SA':'en-US',{year:'numeric',month:'long',day:'numeric'});

  // ── Full report print ──────────────────────────────────────────
  const printFullReport = () => {
    const totalH  = projects.reduce((s,p)=>s+p.totalHours,0);
    const doneH   = projects.reduce((s,p)=>s+p.completedHours,0);
    const avgUtil = engineers.length ? Math.round(engineers.reduce((s,e)=>s+e.utilization,0)/engineers.length) : 0;
    printHtmlPage(`<!DOCTYPE html><html dir="${language==='ar'?'rtl':'ltr'}"><head><meta charset="UTF-8"/><title>Report</title>
    <style>${baseStyle(language)}</style></head><body>
    <h1>${language==='ar'?'التقرير الشامل':'Comprehensive Report'}</h1>
    <p class="sub">${dateStr}</p>
    <div class="stats">
      <div class="stat"><div class="stat-num">${projects.length}</div><div class="stat-lbl">${language==='ar'?'مشاريع':'Projects'}</div></div>
      <div class="stat"><div class="stat-num">${engineers.length}</div><div class="stat-lbl">${language==='ar'?'موظفون':'Staff'}</div></div>
      <div class="stat"><div class="stat-num">${doneH}/${totalH}h</div><div class="stat-lbl">${language==='ar'?'ساعات منجزة':'Done Hours'}</div></div>
      <div class="stat"><div class="stat-num">${avgUtil}%</div><div class="stat-lbl">${language==='ar'?'متوسط الاستخدام':'Avg Util'}</div></div>
    </div>
    <h2>${language==='ar'?'جميع المشاريع':'All Projects'}</h2>
    <table><thead><tr>
      <th>#</th><th>${language==='ar'?'المشروع':'Project'}</th>
      <th>${language==='ar'?'القسم':'Dept'}</th>
      <th>${language==='ar'?'التقدم':'Progress'}</th>
      <th>${language==='ar'?'الساعات':'Hours'}</th>
      <th>${language==='ar'?'التسليم':'Deadline'}</th>
      <th>${language==='ar'?'الحالة':'Status'}</th>
    </tr></thead><tbody>
    ${projects.map((p,i)=>{
      const sc=statusConfig[p.status];
      const clr=p.status==='on-time'?'#22c55e':p.status==='delayed'?'#ef4444':p.status==='completed'?'#3b82f6':p.status==='at-risk'?'#eab308':'#9ca3af';
      return `<tr><td>${i+1}</td><td><strong>${language==='ar'?p.nameAr||p.name:p.name}</strong>${p.clientName?`<br><small style="color:#999">${p.clientName}</small>`:''}</td>
      <td>${language==='ar'?departmentLabels[p.department].ar:departmentLabels[p.department].en}</td>
      <td>${p.progress}%</td><td>${p.completedHours}/${p.totalHours}h</td>
      <td><strong>${p.deadline||'-'}</strong></td>
      <td><span class="badge" style="background:${clr}">${language==='ar'?sc.label.ar:sc.label.en}</span></td></tr>`;
    }).join('')}
    </tbody></table>
    <h2>${language==='ar'?'بيانات الموظفين':'Staff Data'}</h2>
    <table><thead><tr>
      <th>#</th><th>${language==='ar'?'الاسم':'Name'}</th>
      <th>${language==='ar'?'المسمى':'Title'}</th>
      <th>${language==='ar'?'القسم':'Dept'}</th>
      <th>${language==='ar'?'الاستخدام':'Util'}</th>
    </tr></thead><tbody>
    ${engineers.map((e,i)=>`<tr><td>${i+1}</td>
      <td><strong>${language==='ar'?e.nameAr||e.name:e.name}</strong></td>
      <td>${e.titleAr||e.title}</td>
      <td>${language==='ar'?departmentLabels[e.department].ar:departmentLabels[e.department].en}</td>
      <td>${e.utilization}%</td></tr>`).join('')}
    </tbody></table>
    <p style="margin-top:24px;font-size:11px;color:#aaa;text-align:center">Engineering PM — ${dateStr}</p>
    <script>window.onload=()=>window.print()<\/script></body></html>`);
  };

  // ── Department report print ────────────────────────────────────
  const printDeptReport = (dept: Department) => {
    const deptProjects  = projects.filter(p => p.department === dept);
    const deptEngineers = engineers.filter(e => e.department === dept);
    const dl = departmentLabels[dept];
    const deptName = language==='ar' ? dl.ar : dl.en;
    printHtmlPage(`<!DOCTYPE html><html dir="${language==='ar'?'rtl':'ltr'}"><head><meta charset="UTF-8"/><title>${deptName}</title>
    <style>${baseStyle(language)}</style></head><body>
    <h1>${language==='ar'?`تقرير قسم ${deptName}`:`${deptName} Department Report`}</h1>
    <p class="sub">${dateStr}</p>
    <div class="stats">
      <div class="stat"><div class="stat-num">${deptProjects.length}</div><div class="stat-lbl">${language==='ar'?'مشاريع':'Projects'}</div></div>
      <div class="stat"><div class="stat-num">${deptEngineers.length}</div><div class="stat-lbl">${language==='ar'?'موظفون':'Staff'}</div></div>
      <div class="stat"><div class="stat-num">${deptProjects.filter(p=>p.status==='delayed').length}</div><div class="stat-lbl">${language==='ar'?'متأخرة':'Delayed'}</div></div>
      <div class="stat"><div class="stat-num">${deptProjects.filter(p=>p.status==='completed').length}</div><div class="stat-lbl">${language==='ar'?'مكتملة':'Completed'}</div></div>
    </div>
    <h2>${language==='ar'?'مشاريع القسم':'Department Projects'}</h2>
    ${deptProjects.length===0?`<p style="color:#888;padding:12px">${language==='ar'?'لا توجد مشاريع':'No projects'}</p>`:`
    <table><thead><tr>
      <th>#</th><th>${language==='ar'?'المشروع':'Project'}</th>
      <th>${language==='ar'?'التقدم':'Progress'}</th>
      <th>${language==='ar'?'الساعات':'Hours'}</th>
      <th>${language==='ar'?'تاريخ التسليم':'Deadline'}</th>
      <th>${language==='ar'?'الحالة':'Status'}</th>
    </tr></thead><tbody>
    ${deptProjects.map((p,i)=>{
      const sc=statusConfig[p.status];
      const clr=p.status==='on-time'?'#22c55e':p.status==='delayed'?'#ef4444':p.status==='completed'?'#3b82f6':p.status==='at-risk'?'#eab308':'#9ca3af';
      return `<tr><td>${i+1}</td><td><strong>${language==='ar'?p.nameAr||p.name:p.name}</strong>${p.clientName?`<br><small style="color:#999">${p.clientName}</small>`:''}</td>
      <td>${p.progress}%</td><td>${p.completedHours}/${p.totalHours}h</td>
      <td><strong>${p.deadline||'-'}</strong></td>
      <td><span class="badge" style="background:${clr}">${language==='ar'?sc.label.ar:sc.label.en}</span></td></tr>`;
    }).join('')}</tbody></table>`}
    <h2>${language==='ar'?'موظفو القسم':'Department Staff'}</h2>
    ${deptEngineers.length===0?`<p style="color:#888;padding:12px">${language==='ar'?'لا يوجد موظفون':'No staff'}</p>`:`
    <table><thead><tr>
      <th>#</th><th>${language==='ar'?'الاسم':'Name'}</th>
      <th>${language==='ar'?'المسمى':'Title'}</th>
      <th>${language==='ar'?'الاستخدام':'Util'}</th>
      <th>${language==='ar'?'مشاريع':'Projects'}</th>
    </tr></thead><tbody>
    ${deptEngineers.map((e,i)=>`<tr><td>${i+1}</td>
      <td><strong>${language==='ar'?e.nameAr||e.name:e.name}</strong></td>
      <td>${e.titleAr||e.title}</td><td>${e.utilization}%</td><td>${e.projectsCount}</td></tr>`).join('')}
    </tbody></table>`}
    <script>window.onload=()=>window.print()<\/script></body></html>`);
  };

  // ── Clients print ─────────────────────────────────────────────
  const printClients = () => {
    const statusLabels: Record<string,{ar:string;en:string}> = {
      lead:        {ar:'عميل محتمل', en:'Lead'},
      qualified:   {ar:'مؤهل',       en:'Qualified'},
      proposal:    {ar:'عرض سعر',    en:'Proposal'},
      negotiation: {ar:'تفاوض',      en:'Negotiation'},
      won:         {ar:'مكتسب',      en:'Won'},
      lost:        {ar:'خسارة',      en:'Lost'},
    };
    const statusColors: Record<string,string> = {
      lead:'#9ca3af', qualified:'#3b82f6', proposal:'#f59e0b',
      negotiation:'#8b5cf6', won:'#22c55e', lost:'#ef4444',
    };
    printHtmlPage(`<!DOCTYPE html><html dir="${language==='ar'?'rtl':'ltr'}"><head><meta charset="UTF-8"/><title>${language==='ar'?'قائمة العملاء':'Clients List'}</title>
    <style>${baseStyle(language)}</style></head><body>
    <h1>${language==='ar'?'قائمة العملاء':'Clients List'}</h1>
    <p class="sub">${dateStr} — ${language==='ar'?`إجمالي ${clients.length} عميل`:`Total: ${clients.length} clients`}</p>
    ${clients.length===0?`<p style="color:#888">${language==='ar'?'لا يوجد عملاء':'No clients'}</p>`:`
    <table><thead><tr>
      <th>#</th><th>${language==='ar'?'الاسم':'Name'}</th>
      <th>${language==='ar'?'الشركة':'Company'}</th>
      <th>${language==='ar'?'المنصب':'Position'}</th>
      <th>${language==='ar'?'الهاتف':'Phone'}</th>
      <th>${language==='ar'?'البريد':'Email'}</th>
      <th>${language==='ar'?'المدينة':'City'}</th>
      <th>${language==='ar'?'الحالة':'Status'}</th>
      <th>${language==='ar'?'المتابعة':'Follow-up'}</th>
    </tr></thead><tbody>
    ${clients.map((c,i)=>`<tr>
      <td>${i+1}</td>
      <td><strong>${c.name}</strong></td>
      <td>${c.company||'-'}</td>
      <td>${c.position||'-'}</td>
      <td>${c.phone||'-'}</td>
      <td>${c.email||'-'}</td>
      <td>${c.city||'-'}</td>
      <td><span class="badge" style="background:${statusColors[c.status]||'#9ca3af'}">${language==='ar'?statusLabels[c.status]?.ar||c.status:statusLabels[c.status]?.en||c.status}</span></td>
      <td>${c.nextFollowUp||'-'}</td>
    </tr>`).join('')}
    </tbody></table>`}
    <script>window.onload=()=>window.print()<\/script></body></html>`);
  };

  // ── Meetings print ─────────────────────────────────────────────
  const printMeetings = () => {
    const typeLabels: Record<string,{ar:string;en:string}> = {
      internal:  {ar:'داخلي',   en:'Internal'},
      client:    {ar:'مع عميل', en:'Client'},
      online:    {ar:'أونلاين', en:'Online'},
      recurring: {ar:'متكرر',   en:'Recurring'},
    };
    const sorted = [...meetings].sort((a,b)=>a.date.localeCompare(b.date));
    printHtmlPage(`<!DOCTYPE html><html dir="${language==='ar'?'rtl':'ltr'}"><head><meta charset="UTF-8"/><title>${language==='ar'?'قائمة الاجتماعات':'Meetings'}</title>
    <style>${baseStyle(language)}</style></head><body>
    <h1>${language==='ar'?'قائمة الاجتماعات':'Meetings List'}</h1>
    <p class="sub">${dateStr} — ${language==='ar'?`إجمالي ${meetings.length} اجتماع`:`Total: ${meetings.length} meetings`}</p>
    ${meetings.length===0?`<p style="color:#888">${language==='ar'?'لا توجد اجتماعات':'No meetings'}</p>`:`
    <table><thead><tr>
      <th>#</th><th>${language==='ar'?'العنوان':'Title'}</th>
      <th>${language==='ar'?'النوع':'Type'}</th>
      <th>${language==='ar'?'التاريخ':'Date'}</th>
      <th>${language==='ar'?'الوقت':'Time'}</th>
      <th>${language==='ar'?'المكان':'Location'}</th>
      <th>${language==='ar'?'جدول الأعمال':'Agenda'}</th>
    </tr></thead><tbody>
    ${sorted.map((m,i)=>`<tr>
      <td>${i+1}</td>
      <td><strong>${language==='ar'?m.titleAr||m.title:m.title}</strong></td>
      <td>${language==='ar'?typeLabels[m.type]?.ar||m.type:typeLabels[m.type]?.en||m.type}</td>
      <td>${m.date}</td>
      <td>${m.startTime} – ${m.endTime}</td>
      <td>${m.location||m.onlineLink||'-'}</td>
      <td style="max-width:180px;white-space:normal">${m.agenda||'-'}</td>
    </tr>`).join('')}
    </tbody></table>`}
    <script>window.onload=()=>window.print()<\/script></body></html>`);
  };

  // ── Delivery schedule print ────────────────────────────────────
  const printDeliverySchedule = () => {
    const sorted = [...projects].sort((a,b)=>(a.deadline||'').localeCompare(b.deadline||''));
    printHtmlPage(`<!DOCTYPE html><html dir="${language==='ar'?'rtl':'ltr'}"><head><meta charset="UTF-8"/><title>Schedule</title>
    <style>${baseStyle(language)}
    .dept-header{background:#f0f4ff;padding:8px 12px;font-weight:700;font-size:13px;color:#1e3a5f;border-inline-start:4px solid #2563eb;margin-top:16px}
    </style></head><body>
    <h1>${language==='ar'?'جدول مواعيد تسليم المشاريع':'Project Delivery Schedule'}</h1>
    <p class="sub">${dateStr} — ${language==='ar'?`إجمالي ${projects.length} مشروع`:`Total: ${projects.length} projects`}</p>
    <table><thead><tr>
      <th>#</th>
      <th>${language==='ar'?'المشروع':'Project'}</th>
      <th>${language==='ar'?'القسم':'Department'}</th>
      <th>${language==='ar'?'العميل':'Client'}</th>
      <th>${language==='ar'?'تاريخ البدء':'Start'}</th>
      <th>${language==='ar'?'تاريخ التسليم':'Deadline'}</th>
      <th>${language==='ar'?'التقدم':'Progress'}</th>
      <th>${language==='ar'?'الحالة':'Status'}</th>
    </tr></thead><tbody>
    ${sorted.map((p,i)=>{
      const sc=statusConfig[p.status];
      const dl=departmentLabels[p.department];
      const clr=p.status==='on-time'?'#22c55e':p.status==='delayed'?'#ef4444':p.status==='completed'?'#3b82f6':p.status==='at-risk'?'#eab308':'#9ca3af';
      const dClr=departmentColors[p.department]||'#3b82f6';
      return `<tr>
        <td>${i+1}</td>
        <td><strong>${language==='ar'?p.nameAr||p.name:p.name}</strong></td>
        <td><span style="background:${dClr};color:#fff;padding:2px 8px;border-radius:999px;font-size:11px">${language==='ar'?dl.ar:dl.en}</span></td>
        <td>${p.clientName||'-'}</td>
        <td>${p.startDate||'-'}</td>
        <td><strong>${p.deadline||'-'}</strong></td>
        <td>${p.progress}%</td>
        <td><span class="badge" style="background:${clr}">${language==='ar'?sc.label.ar:sc.label.en}</span></td>
      </tr>`;
    }).join('')}
    </tbody></table>
    <script>window.onload=()=>window.print()<\/script></body></html>`);
  };

  // ── Chart data ────────────────────────────────────────────────
  const engineerData = useMemo(()=> engineers.map(e=>({
    name: language==='ar' ? (e.nameAr||e.name).split(' ')[0] : e.name.split(' ')[0],
    planned: e.plannedHours, completed: e.completedHours,
  })),[engineers,language]);

  const totals = useMemo(()=>({
    planned:   projects.reduce((s,p)=>s+p.totalHours,0),
    completed: projects.reduce((s,p)=>s+p.completedHours,0),
    value:     projects.reduce((s,p)=>s+(p.value||0),0),
  }),[projects]);

  return (
    <div className="space-y-5 fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={()=>window.dispatchEvent(new CustomEvent('pm-navigate',{detail:'dashboard'}))}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
            title={language==='ar'?'الصفحة الرئيسية':'Dashboard'}>
            <Home size={16}/>
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{language==='ar'?'التقارير':'Reports'}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={printFullReport} className="btn-primary text-xs">
            <Printer size={13}/>{language==='ar'?'طباعة شاملة':'Full Report'}
          </button>
          <button onClick={printDeliverySchedule} className="btn-secondary text-xs">
            <Table2 size={13}/>{language==='ar'?'جدول التسليمات':'Delivery Schedule'}
          </button>
          <button onClick={printClients} className="btn-secondary text-xs">
            <Printer size={13}/>{language==='ar'?'قائمة العملاء':'Clients List'}
          </button>
          <button onClick={printMeetings} className="btn-secondary text-xs">
            <Calendar size={13}/>{language==='ar'?'قائمة الاجتماعات':'Meetings List'}
          </button>
          <button onClick={handleExport} className="btn-secondary text-xs">
            <Download size={13}/>{language==='ar'?'تصدير JSON':'Export JSON'}
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImportFile}/>
          <button onClick={()=>fileRef.current?.click()} className="btn-secondary text-xs">
            <Upload size={13}/>{language==='ar'?'استيراد JSON':'Import JSON'}
          </button>
        </div>
      </div>

      {importStatus !== 'idle' && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${importStatus==='success'?'bg-green-50 dark:bg-green-900/20 text-green-700':'bg-red-50 dark:bg-red-900/20 text-red-700'}`}>
          {importStatus==='success' ? <CheckCircle size={15}/> : <AlertCircle size={15}/>}
          {importMsg}
        </div>
      )}

      {/* Department print buttons */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
          {language==='ar'?'طباعة تقرير قسم بعينه:':'Print by Department:'}
        </p>
        <div className="flex flex-wrap gap-2">
          {DEPTS.map(d=>(
            <button key={d} onClick={()=>printDeptReport(d)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90"
              style={{background: departmentColors[d]}}>
              <Printer size={12}/>
              {language==='ar'? departmentLabels[d].ar : departmentLabels[d].en}
            </button>
          ))}
        </div>
      </div>

      {/* Engineer productivity chart */}
      {engineers.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{language==='ar'?'إنتاجية الموظفين':'Staff Productivity'}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={engineerData} margin={{top:0,right:0,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30"/>
              <XAxis dataKey="name" tick={{fontSize:10}}/>
              <YAxis tick={{fontSize:10}}/>
              <Tooltip/>
              <Legend wrapperStyle={{fontSize:11}}/>
              <Bar dataKey="planned"   name={language==='ar'?'مخطط':'Planned'}   fill="#e5e7eb" radius={[3,3,0,0]}/>
              <Bar dataKey="completed" name={language==='ar'?'منجز':'Completed'} fill="#3b82f6" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Projects table */}
      {projects.length > 0 && (
        <div className="card overflow-hidden p-0">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{language==='ar'?'ملخص المشاريع':'Projects Summary'}</h3>
          </div>
          <table className="w-full">
            <thead><tr>
              <th className="table-header text-start">{language==='ar'?'المشروع':'Project'}</th>
              <th className="table-header text-start">{language==='ar'?'القسم':'Dept'}</th>
              <th className="table-header text-start">{language==='ar'?'الحالة':'Status'}</th>
              <th className="table-header text-start">{language==='ar'?'التقدم':'Progress'}</th>
              <th className="table-header text-start">{language==='ar'?'الساعات':'Hours'}</th>
              <th className="table-header text-start">{language==='ar'?'التسليم':'Deadline'}</th>
            </tr></thead>
            <tbody>
              {projects.map(p=>{
                const sc = statusConfig[p.status];
                const dl = departmentLabels[p.department];
                return (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="table-cell font-medium">{language==='ar'?p.nameAr||p.name:p.name}</td>
                    <td className="table-cell">
                      <span className="text-[10px] text-white px-2 py-0.5 rounded-full" style={{background:departmentColors[p.department]}}>
                        {language==='ar'?dl.ar:dl.en}
                      </span>
                    </td>
                    <td className="table-cell"><span className={sc.badge}>{language==='ar'?sc.label.ar:sc.label.en}</span></td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="progress-bar w-16"><div className="progress-fill bg-blue-500" style={{width:`${p.progress}%`}}/></div>
                        <span className="text-xs">{p.progress}%</span>
                      </div>
                    </td>
                    <td className="table-cell">{p.completedHours}/{p.totalHours}h</td>
                    <td className="table-cell font-medium">{p.deadline||'-'}</td>
                  </tr>
                );
              })}
            </tbody>
            {projects.length > 1 && (
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-900/50 font-semibold">
                  <td className="table-cell" colSpan={3}>{language==='ar'?'الإجمالي':'Total'}</td>
                  <td className="table-cell">{Math.round(projects.reduce((s,p)=>s+p.progress,0)/projects.length)}%</td>
                  <td className="table-cell">{totals.completed}/{totals.planned}h</td>
                  <td className="table-cell"/>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {projects.length===0 && engineers.length===0 && (
        <div className="card flex flex-col items-center justify-center py-16 text-gray-400">
          <BarChart3 size={40} className="mb-3 opacity-30"/>
          <p className="text-sm">{language==='ar'?'أضف مشاريع ومهندسين لرؤية التقارير':'Add projects and engineers to see reports'}</p>
        </div>
      )}
    </div>
  );
};

export default Reports;
