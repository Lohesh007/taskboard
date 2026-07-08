import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

const validatePassword = (password) => {
  const errors = [];
  if (password.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
  if (!/[0-9]/.test(password)) errors.push('One number');
  if (!/[!@#$%^&*]/.test(password)) errors.push('One special character (!@#$%^&*)');
  return errors;
};

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    const errors = validatePassword(password);
    if (errors.length > 0) {
      toast.error('Please fix password errors');
      return;
    }
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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-2">Set new password</h1>
        <p className="text-gray-400 mb-8">Choose a strong password for your account</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-gray-300 text-sm mb-1 block">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordErrors(validatePassword(e.target.value));
              }}
              placeholder="••••••••"
              required
              className={`w-full bg-gray-700 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 ${
                passwordErrors.length > 0 ? 'ring-2 ring-red-500' : 'focus:ring-indigo-500'
              }`}
            />
            {password && (
              <div className="mt-2 space-y-1">
                {['At least 8 characters', 'One uppercase letter', 'One number', 'One special character (!@#$%^&*)'].map((rule) => (
                  <div key={rule} className="flex items-center gap-2">
                    <span className={`text-xs ${
                      passwordErrors.includes(rule) ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {passwordErrors.includes(rule) ? '✕' : '✓'} {rule}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-gray-300 text-sm mb-1 block">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              className={`w-full bg-gray-700 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 ${
                confirm && password !== confirm ? 'ring-2 ring-red-500' : 'focus:ring-indigo-500'
              }`}
            />
            {confirm && password !== confirm && (
              <p className="text-red-400 text-xs mt-1">⚠ Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || passwordErrors.length > 0}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}