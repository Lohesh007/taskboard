/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function BoardList() {
  const { workspaceId } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [newBoardName, setNewBoardName] = useState('');
  const navigate = useNavigate();

  // ✅ fetchWorkspace defined BEFORE useEffect
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
    }
  };

  if (!workspace) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
      Loading...
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="flex items-center gap-4 mb-10">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-gray-400 hover:text-white transition text-lg"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold">{workspace.name}</h1>
      </div>

      <form onSubmit={createBoard} className="flex gap-3 mb-10">
        <input
          value={newBoardName}
          onChange={(e) => setNewBoardName(e.target.value)}
          placeholder="New board name..."
          className="bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 flex-1 max-w-sm"
        />
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-semibold transition"
        >
          + Create Board
        </button>
      </form>

      {workspace.boards?.length === 0 ? (
        <div className="bg-gray-800 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-lg">No boards yet. Create one above!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspace.boards?.map((board) => (
            <div
              key={board.id}
              onClick={() => navigate(`/board/${board.id}?workspace=${workspaceId}`)}
              className="bg-gray-800 hover:bg-gray-700 rounded-2xl p-6 cursor-pointer transition border border-gray-700 hover:border-indigo-500"
            >
              <h2 className="text-xl font-bold">{board.name}</h2>
              <p className="text-gray-400 text-sm mt-2">
                {board.columns?.length} columns
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}