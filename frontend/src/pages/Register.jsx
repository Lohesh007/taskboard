import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

const validatePassword = (password) => {
  const rules = [
    { rule: 'At least 8 characters', valid: password.length >= 8 },
    { rule: 'One uppercase letter', valid: /[A-Z]/.test(password) },
    { rule: 'One number', valid: /[0-9]/.test(password) },
    { rule: 'One special character (!@#$%^&*)', valid: /[!@#$%^&*]/.test(password) },
  ];
  return rules;
};

export default function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const passwordRules = validatePassword(password);
  const passwordValid = passwordRules.every((r) => r.valid);

  const checkEmail = async (value) => {
    setEmail(value);
    if (value.length > 5 && value.includes('@')) {
      try {
        const res = await api.post('/users/check-email/', { email: value });
        setEmailError(res.data.exists ? 'This email is already registered' : '');
      } catch {}
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (emailError || !passwordValid) return;
    setLoading(true);
    try {
      await register(email, username, password);
      toast.success('Account created! Welcome 🎉');
      navigate('/workspaces');
    } catch (err) {
      toast.error(err.response?.data?.email?.[0] || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-purple-600 rounded-full opacity-20 blur-3xl animate-pulse" />
        <div className="absolute bottom-[-20%] left-[-10%] w-96 h-96 bg-indigo-600 rounded-full opacity-20 blur-3xl animate-pulse" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-500/50">
            <span className="text-2xl">⚡</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">
            Task<span className="text-indigo-400">Board</span>
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Collaborate in real-time</p>
        </div>

        {/* Form Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-1">Create account ✨</h2>
          <p className="text-gray-400 text-sm mb-8">Join your team on TaskBoard</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1">
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">
                Email
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">📧</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => checkEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className={`w-full bg-white/5 border text-white rounded-xl pl-11 pr-4 py-3.5 outline-none focus:ring-2 transition placeholder-gray-600 ${
                    emailError
                      ? 'border-red-500 focus:ring-red-500/20'
                      : 'border-white/10 focus:border-indigo-500 focus:ring-indigo-500/20'
                  }`}
                />
              </div>
              {emailError && (
                <p className="text-red-400 text-xs flex items-center gap-1">
                  ⚠ {emailError}
                </p>
              )}
            </div>

            {/* Username */}
            <div className="space-y-1">
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">👤</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="yourname"
                  required
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl pl-11 pr-4 py-3.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition placeholder-gray-600"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={`w-full bg-white/5 border text-white rounded-xl pl-11 pr-12 py-3.5 outline-none focus:ring-2 transition placeholder-gray-600 ${
                    password && !passwordValid
                      ? 'border-red-500 focus:ring-red-500/20'
                      : password && passwordValid
                      ? 'border-green-500 focus:ring-green-500/20'
                      : 'border-white/10 focus:border-indigo-500 focus:ring-indigo-500/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>

              {/* Password Rules */}
              {password && (
                <div className="bg-white/5 rounded-xl p-3 mt-2 grid grid-cols-2 gap-1">
                  {passwordRules.map(({ rule, valid }) => (
                    <div key={rule} className="flex items-center gap-1.5">
                      <span className={`text-xs ${valid ? 'text-green-400' : 'text-gray-500'}`}>
                        {valid ? '✓' : '○'} {rule}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !!emailError || !passwordValid || !username}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create Account →'
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-gray-500 text-xs">Have an account?</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <Link
            to="/login"
            className="block w-full text-center border border-white/10 hover:border-indigo-500/50 text-gray-300 hover:text-white font-semibold py-3.5 rounded-xl transition-all duration-200 hover:bg-white/5"
          >
            Sign in instead
          </Link>
        </div>
      </div>
    </div>
  );
}