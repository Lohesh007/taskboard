import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

export default function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordErrors, setPasswordErrors] = useState([]);
  const { register } = useAuth();
  const navigate = useNavigate();

  const checkEmail = async (value) => {
    setEmail(value);
    if (value.length > 5 && value.includes('@')) {
      const res = await api.post('/users/check-email/', { email: value });
      if (res.data.exists) {
        setEmailError('This email is already registered');
      } else {
        setEmailError('');
      }
    }
  };

  const checkPassword = (value) => {
    setPassword(value);
    setPasswordErrors(validatePassword(value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (emailError) return;
    const errors = validatePassword(password);
    if (errors.length > 0) {
      toast.error('Please fix password errors first');
      return;
    }
    setLoading(true);
    try {
      await register(email, username, password);
      toast.success('Account created!');
      navigate('/workspaces');
    } catch (err) {
      toast.error(err.response?.data?.email?.[0] || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-2">Create account</h1>
        <p className="text-gray-400 mb-8">Start managing tasks with your team</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-gray-300 text-sm mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => checkEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className={`w-full bg-gray-700 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 ${
                emailError ? 'ring-2 ring-red-500' : 'focus:ring-indigo-500'
              }`}
            />
            {emailError && (
              <p className="text-red-400 text-xs mt-1">⚠ {emailError}</p>
            )}
          </div>

          <div>
            <label className="text-gray-300 text-sm mb-1 block">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="yourname"
              required
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm mb-1 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => checkPassword(e.target.value)}
              placeholder="••••••••"
              required
              className={`w-full bg-gray-700 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 ${
                passwordErrors.length > 0 ? 'ring-2 ring-red-500' : 'focus:ring-indigo-500'
              }`}
            />
            {/* Password strength indicators */}
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

          <button
            type="submit"
            disabled={loading || !!emailError || passwordErrors.length > 0}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-gray-400 text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}