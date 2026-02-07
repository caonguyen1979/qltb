export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER',
}

export enum DeviceStatus {
  AVAILABLE = 'AVAILABLE',
  IN_USE = 'IN_USE',
  BROKEN = 'BROKEN',
  MAINTENANCE = 'MAINTENANCE',
  LOST = 'LOST',
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: Role;
  department?: string;
  lastLogin?: number; // Timestamp
}

export interface Device {
  id: string;
  name: string;
  code: string; // Asset Code
  category: string;
  status: DeviceStatus;
  location: string;
  assignedTo?: string; // User ID
  purchaseDate: string;
  description?: string;
  imageUrl?: string;
  history: DeviceLog[];
}

export interface DeviceLog {
  id: string;
  date: string;
  action: string;
  performedBy: string; // User Name
  notes?: string;
}

export interface AppConfig {
  schoolName: string;
  academicYear: string;
  googleSheetId?: string;
}