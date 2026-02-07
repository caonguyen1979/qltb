import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Edit, Eye, QrCode, Loader2 } from 'lucide-react';
import { db } from '../services/mockDatabase';
import { Device, Role, DeviceStatus } from '../types';
import { useAuth } from '../context/AuthContext';

export const DeviceList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    const loadDevices = async () => {
        const data = await db.getDevices();
        setDevices(data);
        setLoading(false);
    };
    loadDevices();
  }, []);

  const filteredDevices = devices.filter(device => {
    const matchesSearch = 
      device.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      device.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'ALL' || device.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: DeviceStatus) => {
    switch (status) {
      case DeviceStatus.AVAILABLE: return 'bg-green-100 text-green-700';
      case DeviceStatus.IN_USE: return 'bg-blue-100 text-blue-700';
      case DeviceStatus.BROKEN: return 'bg-red-100 text-red-700';
      case DeviceStatus.MAINTENANCE: return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
      return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Equipment List</h1>
        {user?.role === Role.ADMIN && (
          <button 
            onClick={() => navigate('/devices/new')}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Device</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, code, or location..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="text-gray-400 w-5 h-5" />
          <select 
            className="border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">All Status</option>
            {Object.values(DeviceStatus).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDevices.map((device) => (
                <tr key={device.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{device.code}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <div className="flex items-center space-x-3">
                      <img 
                        src={device.imageUrl || `https://picsum.photos/40/40?random=${device.id}`} 
                        alt="" 
                        className="w-8 h-8 rounded bg-gray-200 object-cover"
                      />
                      <span>{device.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{device.category}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{device.location}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(device.status)}`}>
                      {device.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    <div className="flex items-center justify-end space-x-3">
                      <Link to={`/devices/${device.id}`} className="text-gray-400 hover:text-blue-600" title="View Details">
                        <Eye className="w-4 h-4" />
                      </Link>
                      {user?.role === Role.ADMIN && (
                        <Link to={`/devices/${device.id}?edit=true`} className="text-gray-400 hover:text-green-600" title="Edit">
                          <Edit className="w-4 h-4" />
                        </Link>
                      )}
                      <Link to={`/devices/${device.id}?qr=true`} className="text-gray-400 hover:text-purple-600" title="QR Code">
                        <QrCode className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDevices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No devices found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};