import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { AlertCircle, CheckCircle, Clock, Wrench } from 'lucide-react';
import { db } from '../services/mockDatabase';
import { DeviceStatus } from '../types';

export const Dashboard: React.FC = () => {
  const devices = db.getDevices();

  const stats = useMemo(() => {
    return {
      total: devices.length,
      available: devices.filter(d => d.status === DeviceStatus.AVAILABLE).length,
      inUse: devices.filter(d => d.status === DeviceStatus.IN_USE).length,
      broken: devices.filter(d => d.status === DeviceStatus.BROKEN).length,
      maintenance: devices.filter(d => d.status === DeviceStatus.MAINTENANCE).length,
    };
  }, [devices]);

  const pieData = [
    { name: 'Available', value: stats.available, color: '#10b981' },
    { name: 'In Use', value: stats.inUse, color: '#3b82f6' },
    { name: 'Broken', value: stats.broken, color: '#ef4444' },
    { name: 'Maintenance', value: stats.maintenance, color: '#f59e0b' },
  ];

  const categoryData = useMemo(() => {
    const counts: {[key: string]: number} = {};
    devices.forEach(d => {
      counts[d.category] = (counts[d.category] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({
      name: key,
      count: counts[key]
    }));
  }, [devices]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-lg">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Available</p>
            <p className="text-2xl font-bold text-gray-900">{stats.available}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">In Use</p>
            <p className="text-2xl font-bold text-gray-900">{stats.inUse}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-lg">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Broken / Lost</p>
            <p className="text-2xl font-bold text-gray-900">{stats.broken}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Maintenance</p>
            <p className="text-2xl font-bold text-gray-900">{stats.maintenance}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Status Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Equipment by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};