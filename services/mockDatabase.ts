import { Device, DeviceStatus, Role, User, SystemConfig } from '../types';

/**
 * Hybrid Database Service
 */

const LOCAL_STORAGE_KEYS = {
  USERS: 'eduequip_users',
  DEVICES: 'eduequip_devices',
  CONFIG: 'eduequip_config'
};

const DEFAULT_CONFIG: SystemConfig = {
    schoolName: 'Trường THPT Tương Lai',
    academicYear: '2023-2024',
    categories: ['Điện tử', 'Nội thất', 'Thí nghiệm', 'CNTT', 'Khác'],
    customFields: []
};

// Hàm băm mật khẩu đơn giản sử dụng SHA-256 (Client-side)
export const hashPassword = async (text: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const DEFAULT_ADMIN_HASH = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";

const seedUsers: User[] = [
  { 
    id: '1', 
    username: 'admin', 
    fullName: 'Quản trị hệ thống', 
    email: 'admin@school.edu', 
    role: Role.ADMIN,
    passwordHash: DEFAULT_ADMIN_HASH,
    mustChangePassword: false 
  },
];

export const db = {
  // --- USERS ---
  getUsers: async (): Promise<User[]> => {
    try {
        const res = await fetch('/api/sheet?type=users');
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        
        const parsedData = data.map((u: any) => ({
            ...u,
            mustChangePassword: String(u.mustChangePassword).toLowerCase() === 'true'
        }));

        const hasAdmin = parsedData.some((u: User) => u.username === 'admin');
        if (!hasAdmin) {
            return [seedUsers[0], ...parsedData];
        }

        return parsedData;
    } catch (e) {
        console.warn("Falling back to LocalStorage (Users)", e);
        const local = localStorage.getItem(LOCAL_STORAGE_KEYS.USERS);
        let localData = local ? JSON.parse(local) : seedUsers;
        if (Array.isArray(localData) && !localData.some((u: User) => u.username === 'admin')) {
             localData = [seedUsers[0], ...localData];
        }
        return localData;
    }
  },
  
  findUser: async (username: string): Promise<User | undefined> => {
    const users = await db.getUsers();
    return users.find(u => 
      u.username.toLowerCase() === username.toLowerCase() || 
      u.email.toLowerCase() === username.toLowerCase()
    );
  },

  saveUser: async (user: User): Promise<void> => {
    try {
        const resList = await fetch('/api/sheet?type=users');
        if (!resList.ok) throw new Error("API Unavailable");
        
        const users: User[] = await resList.json();
        const exists = users.some(u => u.id === user.id);

        const method = exists ? 'PUT' : 'POST';
        await fetch('/api/sheet?type=users', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
    } catch (e) {
        const users = await db.getUsers();
        const index = users.findIndex(u => u.id === user.id);
        if (index >= 0) users[index] = user;
        else users.push(user);
        localStorage.setItem(LOCAL_STORAGE_KEYS.USERS, JSON.stringify(users));
    }
  },

  deleteUser: async (id: string): Promise<void> => {
    if (id === '1') {
        alert("Không thể xóa tài khoản Quản trị mặc định.");
        return;
    }
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
        if (!res.ok) throw new Error('API Unavailable');
        const data = await res.json();
        
        // Parse customFields if stored as JSON string in sheet
        return data.map((d: any) => {
            if (typeof d.customFields === 'string') {
                try { d.customFields = JSON.parse(d.customFields); } catch(e) { d.customFields = {}; }
            }
            return d;
        });
    } catch (e) {
        const local = localStorage.getItem(LOCAL_STORAGE_KEYS.DEVICES);
        return local ? JSON.parse(local) : [];
    }
  },

  getDeviceById: async (id: string): Promise<Device | undefined> => {
    const devices = await db.getDevices();
    return devices.find(d => d.id === id);
  },

  saveDevice: async (device: Device): Promise<void> => {
    // Stringify customFields before saving to Sheet
    const payload = {
        ...device,
        customFields: JSON.stringify(device.customFields || {})
    };

    try {
        const resList = await fetch('/api/sheet?type=data');
        if (!resList.ok) throw new Error("API Unavailable");
        
        const devices = await resList.json();
        const exists = devices.some((d: any) => d.id === device.id);

        const method = exists ? 'PUT' : 'POST';
        await fetch('/api/sheet?type=data', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
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
        await fetch(`/api/sheet?type=data&id=${id}`, { method: 'DELETE' });
    } catch (e) {
        const devices = await db.getDevices();
        const filtered = devices.filter(d => d.id !== id);
        localStorage.setItem(LOCAL_STORAGE_KEYS.DEVICES, JSON.stringify(filtered));
    }
  },

  // --- CONFIG ---
  getConfig: async (): Promise<SystemConfig> => {
    try {
        // Try fetching from 'config' sheet which acts as a Key-Value store
        // Columns: key, value, id
        const res = await fetch('/api/sheet?type=config');
        if (!res.ok) throw new Error("Config Sheet API Unavailable");
        
        const rows = await res.json();
        const configMap: any = { ...DEFAULT_CONFIG };

        // Convert Rows [{key: 'schoolName', value: 'ABC'}] to Object
        rows.forEach((r: any) => {
            if (r.key && r.value) {
                try {
                    // Try parsing JSON for arrays/objects (categories, customFields)
                    configMap[r.key] = JSON.parse(r.value);
                } catch {
                    // Fallback to plain string if not valid JSON
                    configMap[r.key] = r.value;
                }
            }
        });
        
        return { ...DEFAULT_CONFIG, ...configMap };

    } catch (e) {
        console.warn("Using LocalStorage Config");
        const local = localStorage.getItem(LOCAL_STORAGE_KEYS.CONFIG);
        return local ? { ...DEFAULT_CONFIG, ...JSON.parse(local) } : DEFAULT_CONFIG;
    }
  },

  saveConfig: async (config: SystemConfig): Promise<void> => {
    try {
        // 1. Get current config rows to check for existing keys and get their IDs
        const res = await fetch('/api/sheet?type=config');
        let currentRows: any[] = [];
        if (res.ok) currentRows = await res.json();

        const keysToSave = ['schoolName', 'academicYear', 'categories', 'customFields'];

        for (const key of keysToSave) {
            const val = (config as any)[key];
            // Ensure complex types are stringified
            const stringVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
            
            // Find existing row by Key
            const existingRow = currentRows.find((r: any) => r.key === key);
            
            if (existingRow && existingRow.id) {
                // UPDATE (PUT) using the existing ID
                await fetch('/api/sheet?type=config', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: existingRow.id, key, value: stringVal })
                });
            } else {
                // CREATE (POST)
                await fetch('/api/sheet?type=config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    // Generate a new ID if creating
                    body: JSON.stringify({ id: crypto.randomUUID(), key, value: stringVal })
                });
            }
        }

    } catch (e) {
        console.error("Failed to save config remotely", e);
        localStorage.setItem(LOCAL_STORAGE_KEYS.CONFIG, JSON.stringify(config));
    }
  }
};