import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function AcceptInvite() {
  const { token } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvite();
  }, [token]);

  const fetchInvite = async () => {
    try {
      const res = await api.get(`/workspaces/invite/${token}/`);
      setInvite(res.data);
    } catch {
      setError('This invitation is invalid or has already been used.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!user) {
      // Save token to localStorage and redirect to login
      localStorage.setItem('pending_invite', token);
      navigate('/login');
      return;
    }

    setAccepting(true);
    try {
      const res = await api.post(`/workspaces/invite/${token}/accept/`);
      toast.success(`Joined ${invite.workspace_name}! 🎉`);
      navigate(`/workspace/${res.data.workspace_id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to accept invite');
    } finally {
      setAccepting(false);
    }
  };

  const roleColors = {
    admin: 'text-red-400 bg-red-500/10 border-red-500/20',
    member: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    viewer: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-indigo-600 rounded-full opacity-20 blur-3xl animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-purple-600 rounded-full opacity-20 blur-3xl animate-pulse" />
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
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          {loading ? (
            <div className="text-center py-8">
              <svg className="animate-spin h-10 w-10 text-indigo-500 mx-auto mb-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              <p className="text-gray-400">Loading invitation...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">❌</div>
              <h2 className="text-xl font-bold text-white mb-2">Invalid Invitation</h2>
              <p className="text-gray-400 mb-6">{error}</p>
              <Link
                to="/login"
                className="block w-full text-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3.5 rounded-xl transition hover:opacity-90"
              >
                Go to Login
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  You're invited!
                </h2>
                <p className="text-gray-400 text-sm">
                  <span className="text-indigo-400 font-semibold">
                    {invite.invited_by}
                  </span>
                  {' '}has invited you to join
                </p>
              </div>

              {/* Workspace Card */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                    🏢
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {invite.workspace_name}
                    </h3>
                    <p className="text-gray-400 text-sm">Workspace</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm">Your role:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border capitalize ${roleColors[invite.role]}`}>
                    {invite.role}
                  </span>
                </div>
              </div>

              {/* Role Description */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 text-sm text-gray-400">
                {invite.role === 'admin' && '👑 As an Admin, you can manage members, create boards, and edit everything.'}
                {invite.role === 'member' && '✏️ As a Member, you can create and edit cards and boards.'}
                {invite.role === 'viewer' && '👁️ As a Viewer, you can see all boards and cards but cannot make changes.'}
              </div>

              {/* Not logged in warning */}
              {!user && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
                  <p className="text-amber-400 text-sm text-center">
                    ⚠️ You need to login or register first to accept this invitation
                  </p>
                </div>
              )}

              {/* Logged in as different email */}
              {user && user.email !== invite.email && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
                  <p className="text-amber-400 text-sm text-center">
                    ⚠️ This invite was sent to <strong>{invite.email}</strong> but you're logged in as <strong>{user.email}</strong>
                  </p>
                </div>
              )}

              {/* Accept Button */}
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 mb-3"
              >
                {accepting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Joining...
                  </span>
                ) : user ? (
                  `Accept & Join ${invite.workspace_name} →`
                ) : (
                  'Login to Accept Invitation →'
                )}
              </button>

              {!user && (
                <Link
                  to={`/register?invite=${token}`}
                  className="block w-full text-center border border-white/10 hover:border-indigo-500/50 text-gray-300 hover:text-white font-semibold py-3.5 rounded-xl transition-all duration-200 hover:bg-white/5"
                >
                  Create new account instead
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}