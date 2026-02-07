import { Device, DeviceStatus, Role, User } from '../types';

/**
 * Hybrid Database Service
 * 1. Tries to use Vercel Serverless API (connected to Google Sheets).
 * 2. Fallbacks to LocalStorage if API fails or returns 404 (Local Development).
 */

const LOCAL_STORAGE_KEYS = {
  USERS: 'eduequip_users',
  DEVICES: 'eduequip_devices'
};

const seedUsers: User[] = [
  { id: '1', username: 'admin', fullName: 'System Administrator', email: 'admin@school.edu', role: Role.ADMIN },
];

// Helper to check if we are likely in an environment where API works
const isLocal = () => window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const db = {
  // --- USERS ---
  getUsers: async (): Promise<User[]> => {
    try {
        const res = await fetch('/api/sheet?type=users');
        if (!res.ok) throw new Error('API Unavailable');
        const data = await res.json();
        if (Array.isArray(data) && data.length === 0) return seedUsers;
        return data;
    } catch (e) {
        console.warn("Using LocalStorage for Users (API unavailable)");
        const local = localStorage.getItem(LOCAL_STORAGE_KEYS.USERS);
        return local ? JSON.parse(local) : seedUsers;
    }
  },
  
  findUser: async (username: string): Promise<User | undefined> => {
    const users = await db.getUsers();
    return users.find(u => u.username === username || u.email === username);
  },

  addUser: async (user: User): Promise<void> => {
    try {
      const res = await fetch('/api/sheet?type=users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user)
      });
      if (!res.ok) throw new Error('API Error');
    } catch (e) {
      // Local Fallback
      const users = await db.getUsers();
      users.push(user);
      localStorage.setItem(LOCAL_STORAGE_KEYS.USERS, JSON.stringify(users));
    }
  },

  // --- DEVICES ---
  getDevices: async (): Promise<Device[]> => {
    try {
        const res = await fetch('/api/sheet?type=data');
        if (!res.ok) throw new Error('API Unavailable');
        return await res.json();
    } catch (e) {
        console.warn("Using LocalStorage for Devices (API unavailable)");
        const local = localStorage.getItem(LOCAL_STORAGE_KEYS.DEVICES);
        return local ? JSON.parse(local) : [];
    }
  },

  getDeviceById: async (id: string): Promise<Device | undefined> => {
    const devices = await db.getDevices();
    return devices.find(d => d.id === id);
  },

  saveDevice: async (device: Device): Promise<void> => {
    // Try API first
    try {
        // Check existence via API would be expensive, so we optimistically try PUT or POST logic if we had endpoints
        // For this hybrid, we try to read first to know mode
        const resList = await fetch('/api/sheet?type=data');
        if (!resList.ok) throw new Error("API Unavailable");
        
        const devices: Device[] = await resList.json();
        const exists = devices.some(d => d.id === device.id);

        const method = exists ? 'PUT' : 'POST';
        await fetch('/api/sheet?type=data', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(device)
        });
    } catch (e) {
        // Local Fallback
        const devices = await db.getDevices(); // Gets from LocalStorage due to fallback in getDevices
        const index = devices.findIndex(d => d.id === device.id);
        
        if (index >= 0) {
            devices[index] = device;
        } else {
            devices.push(device);
        }
        localStorage.setItem(LOCAL_STORAGE_KEYS.DEVICES, JSON.stringify(devices));
        console.log("Saved to LocalStorage");
    }
  },

  deleteDevice: async (id: string): Promise<void> => {
    try {
        const res = await fetch(`/api/sheet?type=data&id=${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('API Unavailable');
    } catch (e) {
        // Local Fallback
        const devices = await db.getDevices();
        const filtered = devices.filter(d => d.id !== id);
        localStorage.setItem(LOCAL_STORAGE_KEYS.DEVICES, JSON.stringify(filtered));
    }
  },

  // --- CONFIG ---
  getConfig: () => {
    return { schoolName: 'Future High School', academicYear: '2023-2024' };
  }
};