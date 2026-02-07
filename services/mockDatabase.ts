import { Device, DeviceStatus, Role, User } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * NOTE: In a real Next.js deployment, this file would be replaced by 
 * server-side API routes (e.g., /api/devices) that interact with 
 * Google Sheets API using a Service Account.
 * 
 * For this client-side prototype, we use LocalStorage to simulate the DB sheets: 'users', 'data', 'config'.
 */

const STORAGE_KEYS = {
  USERS: 'eduequip_users',
  DEVICES: 'eduequip_data',
  CONFIG: 'eduequip_config',
};

// Seed Data
const seedUsers: User[] = [
  { id: '1', username: 'admin', fullName: 'System Administrator', email: 'admin@school.edu', role: Role.ADMIN },
  { id: '2', username: 'manager', fullName: 'Facility Manager', email: 'manager@school.edu', role: Role.MANAGER },
  { id: '3', username: 'teacher1', fullName: 'Nguyen Van A', email: 'teacher1@school.edu', role: Role.USER, department: 'Physics' },
];

const seedDevices: Device[] = [
  {
    id: 'd1',
    name: 'Projector Sony X1',
    code: 'PRJ-001',
    category: 'Electronics',
    status: DeviceStatus.AVAILABLE,
    location: 'Room 101',
    purchaseDate: '2023-01-15',
    history: [],
    imageUrl: 'https://picsum.photos/200/200'
  },
  {
    id: 'd2',
    name: 'Microscope Lab-200',
    code: 'LAB-002',
    category: 'Laboratory',
    status: DeviceStatus.IN_USE,
    location: 'Biology Lab',
    assignedTo: '3',
    purchaseDate: '2022-11-20',
    history: [],
    imageUrl: 'https://picsum.photos/201/201'
  },
  {
    id: 'd3',
    name: 'Laptop Dell Latitude',
    code: 'IT-003',
    category: 'IT',
    status: DeviceStatus.BROKEN,
    location: 'IT Dept',
    purchaseDate: '2023-05-10',
    history: [],
    imageUrl: 'https://picsum.photos/202/202'
  }
];

export const db = {
  // --- USERS ---
  getUsers: (): User[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(seedUsers));
      return seedUsers;
    }
    return JSON.parse(stored);
  },
  
  findUser: (username: string): User | undefined => {
    const users = db.getUsers();
    return users.find(u => u.username === username || u.email === username);
  },

  addUser: (user: User): void => {
    const users = db.getUsers();
    users.push(user);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  // --- DEVICES ---
  getDevices: (): Device[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.DEVICES);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(seedDevices));
      return seedDevices;
    }
    return JSON.parse(stored);
  },

  getDeviceById: (id: string): Device | undefined => {
    return db.getDevices().find(d => d.id === id);
  },

  saveDevice: (device: Device): void => {
    const devices = db.getDevices();
    const index = devices.findIndex(d => d.id === device.id);
    if (index >= 0) {
      devices[index] = device;
    } else {
      devices.push(device);
    }
    localStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(devices));
  },

  deleteDevice: (id: string): void => {
    const devices = db.getDevices().filter(d => d.id !== id);
    localStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(devices));
  },

  // --- CONFIG ---
  getConfig: () => {
    return { schoolName: 'Future High School', academicYear: '2023-2024' };
  }
};