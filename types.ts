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
  passwordHash?: string;
  mustChangePassword?: boolean;
  lastLogin?: number;
}

export interface DeviceLog {
  id: string;
  date: string;
  action: string;
  performedBy: string;
  notes?: string;
  reportImageUrl?: string; // Ảnh báo cáo tình trạng
}

// Định nghĩa cho trường dữ liệu tùy chỉnh
export type FieldType = 'text' | 'number' | 'date' | 'select' | 'textarea';

export interface CustomFieldDef {
  key: string;      // Tên biến (VD: warrantyDate)
  label: string;    // Nhãn hiển thị (VD: Hạn bảo hành)
  type: FieldType;
  options?: string[]; // Dùng cho loại select (ngăn cách bằng dấu phẩy)
  required?: boolean;
}

export interface Device {
  id: string;
  name: string;
  code: string;
  category: string;
  status: DeviceStatus;
  location: string;
  assignedTo?: string;
  purchaseDate: string;
  description?: string;
  imageUrl?: string;
  history: DeviceLog[];
  customFields?: Record<string, any>; // Lưu dữ liệu động: { warrantyDate: '2024-01-01', provider: 'ABC' }
}

export interface SystemConfig {
  schoolName: string;
  academicYear: string;
  categories: string[]; // Danh sách danh mục động
  customFields: CustomFieldDef[]; // Định nghĩa các trường tùy chỉnh
}