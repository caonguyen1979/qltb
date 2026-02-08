import { Device, DeviceStatus, Role, User } from '../types';

/**
 * Hybrid Database Service
 */

const LOCAL_STORAGE_KEYS = {
  USERS: 'eduequip_users',
  DEVICES: 'eduequip_devices',
  CONFIG: 'eduequip_config'
};

const seedUsers: User[] = [
  { id: '1', username: 'admin', fullName: 'Quản trị hệ thống', email: 'admin@school.edu', role: Role.ADMIN },
];

export const db = {
  // --- USERS ---
  getUsers: async (): Promise<User[]> => {
    try {
        const res = await fetch('/api/sheet?type=users');
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        // Fallback if empty sheet
        if (Array.isArray(data) && data.length === 0) return seedUsers;
        return data;
    } catch (e) {
        console.warn("Falling back to LocalStorage (Users)", e);
        const local = localStorage.getItem(LOCAL_STORAGE_KEYS.USERS);
        return local ? JSON.parse(local) : seedUsers;
    }
  },
  
  findUser: async (username: string): Promise<User | undefined> => {
    const users = await db.getUsers();
    return users.find(u => u.username === username || u.email === username);
  },

  saveUser: async (user: User): Promise<void> => {
    try {
        const resList = await fetch('/api/sheet?type=users');
        if (!resList.ok) throw new Error("API Unavailable");
        
        const users: User[] = await resList.json();
        const exists = users.some(u => u.id === user.id);

        const method = exists ? 'PUT' : 'POST';
        const res = await fetch('/api/sheet?type=users', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
        if (!res.ok) throw new Error('Save failed');
    } catch (e) {
        const users = await db.getUsers();
        const index = users.findIndex(u => u.id === user.id);
        if (index >= 0) users[index] = user;
        else users.push(user);
        localStorage.setItem(LOCAL_STORAGE_KEYS.USERS, JSON.stringify(users));
    }
  },

  deleteUser: async (id: string): Promise<void> => {
    try {
        await fetch(`/api/sheet?type=users&id=${id}`, { method: 'DELETE' });
    } catch (e) {
        const users = await db.getUsers();
        const filtered = users.filter(u => u.id !== id);
        localStorage.setItem(LOCAL_STORAGE_KEYS.USERS, JSON.stringify(filtered));
    }
  },

  // --- DEVICES ---
  getDevices: async (): Promise<Device[]> => {
    try {
        const res = await fetch('/api/sheet?type=data');
        if (!res.ok) {
            const errText = await res.text();
            console.error("API FAILED DETAILS:", errText);
            throw new Error('API Unavailable');
        }
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
    try {
        const resList = await fetch('/api/sheet?type=data');
        if (!resList.ok) throw new Error("API Unavailable");
        
        const devices: Device[] = await resList.json();
        const exists = devices.some(d => d.id === device.id);

        const method = exists ? 'PUT' : 'POST';
        const res = await fetch('/api/sheet?type=data', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(device)
        });
        if (!res.ok) {
             const err = await res.json();
             throw new Error(err.message);
        }
    } catch (e) {
        const devices = await db.getDevices();
        const index = devices.findIndex(d => d.id === device.id);
        if (index >= 0) devices[index] = device;
        else devices.push(device);
        localStorage.setItem(LOCAL_STORAGE_KEYS.DEVICES, JSON.stringify(devices));
    }
  },

  deleteDevice: async (id: string): Promise<void> => {
    try {
        const res = await fetch(`/api/sheet?type=data&id=${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('API Unavailable');
    } catch (e) {
        const devices = await db.getDevices();
        const filtered = devices.filter(d => d.id !== id);
        localStorage.setItem(LOCAL_STORAGE_KEYS.DEVICES, JSON.stringify(filtered));
    }
  },

  getConfig: () => {
    const local = localStorage.getItem(LOCAL_STORAGE_KEYS.CONFIG);
    return local ? JSON.parse(local) : { schoolName: 'Trường THPT Tương Lai', academicYear: '2023-2024' };
  },

  saveConfig: (config: any) => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.CONFIG, JSON.stringify(config));
  }
};