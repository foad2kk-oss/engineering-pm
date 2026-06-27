import type { Engineer, Project, Task, Meeting, Client, Notification } from '../types';

export const mockEngineers: Engineer[] = [];
export const mockProjects: Project[] = [];
export const mockTasks: Task[] = [];
export const mockMeetings: Meeting[] = [];
export const mockClients: Client[] = [];
export const mockNotifications: Notification[] = [];

export const departmentColors: Record<string, string> = {
  architectural: '#3b82f6',
  structural: '#10b981',
  mechanical: '#f59e0b',
  electrical: '#ef4444',
};

export const departmentLabels: Record<string, { en: string; ar: string }> = {
  architectural: { en: 'Architectural', ar: 'معماري' },
  structural: { en: 'Structural', ar: 'إنشائي' },
  mechanical: { en: 'Mechanical', ar: 'ميكانيكي' },
  electrical: { en: 'Electrical', ar: 'كهربائي' },
};

export const statusConfig = {
  'on-time': { badge: 'badge-green', label: { en: 'On Time', ar: 'في الموعد' } },
  'at-risk': { badge: 'badge-yellow', label: { en: 'At Risk', ar: 'في خطر' } },
  'delayed': { badge: 'badge-red', label: { en: 'Delayed', ar: 'متأخر' } },
  'completed': { badge: 'badge-blue', label: { en: 'Completed', ar: 'مكتمل' } },
  'planning': { badge: 'badge-gray', label: { en: 'Planning', ar: 'تخطيط' } },
};

export const priorityConfig = {
  low: { class: 'text-gray-500', label: { en: 'Low', ar: 'منخفضة' } },
  medium: { class: 'text-blue-500', label: { en: 'Medium', ar: 'متوسطة' } },
  high: { class: 'text-orange-500', label: { en: 'High', ar: 'عالية' } },
  urgent: { class: 'text-red-500', label: { en: 'Urgent', ar: 'عاجل' } },
};
