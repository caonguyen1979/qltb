import React, { useState, useEffect } from 'react';
import { Save, Loader2, School, Calendar, Database, Plus, Trash2, List, Settings2 } from 'lucide-react';
import { db } from '../services/mockDatabase';
import { SystemConfig, CustomFieldDef, FieldType } from '../types';

export const SettingsPage: React.FC = () => {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form states for adding items
  const [newCategory, setNewCategory] = useState('');
  const [newField, setNewField] = useState<CustomFieldDef>({
      key: '',
      label: '',
      type: 'text',
      options: [],
      required: false
  });
  const [newFieldOptionsStr, setNewFieldOptionsStr] = useState('');

  useEffect(() => {
    const load = async () => {
        const data = await db.getConfig();
        setConfig(data);
        setLoading(false);
    };
    load();
  }, []);

  const handleSaveMain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    await db.saveConfig(config);
    setSaving(false);
    alert("Đã lưu cấu hình hệ thống.");
  };

  const addCategory = () => {
      if (!config || !newCategory.trim()) return;
      setConfig({
          ...config,
          categories: [...config.categories, newCategory.trim()]
      });
      setNewCategory('');
  };

  const removeCategory = (idx: number) => {
      if (!config) return;
      const newCats = [...config.categories];
      newCats.splice(idx, 1);
      setConfig({ ...config, categories: newCats });
  };

  const addField = () => {
      if (!config || !newField.key || !newField.label) {
          alert("Vui lòng nhập Mã trường và Tên hiển thị");
          return;
      }
      // Basic validation for key (only letters/numbers)
      if (!/^[a-zA-Z0-9_]+$/.test(newField.key)) {
          alert("Mã trường chỉ được chứa chữ cái, số và dấu gạch dưới.");
          return;
      }
      if (config.customFields.some(f => f.key === newField.key)) {
          alert("Mã trường đã tồn tại.");
          return;
      }

      const fieldToAdd = { ...newField };
      if (fieldToAdd.type === 'select') {
          fieldToAdd.options = newFieldOptionsStr.split(',').map(s => s.trim()).filter(s => s);
      }

      setConfig({
          ...config,
          customFields: [...config.customFields, fieldToAdd]
      });
      
      // Reset
      setNewField({ key: '', label: '', type: 'text', options: [], required: false });
      setNewFieldOptionsStr('');
  };

  const removeField = (idx: number) => {
      if (!config) return;
      const newFields = [...config.customFields];
      newFields.splice(idx, 1);
      setConfig({ ...config, customFields: newFields });
  };

  if (loading || !config) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600"/></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <h1 className="text-2xl font-bold text-gray-900">Cài đặt hệ thống</h1>

      {/* General Settings */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100 font-semibold text-gray-700 flex items-center">
            <School className="w-4 h-4 mr-2" /> Thông tin chung
        </div>
        <div className="p-6 space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên trường / Đơn vị</label>
                <input 
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    value={config.schoolName}
                    onChange={e => setConfig({...config, schoolName: e.target.value})}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500" /> Niên khóa hiện tại
                </label>
                <input 
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    value={config.academicYear}
                    onChange={e => setConfig({...config, academicYear: e.target.value})}
                />
            </div>
        </div>
      </section>

      {/* Categories Management */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100 font-semibold text-gray-700 flex items-center">
            <List className="w-4 h-4 mr-2" /> Danh mục thiết bị
        </div>
        <div className="p-6">
            <div className="flex space-x-2 mb-4">
                <input 
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg"
                    placeholder="Nhập tên danh mục mới (VD: Âm thanh, Thể thao...)"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                />
                <button onClick={addCategory} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                    <Plus className="w-5 h-5" />
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                {config.categories.map((cat, idx) => (
                    <div key={idx} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full flex items-center text-sm">
                        <span>{cat}</span>
                        <button onClick={() => removeCategory(idx)} className="ml-2 text-blue-400 hover:text-red-500">
                            <XIcon />
                        </button>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* Custom Fields Management */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100 font-semibold text-gray-700 flex items-center">
            <Settings2 className="w-4 h-4 mr-2" /> Cấu hình trường thông tin mở rộng
        </div>
        <div className="p-6 space-y-6">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                <h4 className="text-sm font-bold text-slate-700">Thêm trường mới</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <input 
                        className="px-3 py-2 border border-gray-200 rounded text-sm"
                        placeholder="Mã (VD: bao_hanh)"
                        value={newField.key}
                        onChange={e => setNewField({...newField, key: e.target.value})}
                    />
                    <input 
                        className="px-3 py-2 border border-gray-200 rounded text-sm"
                        placeholder="Tên hiển thị (VD: Hạn bảo hành)"
                        value={newField.label}
                        onChange={e => setNewField({...newField, label: e.target.value})}
                    />
                    <select 
                        className="px-3 py-2 border border-gray-200 rounded text-sm"
                        value={newField.type}
                        onChange={e => setNewField({...newField, type: e.target.value as FieldType})}
                    >
                        <option value="text">Văn bản (Text)</option>
                        <option value="number">Số (Number)</option>
                        <option value="date">Ngày (Date)</option>
                        <option value="textarea">Đoạn văn (Textarea)</option>
                        <option value="select">Danh sách chọn (Select)</option>
                    </select>
                     <button onClick={addField} className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 font-medium">
                        Thêm trường
                    </button>
                </div>
                {newField.type === 'select' && (
                    <input 
                        className="w-full px-3 py-2 border border-gray-200 rounded text-sm"
                        placeholder="Các lựa chọn, ngăn cách bằng dấu phẩy (VD: Tốt, Khá, Kém)"
                        value={newFieldOptionsStr}
                        onChange={e => setNewFieldOptionsStr(e.target.value)}
                    />
                )}
            </div>

            {/* List of Fields */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-2">Mã</th>
                            <th className="px-4 py-2">Tên hiển thị</th>
                            <th className="px-4 py-2">Loại dữ liệu</th>
                            <th className="px-4 py-2">Tùy chọn</th>
                            <th className="px-4 py-2"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {config.customFields.map((field, idx) => (
                            <tr key={idx}>
                                <td className="px-4 py-2 font-mono text-gray-500">{field.key}</td>
                                <td className="px-4 py-2 font-medium">{field.label}</td>
                                <td className="px-4 py-2 capitalize">{field.type}</td>
                                <td className="px-4 py-2 text-gray-500 truncate max-w-xs">{field.options?.join(', ')}</td>
                                <td className="px-4 py-2 text-right">
                                    <button onClick={() => removeField(idx)} className="text-red-500 hover:text-red-700">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {config.customFields.length === 0 && (
                            <tr><td colSpan={5} className="text-center py-4 text-gray-400">Chưa có trường tùy chỉnh nào.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex justify-end md:static md:bg-transparent md:border-0 md:p-0">
           <button 
              onClick={handleSaveMain}
              disabled={saving}
              className="flex items-center px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-lg md:shadow-sm"
          >
              {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
              Lưu toàn bộ cấu hình
          </button>
      </div>
    </div>
  );
};

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);