import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useData } from '../contexts/DataContext';
import { Plus, Video, Users, MapPin, Clock, Calendar, Repeat, ExternalLink, Trash2 } from 'lucide-react';
import type { Meeting, MeetingType } from '../types';
import Modal from '../components/Modal';

const typeConfig = {
  internal:  { color:'badge-blue',   bg:'bg-blue-500',   icon:<Users size={12}/>,   label:{en:'Internal', ar:'داخلي'} },
  client:    { color:'badge-green',  bg:'bg-green-500',  icon:<Users size={12}/>,   label:{en:'Client',   ar:'مع عميل'} },
  online:    { color:'badge-yellow', bg:'bg-amber-500',  icon:<Video size={12}/>,   label:{en:'Online',   ar:'أونلاين'} },
  recurring: { color:'badge-gray',   bg:'bg-purple-500', icon:<Repeat size={12}/>,  label:{en:'Recurring',ar:'متكرر'} },
};

const WORK_HOURS = Array.from({length:9},(_,i)=>8+i);
const WORK_DAYS_EN = ['Sun','Mon','Tue','Wed','Thu'];
const WORK_DAYS_AR = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس'];

function getWeekDates(): string[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  // Find the Sunday of this week
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - (dayOfWeek === 0 ? 0 : dayOfWeek));
  return Array.from({length:5},(_,i)=>{
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

const defaultForm = (): Omit<Meeting,'id'> => ({
  title:'', titleAr:'', type:'internal',
  date: new Date().toISOString().split('T')[0],
  startTime:'09:00', endTime:'10:00',
  location:'', onlineLink:'', agenda:'', participants:[],
});

const Meetings: React.FC = () => {
  const { t, language } = useApp();
  const { meetings, addMeeting, deleteMeeting } = useData();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(defaultForm());
  const [view, setView]           = useState<'calendar'|'list'>('calendar');

  const weekDates = useMemo(()=>getWeekDates(),[]);
  const today     = new Date().toISOString().split('T')[0];

  const getMeetingsFor = (date:string, hour:number) =>
    meetings.filter(m => m.date===date && parseInt(m.startTime.split(':')[0])===hour);

  const saveMeeting = () => {
    if (!form.title.trim()) return;
    addMeeting({...form, id:`mtg-${Date.now()}`});
    setShowModal(false);
    setForm(defaultForm());
  };

  const upcoming = useMemo(()=>
    [...meetings].sort((a,b)=>a.date.localeCompare(b.date))
  ,[meetings]);

  const typeCounts = useMemo(()=>
    Object.fromEntries(
      (Object.keys(typeConfig) as MeetingType[]).map(k=>[k, meetings.filter(m=>m.type===k).length])
    )
  ,[meetings]);

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('meetings')}</h1>
        <div className="flex gap-2">
          <button onClick={()=>setView(v=>v==='calendar'?'list':'calendar')} className="btn-secondary">
            <Calendar size={15}/>
            {view==='calendar'?(language==='ar'?'قائمة':'List'):(language==='ar'?'تقويم':'Calendar')}
          </button>
          <button className="btn-primary" onClick={()=>setShowModal(true)}>
            <Plus size={16}/>{t('newMeeting')}
          </button>
        </div>
      </div>

      {/* Type counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.entries(typeConfig) as [MeetingType, typeof typeConfig.internal][]).map(([type,cfg])=>(
          <div key={type} className="card p-3 text-center">
            <div className={`flex items-center justify-center gap-1.5 mb-1 ${type==='internal'?'text-blue-600':type==='client'?'text-green-600':type==='online'?'text-amber-600':'text-purple-600'}`}>
              {cfg.icon}<span className="text-xs font-medium">{language==='ar'?cfg.label.ar:cfg.label.en}</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{typeCounts[type]}</p>
          </div>
        ))}
      </div>

      {meetings.length===0 && (
        <div className="card flex flex-col items-center justify-center py-16 text-gray-400">
          <Calendar size={40} className="mb-3 opacity-30"/>
          <p className="text-sm font-medium">{language==='ar'?'لا توجد اجتماعات بعد':'No meetings yet'}</p>
          <button className="btn-primary mt-4 text-xs" onClick={()=>setShowModal(true)}><Plus size={14}/>{t('newMeeting')}</button>
        </div>
      )}

      {view==='calendar' && meetings.length>0 && (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <div style={{minWidth:680}}>
              {/* Day headers */}
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                <div className="w-14 flex-shrink-0 bg-gray-50 dark:bg-gray-900/50"/>
                {weekDates.map((date,i)=>{
                  const isToday = date===today;
                  return (
                    <div key={date} className={`flex-1 text-center py-3 border-s border-gray-200 dark:border-gray-700 ${isToday?'bg-blue-50 dark:bg-blue-900/20':''}`}>
                      <p className="text-[10px] text-gray-500 font-medium uppercase">{language==='ar'?WORK_DAYS_AR[i]:WORK_DAYS_EN[i]}</p>
                      <p className={`text-sm font-bold mt-0.5 ${isToday?'text-blue-600':'text-gray-900 dark:text-white'}`}>
                        {new Date(date+'T12:00:00').getDate()}
                      </p>
                    </div>
                  );
                })}
              </div>
              {/* Time rows */}
              {WORK_HOURS.map(hour=>(
                <div key={hour} className="flex border-b border-gray-100 dark:border-gray-700/50 min-h-14">
                  <div className="w-14 flex-shrink-0 bg-gray-50 dark:bg-gray-900/30 flex items-start justify-center pt-1">
                    <span className="text-[10px] text-gray-400">{hour}:00</span>
                  </div>
                  {weekDates.map(date=>{
                    const slotMtgs = getMeetingsFor(date,hour);
                    const isToday  = date===today;
                    return (
                      <div key={date} className={`flex-1 border-s border-gray-100 dark:border-gray-700/50 p-1 ${isToday?'bg-blue-50/30 dark:bg-blue-900/10':''}`}>
                        {slotMtgs.map(m=>(
                          <div key={m.id} className={`${typeConfig[m.type].bg} rounded p-1.5 mb-1 cursor-pointer hover:opacity-90`}>
                            <p className="text-[10px] text-white font-medium truncate">{language==='ar'?m.titleAr||m.title:m.title}</p>
                            <p className="text-[9px] text-white/80">{m.startTime}–{m.endTime}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view==='list' && meetings.length>0 && (
        <div className="space-y-3">
          {upcoming.map(m=>{
            const tc = typeConfig[m.type];
            return (
              <div key={m.id} className="card flex items-start gap-4 hover:shadow-md transition-shadow">
                <div className={`w-10 h-10 rounded-xl ${tc.bg} flex items-center justify-center flex-shrink-0`}>
                  <Calendar size={18} className="text-white"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{language==='ar'?m.titleAr||m.title:m.title}</h3>
                    <div className="flex items-center gap-1">
                      <span className={tc.color}>{language==='ar'?tc.label.ar:tc.label.en}</span>
                      <button onClick={()=>deleteMeeting(m.id)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600">
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Calendar size={11}/>{m.date}</span>
                    <span className="flex items-center gap-1"><Clock size={11}/>{m.startTime}–{m.endTime}</span>
                    {m.location && <span className="flex items-center gap-1"><MapPin size={11}/>{m.location}</span>}
                    {m.onlineLink && <a href={m.onlineLink} className="flex items-center gap-1 text-blue-600"><ExternalLink size={11}/>Join</a>}
                  </div>
                  {m.agenda && <p className="text-xs text-gray-400 mt-1 truncate">{m.agenda}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Meeting Modal */}
      <Modal isOpen={showModal} onClose={()=>setShowModal(false)} title={t('newMeeting')} maxWidth="max-w-xl"
        footer={<><button className="btn-secondary" onClick={()=>setShowModal(false)}>{t('cancel')}</button><button className="btn-primary" onClick={saveMeeting}>{t('save')}</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">{t('meetingTitle')} <span className="text-red-500">*</span></label>
            <input className="input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
          </div>
          <div>
            <label className="label">{t('meetingType')}</label>
            <select className="input" value={form.type} onChange={e=>setForm({...form,type:e.target.value as MeetingType})}>
              {(Object.entries(typeConfig) as [MeetingType,typeof typeConfig.internal][]).map(([k,v])=>(
                <option key={k} value={k}>{language==='ar'?v.label.ar:v.label.en}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('date')}</label>
            <input type="date" className="input" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
          </div>
          <div>
            <label className="label">{language==='ar'?'وقت البداية':'Start Time'}</label>
            <input type="time" className="input" value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})}/>
          </div>
          <div>
            <label className="label">{language==='ar'?'وقت الانتهاء':'End Time'}</label>
            <input type="time" className="input" value={form.endTime} onChange={e=>setForm({...form,endTime:e.target.value})}/>
          </div>
          {form.type==='online'
            ? <div className="col-span-2"><label className="label">{t('onlineLink')}</label><input className="input" value={form.onlineLink} onChange={e=>setForm({...form,onlineLink:e.target.value})} placeholder="https://meet.google.com/..."/></div>
            : <div className="col-span-2"><label className="label">{t('meetingRoom')}</label><input className="input" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Conference Room A"/></div>
          }
          <div className="col-span-2">
            <label className="label">{t('agenda')}</label>
            <textarea className="input h-20 resize-none" value={form.agenda} onChange={e=>setForm({...form,agenda:e.target.value})}/>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Meetings;
