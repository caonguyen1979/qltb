import { Device, DeviceStatus, Role, User } from '../types';

/**
 * Hybrid Database Service
 */

const LOCAL_STORAGE_KEYS = {
  USERS: 'eduequip_users',
  DEVICES: 'eduequip_devices'
};

const seedUsers: User[] = [
  { id: '1', username: 'admin', fullName: 'System Administrator', email: 'admin@school.edu', role: Role.ADMIN },
];

export const db = {
  // --- USERS ---
  getUsers: async (): Promise<User[]> => {
    try {
        const res = await fetch('/api/sheet?type=users');
        if (!res.ok) {
            const errorData = await res.json();
            console.error("API Error (Users):", errorData);
            throw new Error(errorData.message || 'API Unavailable');
        }
        const data = await res.json();
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

  addUser: async (user: User): Promise<void> => {
    try {
      const res = await fetch('/api/sheet?type=users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user)
      });
      if (!res.ok) throw new Error('API Error');
    } catch (e) {
      const users = await db.getUsers();
      users.push(user);
      localStorage.setItem(LOCAL_STORAGE_KEYS.USERS, JSON.stringify(users));
    }
  },

  // --- DEVICES ---
  getDevices: async (): Promise<Device[]> => {
    try {
        const res = await fetch('/api/sheet?type=data');
        if (!res.ok) {
            // Log the detailed error from the server to the browser console
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
             alert(`Save failed: ${err.message}`);
             throw new Error(err.message);
        }
    } catch (e) {
        // Local Fallback
        const devices = await db.getDevices();
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
        const devices = await db.getDevices();
        const filtered = devices.filter(d => d.id !== id);
        localStorage.setItem(LOCAL_STORAGE_KEYS.DEVICES, JSON.stringify(filtered));
    }
  },

  getConfig: () => {
    return { schoolName: 'Future High School', academicYear: '2023-2024' };
  }
};