import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function Workspace() {
  const [workspaces, setWorkspaces] = useState([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const res = await api.get('/workspaces/');
      setWorkspaces(res.data);
    } catch {
      toast.error('Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  const createWorkspace = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/workspaces/', { name: newName });
      setWorkspaces([...workspaces, res.data]);
      setNewName('');
      toast.success('Workspace created!');
    } catch {
      toast.error('Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const colors = [
    'from-indigo-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-purple-500 to-pink-600',
    'from-orange-500 to-red-600',
    'from-green-500 to-teal-600',
    'from-yellow-500 to-orange-600',
  ];

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Background blobs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-indigo-600 rounded-full opacity-10 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-purple-600 rounded-full opacity-10 blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="relative border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-lg">⚡</span>
            </div>
            <span className="text-xl font-black tracking-tight">
              Task<span className="text-indigo-400">Board</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <span className="text-lg">{user?.avatar}</span>
              <span className="text-sm text-gray-300 font-medium">{user?.username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 px-4 py-2 rounded-xl text-sm font-semibold transition"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-black mb-2">
            Your Workspaces
            <span className="text-indigo-400"> 🚀</span>
          </h1>
          <p className="text-gray-400">Manage your teams and projects in one place</p>
        </div>

        {/* Create Workspace */}
        <form onSubmit={createWorkspace} className="mb-10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-3 backdrop-blur-xl">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter workspace name..."
              className="flex-1 bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition placeholder-gray-600"
            />
            <button
              type="submit"
              disabled={creating}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-6 py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-indigo-500/30 whitespace-nowrap"
            >
              {creating ? '...' : '+ New Workspace'}
            </button>
          </div>
        </form>

        {/* Workspace Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <svg className="animate-spin h-10 w-10 text-indigo-500 mx-auto mb-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              <p className="text-gray-400">Loading workspaces...</p>
            </div>
          </div>
        ) : workspaces.length === 0 ? (
          <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl">
            <div className="text-6xl mb-4">🏗️</div>
            <h3 className="text-xl font-bold text-white mb-2">No workspaces yet</h3>
            <p className="text-gray-400">Create your first workspace to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((ws, index) => (
              <div
                key={ws.id}
                onClick={() => navigate(`/workspace/${ws.id}`)}
                className="group bg-white/5 border border-white/10 hover:border-indigo-500/50 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/10 backdrop-blur-xl"
              >
                {/* Color Banner */}
                <div className={`h-2 bg-gradient-to-r ${colors[index % colors.length]}`} />
                <div className="p-6">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[index % colors.length]} flex items-center justify-center text-2xl mb-4 shadow-lg`}>
                    🏢
                  </div>
                  <h2 className="text-xl font-bold mb-3 group-hover:text-indigo-300 transition">
                    {ws.name}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      👥 {ws.members_detail?.length} member{ws.members_detail?.length !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      📋 {ws.boards?.length} board{ws.boards?.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}