import { Device, DeviceStatus, Role, User } from '../types';

/**
 * API Service to communicate with Vercel Serverless Functions
 * mapped to Google Sheets.
 */

// Fallback seed data if API fails or environment not set up yet
const seedUsers: User[] = [
  { id: '1', username: 'admin', fullName: 'System Administrator', email: 'admin@school.edu', role: Role.ADMIN },
];

export const db = {
  // --- USERS ---
  getUsers: async (): Promise<User[]> => {
    try {
        const res = await fetch('/api/sheet?type=users');
        if (!res.ok) throw new Error('Failed to fetch users');
        const data = await res.json();
        // If sheet is empty, return seed to allow first login
        if (Array.isArray(data) && data.length === 0) return seedUsers;
        return data;
    } catch (e) {
        console.error(e);
        // Fallback for demo/dev without backend
        return seedUsers;
    }
  },
  
  findUser: async (username: string): Promise<User | undefined> => {
    const users = await db.getUsers();
    return users.find(u => u.username === username || u.email === username);
  },

  addUser: async (user: User): Promise<void> => {
    await fetch('/api/sheet?type=users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
    });
  },

  // --- DEVICES ---
  getDevices: async (): Promise<Device[]> => {
    try {
        const res = await fetch('/api/sheet?type=data');
        if (!res.ok) throw new Error('Failed to fetch devices');
        return await res.json();
    } catch (e) {
        console.error("API Error", e);
        return [];
    }
  },

  getDeviceById: async (id: string): Promise<Device | undefined> => {
    const devices = await db.getDevices();
    return devices.find(d => d.id === id);
  },

  saveDevice: async (device: Device): Promise<void> => {
    // Check if exists to determine PUT or POST
    // Efficient way: try PUT, if 404 then POST, but here we scan ID
    const devices = await db.getDevices();
    const exists = devices.some(d => d.id === device.id);

    if (exists) {
        await fetch('/api/sheet?type=data', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(device)
        });
    } else {
        await fetch('/api/sheet?type=data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(device)
        });
    }
  },

  deleteDevice: async (id: string): Promise<void> => {
    await fetch(`/api/sheet?type=data&id=${id}`, {
        method: 'DELETE',
    });
  },

  // --- CONFIG ---
  getConfig: () => {
    return { schoolName: 'Future High School', academicYear: '2023-2024' };
  }
};