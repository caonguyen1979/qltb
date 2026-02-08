import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { ScanLine, Mail, Lock, Loader2, KeyRound } from 'lucide-react';
import { db, hashPassword } from '../services/mockDatabase';
import { User } from '../types';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  
  // State for Force Change Password
  const [mustChangePass, setMustChangePass] = useState(false);
  const [tempUser, setTempUser] = useState<User | null>(null);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const from = (location.state as any)?.from?.pathname || "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password, remember);
      
      if (result.success) {
          if (result.mustChangePassword && result.user) {
              setMustChangePass(true);
              setTempUser(result.user);
          } else {
              navigate(from, { replace: true });
          }
      } else {
        setError('Sai tên đăng nhập hoặc mật khẩu.');
      }
    } catch (e) {
      setError('Đã xảy ra lỗi đăng nhập');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPass !== confirmPass) {
          setError("Mật khẩu xác nhận không khớp.");
          return;
      }
      if (newPass.length < 6) {
          setError("Mật khẩu phải có ít nhất 6 ký tự.");
          return;
      }

      setLoading(true);
      try {
          if (tempUser) {
              const newHash = await hashPassword(newPass);
              const updatedUser = { ...tempUser, passwordHash: newHash, mustChangePassword: false };
              await db.saveUser(updatedUser);
              
              // Auto login after change
              await login(tempUser.username, newPass, remember);
              navigate(from, { replace: true });
          }
      } catch (e) {
          setError("Lỗi khi đổi mật khẩu.");
      } finally {
          setLoading(false);
      }
  };

  const handleForgotPass = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Email khôi phục mật khẩu đã được gửi (Mô phỏng).');
    setShowForgot(false);
  };

  // --- RENDER FOR CHANGE PASSWORD ---
  if (mustChangePass) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-amber-600 p-8 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-amber-500 rounded-full">
                        <KeyRound className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white">Yêu cầu đổi mật khẩu</h2>
                    <p className="text-amber-100 mt-2 text-sm">Đây là lần đăng nhập đầu tiên hoặc mật khẩu của bạn đã được reset. Vui lòng đổi mật khẩu mới.</p>
                </div>
                <div className="p-8">
                     <form onSubmit={handleChangePassword} className="space-y-6">
                        {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
                            <input
                                type="password"
                                required
                                value={newPass}
                                onChange={(e) => setNewPass(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu</label>
                            <input
                                type="password"
                                required
                                value={confirmPass}
                                onChange={(e) => setConfirmPass(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                        </div>
                         <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex justify-center items-center"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Đổi mật khẩu & Tiếp tục'}
                        </button>
                     </form>
                </div>
            </div>
        </div>
      );
  }

  // --- NORMAL LOGIN ---
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-slate-900 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-slate-800 rounded-full">
              <ScanLine className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">EduEquip Manager</h2>
          <p className="text-slate-400 mt-2 text-sm">Hệ thống quản lý cơ sở vật chất trường học</p>
        </div>

        <div className="p-8">
          {!showForgot ? (
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tài khoản / Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Nhập tên đăng nhập"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Nhập mật khẩu"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={remember} 
                    onChange={(e) => setRemember(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                  />
                  <span>Ghi nhớ đăng nhập</span>
                </label>
                <button 
                  type="button" 
                  onClick={() => setShowForgot(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Quên mật khẩu?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all font-medium flex justify-center items-center"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Đăng nhập'}
              </button>

              <div className="text-center text-xs text-gray-400 mt-4">
                Lưu ý: Tài khoản mặc định <strong>admin / admin</strong>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
               <h3 className="text-lg font-semibold text-gray-900">Khôi phục mật khẩu</h3>
               <p className="text-sm text-gray-500">Nhập email của bạn để nhận hướng dẫn khôi phục.</p>
               <form onSubmit={handleForgotPass}>
                 <input
                    type="email"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                    placeholder="email@school.edu"
                  />
                  <div className="flex space-x-3">
                    <button 
                      type="button" 
                      onClick={() => setShowForgot(false)}
                      className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Hủy
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Gửi
                    </button>
                  </div>
               </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};