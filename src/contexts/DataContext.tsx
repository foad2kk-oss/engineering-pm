import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Engineer, Project, Task, Meeting, Client, Notification } from '../types';
import { db } from '../lib/firebase';
import {
  collection, doc, onSnapshot,
  setDoc, deleteDoc,
} from 'firebase/firestore';
import type { QuerySnapshot, DocumentData } from 'firebase/firestore';

interface DataContextType {
  engineers: Engineer[];
  projects: Project[];
  tasks: Task[];
  meetings: Meeting[];
  clients: Client[];
  notifications: Notification[];
  loading: boolean;
  addEngineer: (e: Engineer) => void;
  updateEngineer: (e: Engineer) => void;
  deleteEngineer: (id: string) => void;
  addProject: (p: Project) => void;
  updateProject: (p: Project) => void;
  deleteProject: (id: string) => void;
  addTask: (t: Task) => void;
  addMeeting: (m: Meeting) => void;
  deleteMeeting: (id: string) => void;
  addClient: (c: Client) => void;
  updateClient: (c: Client) => void;
  deleteClient: (id: string) => void;
}

const DataContext = createContext<DataContextType | null>(null);

// Helper: map Firestore snapshot → typed array
function snapToArr<T>(snap: QuerySnapshot<DocumentData>): T[] {
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as T));
}

// Helper: upsert a doc (set with merge)
async function upsert(col: string, id: string, data: object) {
  await setDoc(doc(db, col, id), data, { merge: true });
}

// Helper: remove a doc
async function remove(col: string, id: string) {
  await deleteDoc(doc(db, col, id));
}

// Fallback localStorage (used while Firestore loads to avoid blank screen)
function loadLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function saveLS<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [engineers,     setEngineers]     = useState<Engineer[]>    (() => loadLS('pm_engineers',     []));
  const [projects,      setProjects]      = useState<Project[]>     (() => loadLS('pm_projects',      []));
  const [tasks,         setTasks]         = useState<Task[]>        (() => loadLS('pm_tasks',         []));
  const [meetings,      setMeetings]      = useState<Meeting[]>     (() => loadLS('pm_meetings',      []));
  const [clients,       setClients]       = useState<Client[]>      (() => loadLS('pm_clients',       []));
  const [notifications, setNotifications] = useState<Notification[]>(() => loadLS('pm_notifications', []));
  const [loading,       setLoading]       = useState(true);

  // Subscribe to Firestore collections (real-time sync)
  useEffect(() => {
    let done = 0;
    const total = 6;
    const checkDone = () => { done++; if (done >= total) setLoading(false); };

    // Fallback: if Firebase doesn't respond in 8 seconds, stop loading anyway
    const timeout = setTimeout(() => setLoading(false), 8000);

    const unsubs = [
      onSnapshot(collection(db, 'engineers'), snap => {
        const data = snapToArr<Engineer>(snap);
        setEngineers(data);
        saveLS('pm_engineers', data);
        checkDone();
      }),
      onSnapshot(collection(db, 'projects'), snap => {
        const data = snapToArr<Project>(snap);
        setProjects(data);
        saveLS('pm_projects', data);
        checkDone();
      }),
      onSnapshot(collection(db, 'tasks'), snap => {
        const data = snapToArr<Task>(snap);
        setTasks(data);
        saveLS('pm_tasks', data);
        checkDone();
      }),
      onSnapshot(collection(db, 'meetings'), snap => {
        const data = snapToArr<Meeting>(snap);
        setMeetings(data);
        saveLS('pm_meetings', data);
        checkDone();
      }),
      onSnapshot(collection(db, 'clients'), snap => {
        const data = snapToArr<Client>(snap);
        setClients(data);
        saveLS('pm_clients', data);
        checkDone();
      }),
      onSnapshot(collection(db, 'notifications'), snap => {
        const data = snapToArr<Notification>(snap);
        setNotifications(data);
        saveLS('pm_notifications', data);
        checkDone();
      }),
    ];

    return () => { clearTimeout(timeout); unsubs.forEach(u => u()); };
  }, []);

  // Engineers — optimistic update then sync to Firestore
  const addEngineer    = useCallback((e: Engineer) => {
    setEngineers(prev => { const next = [...prev.filter(x=>x.id!==e.id), e]; saveLS('pm_engineers', next); return next; });
    upsert('engineers', e.id, e);
  }, []);
  const updateEngineer = useCallback((e: Engineer) => {
    setEngineers(prev => { const next = prev.map(x=>x.id===e.id?e:x); saveLS('pm_engineers', next); return next; });
    upsert('engineers', e.id, e);
  }, []);
  const deleteEngineer = useCallback((id: string) => {
    setEngineers(prev => { const next = prev.filter(x=>x.id!==id); saveLS('pm_engineers', next); return next; });
    remove('engineers', id);
  }, []);

  // Projects — optimistic update then sync to Firestore
  const addProject = useCallback((p: Project) => {
    // Strip undefined fields so Firestore doesn't reject them
    const clean = Object.fromEntries(Object.entries(p).filter(([,v])=>v!==undefined)) as Project;
    setProjects(prev => { const next = [...prev.filter(x=>x.id!==clean.id), clean]; saveLS('pm_projects', next); return next; });
    upsert('projects', clean.id, clean);
  }, []);
  const updateProject = useCallback((p: Project) => {
    const clean = Object.fromEntries(Object.entries(p).filter(([,v])=>v!==undefined)) as Project;
    setProjects(prev => { const next = prev.map(x=>x.id===clean.id?clean:x); saveLS('pm_projects', next); return next; });
    upsert('projects', clean.id, clean);
  }, []);
  const deleteProject = useCallback((id: string) => {
    setProjects(prev => { const next = prev.filter(x=>x.id!==id); saveLS('pm_projects', next); return next; });
    remove('projects', id);
  }, []);

  // Tasks
  const addTask = useCallback((t: Task) => {
    setTasks(prev => { const next = [...prev.filter(x=>x.id!==t.id), t]; saveLS('pm_tasks', next); return next; });
    upsert('tasks', t.id, t);
  }, []);

  // Meetings
  const addMeeting = useCallback((m: Meeting) => {
    setMeetings(prev => { const next = [...prev.filter(x=>x.id!==m.id), m]; saveLS('pm_meetings', next); return next; });
    upsert('meetings', m.id, m);
  }, []);
  const deleteMeeting = useCallback((id: string) => {
    setMeetings(prev => { const next = prev.filter(x=>x.id!==id); saveLS('pm_meetings', next); return next; });
    remove('meetings', id);
  }, []);

  // Clients
  const addClient = useCallback((c: Client) => {
    setClients(prev => { const next = [...prev.filter(x=>x.id!==c.id), c]; saveLS('pm_clients', next); return next; });
    upsert('clients', c.id, c);
  }, []);
  const updateClient = useCallback((c: Client) => {
    setClients(prev => { const next = prev.map(x=>x.id===c.id?c:x); saveLS('pm_clients', next); return next; });
    upsert('clients', c.id, c);
  }, []);
  const deleteClient = useCallback((id: string) => {
    setClients(prev => { const next = prev.filter(x=>x.id!==id); saveLS('pm_clients', next); return next; });
    remove('clients', id);
  }, []);

  return (
    <DataContext.Provider value={{
      engineers, projects, tasks, meetings, clients, notifications,
      loading,
      addEngineer, updateEngineer, deleteEngineer,
      addProject, updateProject, deleteProject,
      addTask,
      addMeeting, deleteMeeting,
      addClient, updateClient, deleteClient,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be inside DataProvider');
  return ctx;
};
