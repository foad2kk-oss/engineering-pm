export type Language = 'ar' | 'en';
export type Theme = 'light' | 'dark';
export type Department = 'architectural' | 'structural' | 'mechanical' | 'electrical';
export type ProjectStatus = 'on-time' | 'at-risk' | 'delayed' | 'completed' | 'planning';
export type ProjectType = 'factory' | 'commercial' | 'gas-station' | 'residential' | 'other';
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'overdue';
export type UserRole = 'admin' | 'project-manager' | 'department-manager' | 'engineer' | 'sales-manager' | 'general-manager';
export type ClientStatus = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type MeetingType = 'internal' | 'client' | 'online' | 'recurring';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Engineer {
  id: string;
  name: string;
  nameAr: string;
  department: Department;
  title: string;
  titleAr: string;
  email: string;
  phone: string;
  avatar?: string;
  workingHours: number;
  utilization: number;
  vacationDays: string[];
  leaveDays: string[];
  role: UserRole;
  projectsCount: number;
  completedHours: number;
  plannedHours: number;
}

export interface Project {
  id: string;
  name: string;
  nameAr: string;
  clientId: string;
  clientName: string;
  department: Department;
  startDate: string;
  deadline: string;
  status: ProjectStatus;
  totalHours: number;
  completedHours: number;
  engineers: string[];
  progress: number;
  priority: Priority;
  projectType?: ProjectType;
  description?: string;
  value?: number;
  managerId?: string;
}

export interface Task {
  id: string;
  projectId: string;
  projectName: string;
  engineerId: string;
  engineerName: string;
  title: string;
  titleAr: string;
  date: string;
  hours: number;
  status: TaskStatus;
  department: Department;
  priority: Priority;
  notes?: string;
}

export interface Meeting {
  id: string;
  title: string;
  titleAr: string;
  type: MeetingType;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  onlineLink?: string;
  participants: string[];
  agenda?: string;
  notes?: string;
  clientId?: string;
  recurring?: 'daily' | 'weekly' | 'monthly';
  attachments?: string[];
}

export interface Client {
  id: string;
  name: string;
  company: string;
  position: string;
  email: string;
  phone: string;
  whatsapp?: string;
  city: string;
  source: string;
  status: ClientStatus;
  priority: Priority;
  notes?: string;
  projects: string[];
  nextFollowUp?: string;
  lastContact?: string;
  value?: number;
  tags?: string[];
}

export interface Notification {
  id: string;
  type: 'deadline' | 'meeting' | 'task' | 'overload' | 'followup' | 'completed';
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  timestamp: string;
  read: boolean;
  link?: string;
  priority: Priority;
}

export interface DashboardStats {
  projectsRunning: number;
  projectsDelayed: number;
  projectsCompleted: number;
  engineerUtilization: number;
  plannedHours: number;
  completedHours: number;
  meetingsToday: number;
  followupsToday: number;
}
