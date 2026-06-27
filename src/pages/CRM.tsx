import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useData } from '../contexts/DataContext';
import { Plus, Phone, Mail, MessageSquare, MapPin, Search, Calendar, Star, Briefcase, Trash2 } from 'lucide-react';
import type { Client, ClientStatus, Priority } from '../types';
import Modal from '../components/Modal';

const STAGES: ClientStatus[] = ['lead','qualified','proposal','negotiation','won','lost'];

const stageCfg: Record<ClientStatus,{label:{en:string;ar:string};color:string;bg:string}> = {
  lead:        {label:{en:'Lead',       ar:'عميل محتمل'}, color:'text-gray-600',   bg:'bg-gray-100 dark:bg-gray-700'},
  qualified:   {label:{en:'Qualified',  ar:'مؤهل'},       color:'text-blue-600',   bg:'bg-blue-50 dark:bg-blue-900/20'},
  proposal:    {label:{en:'Proposal',   ar:'عرض مقدم'},   color:'text-purple-600', bg:'bg-purple-50 dark:bg-purple-900/20'},
  negotiation: {label:{en:'Negotiation',ar:'تفاوض'},      color:'text-amber-600',  bg:'bg-amber-50 dark:bg-amber-900/20'},
  won:         {label:{en:'Won',        ar:'تم الفوز'},   color:'text-green-600',  bg:'bg-green-50 dark:bg-green-900/20'},
  lost:        {label:{en:'Lost',       ar:'خسارة'},      color:'text-red-600',    bg:'bg-red-50 dark:bg-red-900/20'},
};

const priorityStars: Record<Priority,number> = {low:1,medium:2,high:3,urgent:4};
const priorityColor: Record<Priority,string> = {low:'text-gray-400',medium:'text-blue-400',high:'text-orange-400',urgent:'text-red-400'};

const defaultForm = (): Omit<Client,'id'|'projects'|'value'> => ({
  name:'', company:'', position:'', email:'', phone:'', whatsapp:'',
  city:'', source:'Referral', status:'lead', priority:'medium', notes:'',
});

const CRM: React.FC = () => {
  const { t, language } = useApp();
  const { clients, addClient, updateClient, deleteClient } = useData();

  const [search, setSearch]           = useState('');
  const [view, setView]               = useState<'kanban'|'list'>('kanban');
  const [showModal, setShowModal]     = useState(false);
  const [form, setForm]               = useState(defaultForm());
  const [selectedClient, setSelected] = useState<Client|null>(null);
  const [errors, setErrors]           = useState<Record<string,string>>({});

  const filtered = useMemo(()=> clients.filter(c=>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company.toLowerCase().includes(search.toLowerCase())
  ),[clients,search]);

  const validate = () => {
    const e: Record<string,string> = {};
    if (!form.name.trim())  e.name  = language==='ar'?'مطلوب':'Required';
    if (!form.phone.trim()) e.phone = language==='ar'?'مطلوب':'Required';
    setErrors(e);
    return Object.keys(e).length===0;
  };

  const save = () => {
    if (!validate()) return;
    addClient({...form, id:`cli-${Date.now()}`, projects:[], value:0});
    setShowModal(false);
    setForm(defaultForm());
  };

  const summary = useMemo(()=>({
    total:    clients.length,
    won:      clients.filter(c=>c.status==='won').length,
    totalVal: clients.filter(c=>c.status==='won').reduce((s,c)=>s+(c.value||0),0),
    followup: clients.filter(c=>c.nextFollowUp===new Date().toISOString().split('T')[0]).length,
  }),[clients]);

  const ClientCard: React.FC<{client:Client}> = React.memo(({client})=>(
    <div className="kanban-card" onClick={()=>setSelected(client)}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-xs font-semibold text-gray-900 dark:text-white">{client.name}</h4>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">{client.company}</p>
        </div>
        <div className={`flex ${priorityColor[client.priority]}`}>
          {Array.from({length:priorityStars[client.priority]}).map((_,i)=><Star key={i} size={10} fill="currentColor"/>)}
        </div>
      </div>
      {client.city && <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-2"><MapPin size={10}/>{client.city}</div>}
      {client.nextFollowUp && (
        <div className="flex items-center gap-1 text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-md mb-2">
          <Calendar size={10}/>{language==='ar'?'متابعة: ':'Follow-up: '}{client.nextFollowUp}
        </div>
      )}
      <div className="flex items-center gap-1">
        <a href={`tel:${client.phone}`} onClick={e=>e.stopPropagation()} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><Phone size={12}/></a>
        <a href={`mailto:${client.email}`} onClick={e=>e.stopPropagation()} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><Mail size={12}/></a>
        {client.whatsapp && <a href={`https://wa.me/${client.whatsapp}`} onClick={e=>e.stopPropagation()} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-green-600"><MessageSquare size={12}/></a>}
        <button onClick={e=>{e.stopPropagation();deleteClient(client.id);}} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600 ms-auto"><Trash2 size={12}/></button>
      </div>
    </div>
  ));

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('crm')}</h1>
        <div className="flex gap-2">
          <button onClick={()=>setView(v=>v==='kanban'?'list':'kanban')} className="btn-secondary">
            {view==='kanban'?(language==='ar'?'قائمة':'List'):(language==='ar'?'كانبان':'Kanban')}
          </button>
          <button className="btn-primary" onClick={()=>setShowModal(true)}>
            <Plus size={16}/>{t('newClient')}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-3 text-center"><p className="text-xl font-bold text-gray-900 dark:text-white">{summary.total}</p><p className="text-xs text-gray-500">{language==='ar'?'إجمالي العملاء':'Total Clients'}</p></div>
        <div className="card p-3 text-center"><p className="text-xl font-bold text-green-600">{summary.won}</p><p className="text-xs text-gray-500">{language==='ar'?'عملاء فائزون':'Won Clients'}</p></div>
        <div className="card p-3 text-center"><p className="text-xl font-bold text-blue-600">{summary.totalVal>0?`${(summary.totalVal/1000000).toFixed(1)}M`:'-'}</p><p className="text-xs text-gray-500">SAR</p></div>
        <div className="card p-3 text-center"><p className="text-xl font-bold text-amber-600">{summary.followup}</p><p className="text-xs text-gray-500">{t('followupsToday')}</p></div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input className="input ps-9" placeholder={t('search')} value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {clients.length===0 && (
        <div className="card flex flex-col items-center justify-center py-16 text-gray-400">
          <Briefcase size={40} className="mb-3 opacity-30"/>
          <p className="text-sm font-medium">{language==='ar'?'لا يوجد عملاء بعد':'No clients yet'}</p>
          <button className="btn-primary mt-4 text-xs" onClick={()=>setShowModal(true)}><Plus size={14}/>{t('newClient')}</button>
        </div>
      )}

      {/* Kanban */}
      {view==='kanban' && clients.length>0 && (
        <div className="flex gap-4 overflow-x-auto pb-3">
          {STAGES.map(stage=>{
            const sc = stageCfg[stage];
            const col = filtered.filter(c=>c.status===stage);
            return (
              <div key={stage} className="kanban-column">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold ${sc.color}`}>{language==='ar'?sc.label.ar:sc.label.en}</span>
                  <span className="text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5">{col.length}</span>
                </div>
                {col.map(c=><ClientCard key={c.id} client={c}/>)}
              </div>
            );
          })}
        </div>
      )}

      {/* List */}
      {view==='list' && clients.length>0 && (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead><tr>
              <th className="table-header text-start">{t('name')}</th>
              <th className="table-header text-start">{t('company')}</th>
              <th className="table-header text-start">{t('phone')}</th>
              <th className="table-header text-start">{t('city')}</th>
              <th className="table-header text-start">{t('status')}</th>
              <th className="table-header text-start">{t('actions')}</th>
            </tr></thead>
            <tbody>
              {filtered.map(c=>{
                const sc = stageCfg[c.status];
                return (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={()=>setSelected(c)}>
                    <td className="table-cell"><p className="font-medium text-gray-900 dark:text-white">{c.name}</p><p className="text-[10px] text-gray-500">{c.position}</p></td>
                    <td className="table-cell">{c.company}</td>
                    <td className="table-cell">{c.phone}</td>
                    <td className="table-cell">{c.city}</td>
                    <td className="table-cell"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>{language==='ar'?sc.label.ar:sc.label.en}</span></td>
                    <td className="table-cell">
                      <div className="flex gap-1">
                        <a href={`tel:${c.phone}`} onClick={e=>e.stopPropagation()} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><Phone size={13}/></a>
                        <a href={`mailto:${c.email}`} onClick={e=>e.stopPropagation()} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><Mail size={13}/></a>
                        <button onClick={e=>{e.stopPropagation();deleteClient(c.id);}} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600"><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Client Detail Modal */}
      {selectedClient && (
        <Modal isOpen={!!selectedClient} onClose={()=>setSelected(null)} title={selectedClient.name} maxWidth="max-w-md"
          footer={<button className="btn-secondary" onClick={()=>setSelected(null)}>{t('close')}</button>}>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {selectedClient.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{selectedClient.name}</h3>
                <p className="text-sm text-gray-500">{selectedClient.position} — {selectedClient.company}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stageCfg[selectedClient.status].bg} ${stageCfg[selectedClient.status].color} inline-block mt-1`}>
                  {language==='ar'?stageCfg[selectedClient.status].label.ar:stageCfg[selectedClient.status].label.en}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-500">{t('phone')}</p><p className="font-medium">{selectedClient.phone||'-'}</p></div>
              <div><p className="text-xs text-gray-500">{t('email')}</p><p className="font-medium text-xs">{selectedClient.email||'-'}</p></div>
              <div><p className="text-xs text-gray-500">{t('city')}</p><p className="font-medium">{selectedClient.city||'-'}</p></div>
              <div><p className="text-xs text-gray-500">{t('source')}</p><p className="font-medium">{selectedClient.source||'-'}</p></div>
            </div>
            {selectedClient.notes && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">{t('notes')}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{selectedClient.notes}</p>
              </div>
            )}
            <div className="flex gap-2">
              <a href={`tel:${selectedClient.phone}`} className="btn-primary flex-1 justify-center text-xs"><Phone size={13}/>{t('phone')}</a>
              <a href={`mailto:${selectedClient.email}`} className="btn-secondary flex-1 justify-center text-xs"><Mail size={13}/>{t('email')}</a>
              {selectedClient.whatsapp && <a href={`https://wa.me/${selectedClient.whatsapp}`} className="btn-secondary flex-1 justify-center text-xs text-green-600"><MessageSquare size={13}/>WA</a>}
            </div>
          </div>
        </Modal>
      )}

      {/* New Client Modal */}
      <Modal isOpen={showModal} onClose={()=>setShowModal(false)} title={t('newClient')} maxWidth="max-w-xl"
        footer={<><button className="btn-secondary" onClick={()=>setShowModal(false)}>{t('cancel')}</button><button className="btn-primary" onClick={save}>{t('save')}</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">{t('name')} <span className="text-red-500">*</span></label>
            <input className={`input ${errors.name?'border-red-400':''}`} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div><label className="label">{t('company')}</label><input className="input" value={form.company} onChange={e=>setForm({...form,company:e.target.value})}/></div>
          <div><label className="label">{t('position')}</label><input className="input" value={form.position} onChange={e=>setForm({...form,position:e.target.value})}/></div>
          <div>
            <label className="label">{t('phone')} <span className="text-red-500">*</span></label>
            <input type="tel" className={`input ${errors.phone?'border-red-400':''}`} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>
          <div><label className="label">{t('email')}</label><input type="email" className="input" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
          <div><label className="label">{t('whatsapp')}</label><input type="tel" className="input" value={form.whatsapp} onChange={e=>setForm({...form,whatsapp:e.target.value})}/></div>
          <div><label className="label">{t('city')}</label><input className="input" value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></div>
          <div><label className="label">{t('source')}</label>
            <select className="input" value={form.source} onChange={e=>setForm({...form,source:e.target.value})}>
              {['Referral','Website','LinkedIn','Exhibition','Government Tender','Cold Call'].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div><label className="label">{t('status')}</label>
            <select className="input" value={form.status} onChange={e=>setForm({...form,status:e.target.value as ClientStatus})}>
              {STAGES.map(s=><option key={s} value={s}>{language==='ar'?stageCfg[s].label.ar:stageCfg[s].label.en}</option>)}
            </select>
          </div>
          <div><label className="label">{t('priority')}</label>
            <select className="input" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value as Priority})}>
              <option value="low">{t('low')}</option><option value="medium">{t('medium')}</option>
              <option value="high">{t('high')}</option><option value="urgent">{t('urgent')}</option>
            </select>
          </div>
          <div className="col-span-2"><label className="label">{t('notes')}</label><textarea className="input h-16 resize-none" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
        </div>
      </Modal>
    </div>
  );
};

export default CRM;
