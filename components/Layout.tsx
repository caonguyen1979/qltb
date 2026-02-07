import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Box, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  ScanLine
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/', roles: [Role.ADMIN, Role.MANAGER] },
    { label: 'Equipment', icon: Box, path: '/devices', roles: [Role.ADMIN, Role.MANAGER, Role.USER] },
    { label: 'Users', icon: Users, path: '/users', roles: [Role.ADMIN] },
    { label: 'Settings', icon: Settings, path: '/settings', roles: [Role.ADMIN] },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out
          lg:static lg:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <ScanLine className="w-6 h-6 text-accent" />
            <span className="text-lg font-bold">EduEquip</span>
          </div>
          <button onClick={toggleSidebar} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            if (!item.roles.includes(user?.role as Role)) return null;
            
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                `}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-800">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold">
              {user?.fullName.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.fullName}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{user?.role.toLowerCase()}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center space-x-2 text-slate-400 hover:text-red-400 w-full px-2 py-2 text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 lg:hidden">
          <button onClick={toggleSidebar} className="text-gray-500">
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-semibold text-gray-800">EduEquip Manager</span>
          <div className="w-6" /> {/* Spacer */}
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};