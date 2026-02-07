import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { ScanLine, Mail, Lock, Loader2 } from 'lucide-react';

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

  const from = (location.state as any)?.from?.pathname || "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Simulation delay
      await new Promise(resolve => setTimeout(resolve, 800));
      const success = login(username, password, remember);
      if (success) {
        navigate(from, { replace: true });
      } else {
        setError('Invalid username or password. Try "admin" / "admin"');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPass = (e: React.FormEvent) => {
    e.preventDefault();
    alert('A password recovery email has been sent to your registered address (Simulated).');
    setShowForgot(false);
  };

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
          <p className="text-slate-400 mt-2 text-sm">School Facility Management System</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Username / Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Enter your password"
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
                  <span>Remember me (3 days)</span>
                </label>
                <button 
                  type="button" 
                  onClick={() => setShowForgot(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all font-medium flex justify-center items-center"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
              </button>

              <div className="text-center text-xs text-gray-400 mt-4">
                Note: Default admin login is <strong>admin / admin</strong>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
               <h3 className="text-lg font-semibold text-gray-900">Reset Password</h3>
               <p className="text-sm text-gray-500">Enter your email to receive recovery instructions.</p>
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
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Send
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