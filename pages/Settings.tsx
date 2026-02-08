import React, { useState, useEffect } from 'react';
import { Save, Loader2, School, Calendar, Database } from 'lucide-react';
import { db } from '../services/mockDatabase';

export const SettingsPage: React.FC = () => {
  const [config, setConfig] = useState<any>({ schoolName: '', academicYear: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setConfig(db.getConfig());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Simulate API call delay
    setTimeout(() => {
        db.saveConfig(config);
        setSaving(false);
        alert("Đã lưu cấu hình hệ thống.");
    }, 800);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Cài đặt hệ thống</h1>

      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-2">Thông tin chung</h2>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <School className="w-4 h-4 mr-2 text-gray-500" /> Tên trường / Đơn vị
                </label>
                <input 
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={config.schoolName}
                    onChange={e => setConfig({...config, schoolName: e.target.value})}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500" /> Niên khóa hiện tại
                </label>
                <input 
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={config.academicYear}
                    onChange={e => setConfig({...config, academicYear: e.target.value})}
                />
            </div>

            <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-2 pt-4">Kết nối dữ liệu</h2>
            
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center mb-2">
                    <Database className="w-4 h-4 mr-2 text-slate-500" />
                    <span className="font-medium text-slate-700">Google Sheets Sync</span>
                </div>
                <p className="text-sm text-slate-500 mb-3">
                    Hệ thống đang được đồng bộ hóa với Google Sheets.
                </p>
                <div className="flex items-center space-x-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-sm text-green-700 font-medium">Đang hoạt động</span>
                </div>
            </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
             <button 
                type="submit"
                disabled={saving}
                className="flex items-center px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
            >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Lưu cấu hình
            </button>
        </div>
      </form>
    </div>
  );
};