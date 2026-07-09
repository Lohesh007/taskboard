import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

const validatePassword = (password) => [
  { rule: 'At least 8 characters', valid: password.length >= 8 },
  { rule: 'One uppercase letter', valid: /[A-Z]/.test(password) },
  { rule: 'One number', valid: /[0-9]/.test(password) },
  { rule: 'One special character (!@#$%^&*)', valid: /[!@#$%^&*]/.test(password) },
];

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordRules = validatePassword(password);
  const passwordValid = passwordRules.every((r) => r.valid);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    if (!passwordValid) { toast.error('Please fix password errors'); return; }
    setLoading(true);
    try {
      await api.post('/users/reset-password/', { token, password });
      toast.success('Password reset! Please login.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid or expired link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-indigo-600 rounded-full opacity-20 blur-3xl animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-purple-600 rounded-full opacity-20 blur-3xl animate-pulse" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-500/50">
            <span className="text-2xl">⚡</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">
            Task<span className="text-indigo-400">Board</span>
          </h1>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-1">Set new password 🔐</h2>
          <p className="text-gray-400 text-sm mb-8">Choose a strong password for your account</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl pl-11 pr-12 py-3.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition placeholder-gray-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {password && (
                <div className="bg-white/5 rounded-xl p-3 mt-2 grid grid-cols-2 gap-1">
                  {passwordRules.map(({ rule, valid }) => (
                    <span key={rule} className={`text-xs ${valid ? 'text-green-400' : 'text-gray-500'}`}>
                      {valid ? '✓' : '○'} {rule}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={`w-full bg-white/5 border text-white rounded-xl pl-11 pr-4 py-3.5 outline-none focus:ring-2 transition placeholder-gray-600 ${
                    confirm && password !== confirm
                      ? 'border-red-500 focus:ring-red-500/20'
                      : 'border-white/10 focus:border-indigo-500 focus:ring-indigo-500/20'
                  }`}
                />
              </div>
              {confirm && password !== confirm && (
                <p className="text-red-400 text-xs">⚠ Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !passwordValid || password !== confirm}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Resetting...
                </span>
              ) : (
                'Reset Password →'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}