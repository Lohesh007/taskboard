/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function BoardList() {
  const { workspaceId } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [newBoardName, setNewBoardName] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const fetchWorkspace = useCallback(async () => {
    try {
      const res = await api.get(`/workspaces/${workspaceId}/`);
      setWorkspace(res.data);
    } catch {
      toast.error('Failed to load workspace');
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  const createBoard = async (e) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    setCreating(true);
    try {
      const res = await api.post(`/workspaces/${workspaceId}/boards/`, {
        name: newBoardName,
      });
      setWorkspace((prev) => ({
        ...prev,
        boards: [...(prev.boards || []), res.data],
      }));
      setNewBoardName('');
      toast.success('Board created!');
    } catch {
      toast.error('Failed to create board');
    } finally {
      setCreating(false);
    }
  };

  const colors = [
    'from-indigo-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-purple-500 to-pink-600',
    'from-orange-500 to-red-600',
    'from-green-500 to-teal-600',
    'from-yellow-500 to-orange-600',
  ];

  const icons = ['📋', '🎯', '🚀', '⚡', '🔥', '💡'];

  if (!workspace) return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
      <div className="text-center">
        <svg className="animate-spin h-10 w-10 text-indigo-500 mx-auto mb-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <p className="text-gray-400">Loading workspace...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Background */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-purple-600 rounded-full opacity-10 blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] w-96 h-96 bg-indigo-600 rounded-full opacity-10 blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="relative border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/workspaces')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 rounded-xl text-sm"
          >
            ← Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-lg">⚡</span>
            </div>
            <span className="text-xl font-black tracking-tight">
              Task<span className="text-indigo-400">Board</span>
            </span>
          </div>
          <div className="h-5 w-px bg-white/20" />
          <span className="text-gray-300 font-semibold">{workspace.name}</span>
        </div>
      </nav>

      {/* Main */}
      <div className="relative max-w-6xl mx-auto px-6 py-10">
        <div className="mb-10">
          <h1 className="text-4xl font-black mb-2">
            {workspace.name}
            <span className="text-indigo-400"> 📋</span>
          </h1>
          <p className="text-gray-400">Select a board or create a new one</p>
        </div>

        {/* Create Board */}
        <form onSubmit={createBoard} className="mb-10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-3 backdrop-blur-xl">
            <input
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="Enter board name..."
              className="flex-1 bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition placeholder-gray-600"
            />
            <button
              type="submit"
              disabled={creating}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-6 py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-indigo-500/30 whitespace-nowrap"
            >
              {creating ? '...' : '+ New Board'}
            </button>
          </div>
        </form>

        {/* Board Grid */}
        {workspace.boards?.length === 0 ? (
          <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-bold text-white mb-2">No boards yet</h3>
            <p className="text-gray-400">Create your first board to start organizing tasks!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspace.boards?.map((board, index) => (
              <div
                key={board.id}
                onClick={() => navigate(`/board/${board.id}?workspace=${workspaceId}`)}
                className="group bg-white/5 border border-white/10 hover:border-indigo-500/50 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/10 backdrop-blur-xl"
              >
                <div className={`h-2 bg-gradient-to-r ${colors[index % colors.length]}`} />
                <div className="p-6">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[index % colors.length]} flex items-center justify-center text-2xl mb-4 shadow-lg`}>
                    {icons[index % icons.length]}
                  </div>
                  <h2 className="text-xl font-bold mb-3 group-hover:text-indigo-300 transition">
                    {board.name}
                  </h2>
                  <p className="text-sm text-gray-400 flex items-center gap-1">
                    🗂️ {board.columns?.length} columns
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}