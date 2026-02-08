import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Loader2, Save, X, KeyRound, RefreshCw } from 'lucide-react';
import { db, hashPassword } from '../services/mockDatabase';
import { User, Role } from '../types';
import { useAuth } from '../context/AuthContext';
import { v4 as uuidv4 } from 'uuid';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [password, setPassword] = useState(''); // New password field
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
        const data = await db.getUsers();
        setUsers(data);
    } catch (e) {
        console.error("Failed to fetch users");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenModal = (userToEdit?: User) => {
    setPassword(''); // Reset password field
    if (userToEdit) {
      setEditingUser(userToEdit);
      setFormData(userToEdit);
    } else {
      setEditingUser(null);
      setFormData({
        role: Role.USER,
        fullName: '',
        username: '',
        email: '',
        department: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalPasswordHash = editingUser?.passwordHash;
      let shouldForceChange = editingUser?.mustChangePassword;

      // Logic: 
      // 1. If create new user -> Password required, mustChange = true
      // 2. If edit user AND password filled -> Update hash, set mustChange = true (Reset)
      // 3. If edit user AND password empty -> Keep old hash
      
      if (!editingUser) {
          if (!password) {
              alert("Vui lòng nhập mật khẩu cho người dùng mới.");
              setSaving(false);
              return;
          }
          finalPasswordHash = await hashPassword(password);
          shouldForceChange = true;
      } else if (password) {
          finalPasswordHash = await hashPassword(password);
          shouldForceChange = true; // Force change on next login if admin resets pass
      }

      const newUser: User = {
        id: editingUser ? editingUser.id : uuidv4(),
        fullName: formData.fullName || '',
        username: formData.username || '',
        email: formData.email || '',
        role: formData.role || Role.USER,
        department: formData.department || '',
        passwordHash: finalPasswordHash,
        mustChangePassword: shouldForceChange
      };

      await db.saveUser(newUser);
      await fetchUsers();
      setIsModalOpen(false);
    } catch (err) {
      alert("Lỗi khi lưu người dùng");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa người dùng này?")) {
        setSaving(true);
        await db.deleteUser(id);
        await fetchUsers();
        setSaving(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && users.length === 0) {
      return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Người dùng</h1>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm người dùng</span>
        </button>
      </div>

       {/* Search */}
       <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Tìm theo tên, tài khoản hoặc email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Họ và Tên</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tài khoản</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vai trò</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                            {u.fullName.charAt(0)}
                        </div>
                        <span>{u.fullName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{u.username}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                        ${u.role === Role.ADMIN ? 'bg-purple-100 text-purple-700' : 
                          u.role === Role.MANAGER ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                      {u.role === Role.ADMIN ? 'Quản trị viên' : u.role === Role.MANAGER ? 'Quản lý' : 'Giáo viên'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {u.mustChangePassword ? (
                        <span className="text-amber-600 text-xs font-bold flex items-center">
                            <KeyRound className="w-3 h-3 mr-1" /> Chờ đổi mật khẩu
                        </span>
                    ) : <span className="text-green-600 text-xs">Đã kích hoạt</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    <div className="flex items-center justify-end space-x-3">
                      <button onClick={() => handleOpenModal(u)} className="text-gray-400 hover:text-blue-600" title="Sửa / Reset Mật khẩu">
                        <Edit className="w-4 h-4" />
                      </button>
                      {currentUser?.id !== u.id && (
                        <button onClick={() => handleDelete(u.id)} className="text-gray-400 hover:text-red-600" title="Xóa">
                           <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900">{editingUser ? 'Sửa thông tin' : 'Thêm người dùng mới'}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSave} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                        <input 
                            required
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                            value={formData.fullName || ''}
                            onChange={e => setFormData({...formData, fullName: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label>
                        <input 
                            required
                            disabled={!!editingUser} // Cannot change username after creation
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg disabled:bg-gray-100"
                            value={formData.username || ''}
                            onChange={e => setFormData({...formData, username: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input 
                            required
                            type="email"
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                            value={formData.email || ''}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                    </div>
                    
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                        <label className="block text-sm font-bold text-amber-900 mb-1 flex items-center">
                            <KeyRound className="w-4 h-4 mr-2" /> 
                            {editingUser ? "Đặt lại mật khẩu (Tùy chọn)" : "Mật khẩu khởi tạo (Bắt buộc)"}
                        </label>
                        <input 
                            type="text" // Show text to avoid mistakes during reset
                            className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-amber-500 bg-white"
                            placeholder={editingUser ? "Để trống nếu không muốn đổi" : "Nhập mật khẩu..."}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                        {editingUser && password && (
                            <p className="text-xs text-amber-700 mt-2 flex items-center">
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Người dùng sẽ buộc phải đổi mật khẩu này trong lần đăng nhập tới.
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                            <select 
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                                value={formData.role}
                                onChange={e => setFormData({...formData, role: e.target.value as Role})}
                            >
                                <option value={Role.USER}>Giáo viên</option>
                                <option value={Role.MANAGER}>Quản lý</option>
                                <option value={Role.ADMIN}>Quản trị viên</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bộ phận / Tổ</label>
                            <input 
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                                value={formData.department || ''}
                                onChange={e => setFormData({...formData, department: e.target.value})}
                                placeholder="VD: Tổ Toán"
                            />
                        </div>
                    </div>
                    
                    <div className="pt-4 flex justify-end space-x-3">
                        <button 
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            Hủy
                        </button>
                        <button 
                            type="submit"
                            disabled={saving}
                            className="flex items-center px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                        >
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Lưu
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};