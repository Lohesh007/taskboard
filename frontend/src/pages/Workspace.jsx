import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function Workspace() {
  const [workspaces, setWorkspaces] = useState([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
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
    try {
      const res = await api.post('/workspaces/', { name: newName });
      setWorkspaces([...workspaces, res.data]);
      setNewName('');
      toast.success('Workspace created!');
    } catch {
      toast.error('Failed to create workspace');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold">TaskBoard</h1>
          <p className="text-gray-400 mt-1">Welcome, {user?.username} {user?.avatar}</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-semibold transition"
        >
          Logout
        </button>
      </div>

      {/* Create Workspace */}
      <form onSubmit={createWorkspace} className="flex gap-3 mb-10">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New workspace name..."
          className="bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 flex-1 max-w-sm"
        />
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-semibold transition"
        >
          + Create
        </button>
      </form>

      {/* Workspace List */}
      {loading ? (
        <p className="text-gray-400">Loading workspaces...</p>
      ) : workspaces.length === 0 ? (
        <div className="bg-gray-800 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-lg">No workspaces yet. Create one above!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              onClick={() => navigate(`/workspace/${ws.id}`)}
              className="bg-gray-800 hover:bg-gray-700 rounded-2xl p-6 cursor-pointer transition border border-gray-700 hover:border-indigo-500"
            >
              <h2 className="text-xl font-bold mb-2">{ws.name}</h2>
              <p className="text-gray-400 text-sm">
                {ws.members_detail?.length} member{ws.members_detail?.length !== 1 ? 's' : ''}
              </p>
              <p className="text-gray-400 text-sm">
                {ws.boards?.length} board{ws.boards?.length !== 1 ? 's' : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}