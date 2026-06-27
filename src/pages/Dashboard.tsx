import React, { useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useData } from '../contexts/DataContext';
import {
  FolderKanban, AlertTriangle, CheckCircle2, Users, Clock, TrendingUp,
  Calendar, Phone, ArrowUpRight, Plus
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { departmentColors, departmentLabels } from '../data/mockData';

const DEPT_KEYS = ['architectural', 'structural', 'mechanical', 'electrical'] as const;

const StatCard: React.FC<{
  title: string; value: string | number; icon: React.ReactNode;
  color: string; subtitle?: string; trend?: string;
}> = React.memo(({ title, value, icon, color, subtitle, trend }) => (
  <div className="card flex items-start gap-4">
    <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{title}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      {trend && (
        <div className="flex items-center gap-1 mt-1 text-xs font-medium text-green-600">
          <ArrowUpRight size={12} />{trend}
        </div>
      )}
    </div>
  </div>
));

const EmptyState: React.FC<{ message: string; sub?: string }> = ({ message, sub }) => (
  <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-600">
    <Plus size={32} className="mb-2 opacity-40" />
    <p className="text-sm font-medium">{message}</p>
    {sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}
  </div>
);

const Dashboard: React.FC = () => {
  const { t, language } = useApp();
  const { projects, tasks, meetings, clients, engineers } = useData();

  const today = '2026-06-27';

  const stats = useMemo(() => {
    const running   = projects.filter(p => p.status !== 'completed').length;
    const delayed   = projects.filter(p => p.status === 'delayed').length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const totalPlanned   = projects.reduce((s, p) => s + p.totalHours, 0);
    const totalCompleted = projects.reduce((s, p) => s + p.completedHours, 0);
    const avgUtil = engineers.length
      ? Math.round(engineers.reduce((s, e) => s + e.utilization, 0) / engineers.length)
      : 0;
    const todayMeetings  = meetings.filter(m => m.date === today).length;
    const todayFollowups = clients.filter(c => c.nextFollowUp === today).length;
    return { running, delayed, completed, totalPlanned, totalCompleted, avgUtil, todayMeetings, todayFollowups };
  }, [projects, engineers, meetings, clients]);

  const deptData = useMemo(() =>
    DEPT_KEYS.map(d => {
      const dProjects  = projects.filter(p => p.department === d);
      const dEngineers = engineers.filter(e => e.department === d);
      return {
        dept:     language === 'ar' ? departmentLabels[d].ar : departmentLabels[d].en,
        planned:  dProjects.reduce((s, p) => s + p.totalHours, 0),
        completed:dProjects.reduce((s, p) => s + p.completedHours, 0),
        engineers:dEngineers.length,
      };
    }),
  [projects, engineers, language]);

  const statusPieData = useMemo(() => {
    const onTime   = projects.filter(p => p.status === 'on-time').length;
    const atRisk   = projects.filter(p => p.status === 'at-risk').length;
    const delayed  = projects.filter(p => p.status === 'delayed').length;
    const planning = projects.filter(p => p.status === 'planning').length;
    return [
      { name: language === 'ar' ? 'في الموعد'  : 'On Time',  value: onTime,   color: '#10b981' },
      { name: language === 'ar' ? 'في خطر'     : 'At Risk',  value: atRisk,   color: '#f59e0b' },
      { name: language === 'ar' ? 'متأخر'      : 'Delayed',  value: delayed,  color: '#ef4444' },
      { name: language === 'ar' ? 'تخطيط'      : 'Planning', value: planning, color: '#6b7280' },
    ].filter(d => d.value > 0);
  }, [projects, language]);

  const todayTasks = useMemo(() => tasks.filter(t => t.date === today), [tasks]);

  const statusColors: Record<string, string> = {
    'on-time':'bg-green-500','at-risk':'bg-yellow-500',
    'delayed':'bg-red-500','completed':'bg-blue-500','planning':'bg-gray-400',
  };
  const taskStatusBadge: Record<string, string> = {
    'pending':'badge-gray','in-progress':'badge-blue','completed':'badge-green','overdue':'badge-red',
  };
  const taskStatusLabel: Record<string, {en:string;ar:string}> = {
    'pending':    {en:'Pending',    ar:'انتظار'},
    'in-progress':{en:'In Progress',ar:'جارية'},
    'completed':  {en:'Done',       ar:'مكتمل'},
    'overdue':    {en:'Overdue',    ar:'متأخرة'},
  };

  return (
    <div className="space-y-5 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('dashboard')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {language === 'ar' ? 'الجمعة، 27 يونيو 2026' : 'Friday, June 27, 2026'}
          </p>
        </div>
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t('projectsRunning')}   value={stats.running}   icon={<FolderKanban size={20} className="text-white"/>} color="bg-blue-500"   subtitle={`${projects.length} ${language==='ar'?'إجمالي':'total'}`} />
        <StatCard title={t('projectsDelayed')}   value={stats.delayed}   icon={<AlertTriangle size={20} className="text-white"/>} color="bg-red-500" />
        <StatCard title={t('projectsCompleted')} value={stats.completed} icon={<CheckCircle2 size={20} className="text-white"/>} color="bg-green-500" />
        <StatCard title={t('engineerUtilization')} value={engineers.length ? `${stats.avgUtil}%` : '-'} icon={<Users size={20} className="text-white"/>} color="bg-purple-500" subtitle={`${engineers.length} ${language==='ar'?'مهندس':'engineers'}`} />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t('plannedHours')}   value={stats.totalPlanned.toLocaleString()}   icon={<Clock size={20} className="text-white"/>}     color="bg-amber-500" />
        <StatCard title={t('completedHours')} value={stats.totalCompleted.toLocaleString()} icon={<TrendingUp size={20} className="text-white"/>} color="bg-teal-500"
          subtitle={stats.totalPlanned ? `${Math.round(stats.totalCompleted/stats.totalPlanned*100)}%` : '0%'} />
        <StatCard title={t('meetingsToday')}  value={stats.todayMeetings}  icon={<Calendar size={20} className="text-white"/>} color="bg-indigo-500" />
        <StatCard title={t('followupsToday')} value={stats.todayFollowups} icon={<Phone size={20} className="text-white"/>}    color="bg-rose-500" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t('departmentWorkload')}</h3>
          {deptData.some(d => d.planned > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deptData} margin={{top:0,right:10,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30"/>
                <XAxis dataKey="dept" tick={{fontSize:11}}/>
                <YAxis tick={{fontSize:11}}/>
                <Tooltip formatter={(v)=>[`${v} hrs`,'']}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Bar dataKey="planned"   name={language==='ar'?'مخطط':'Planned'}   fill="#3b82f6" radius={[4,4,0,0]}/>
                <Bar dataKey="completed" name={language==='ar'?'منجز':'Completed'} fill="#10b981" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message={language==='ar'?'لا توجد مشاريع بعد':'No projects yet'} sub={language==='ar'?'أضف مشاريع لرؤية الإحصائيات':'Add projects to see stats'} />
          )}
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            {language==='ar'?'حالة المشاريع':'Project Status'}
          </h3>
          {statusPieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {statusPieData.map((entry,i) => <Cell key={i} fill={entry.color}/>)}
                  </Pie>
                  <Tooltip/>
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {statusPieData.map((item,i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{background:item.color}}/>
                      <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState message={language==='ar'?'لا توجد مشاريع':'No projects'} />
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Projects */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t('recentProjects')}</h3>
          {projects.length > 0 ? (
            <div className="space-y-3">
              {projects.slice(0,5).map(p => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[p.status]}`}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                      {language==='ar'? p.nameAr : p.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="progress-bar flex-1">
                        <div className="progress-fill bg-blue-500" style={{width:`${p.progress}%`}}/>
                      </div>
                      <span className="text-[10px] text-gray-500 w-8 text-end">{p.progress}%</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">{p.deadline}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message={language==='ar'?'لا توجد مشاريع بعد':'No projects yet'} sub={language==='ar'?'اذهب إلى المشاريع لإضافة مشروع':'Go to Projects to add one'} />
          )}
        </div>

        {/* Today's Tasks */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t('todayTasks')}</h3>
          {todayTasks.length > 0 ? (
            <div className="space-y-2">
              {todayTasks.slice(0,5).map(task => (
                <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                      {language==='ar'? task.titleAr : task.title}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{task.engineerName} • {task.hours}h</p>
                  </div>
                  <span className={taskStatusBadge[task.status]}>
                    {language==='ar'? taskStatusLabel[task.status].ar : taskStatusLabel[task.status].en}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message={language==='ar'?'لا توجد مهام اليوم':'No tasks today'} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
