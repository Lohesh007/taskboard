/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../api/axios';
import toast from 'react-hot-toast';

const PRIORITY_STYLES = {
  low: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Low' },
  medium: { bg: 'bg-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400', label: 'Medium' },
  high: { bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-400', label: 'High' },
};

const COLUMN_COLORS = [
  { border: 'border-indigo-500/50', header: 'text-indigo-400', dot: 'bg-indigo-400' },
  { border: 'border-amber-500/50', header: 'text-amber-400', dot: 'bg-amber-400' },
  { border: 'border-emerald-500/50', header: 'text-emerald-400', dot: 'bg-emerald-400' },
];

export default function Board() {
  const { boardId } = useParams();
  const [searchParams] = useSearchParams();
  const workspaceId = searchParams.get('workspace');
  const navigate = useNavigate();

  const [board, setBoard] = useState(null);
  const [newCardTitles, setNewCardTitles] = useState({});
  const [addingCard, setAddingCard] = useState(null);
  const [connected, setConnected] = useState(false);

  const fetchBoard = useCallback(async () => {
    try {
      const res = await api.get(`/workspaces/boards/${boardId}/`);
      setBoard(res.data);
    } catch {
      toast.error('Failed to load board');
    }
  }, [boardId]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  useEffect(() => {
    if (!workspaceId) return;
    const ws = new WebSocket(`wss://taskboard-production-f6df.up.railway.app/ws/workspace/${workspaceId}/`);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.event === 'card_created') {
        setBoard((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            columns: prev.columns.map((col) =>
              col.id === data.payload.column
                ? { ...col, cards: [...col.cards, data.payload] }
                : col
            ),
          };
        });
      }
      if (data.event === 'card_updated') {
        setBoard((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            columns: prev.columns.map((col) => ({
              ...col,
              cards: col.id === data.payload.column
                ? [...col.cards.filter(c => c.id !== data.payload.id), data.payload]
                : col.cards.filter(c => c.id !== data.payload.id),
            })),
          };
        });
      }
      if (data.event === 'card_deleted') {
        setBoard((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            columns: prev.columns.map((col) => ({
              ...col,
              cards: col.cards.filter((c) => c.id !== data.payload.id),
            })),
          };
        });
      }
    };
    return () => ws.close();
  }, [workspaceId]);

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId &&
        destination.index === source.index) return;

    const cardId = parseInt(draggableId);
    const newColumnId = parseInt(destination.droppableId);

    setBoard((prev) => {
      const newColumns = prev.columns.map((col) => ({
        ...col,
        cards: col.cards.filter((c) => c.id !== cardId),
      }));
      return {
        ...prev,
        columns: newColumns.map((col) => {
          if (col.id === newColumnId) {
            const card = prev.columns.flatMap((c) => c.cards).find((c) => c.id === cardId);
            const newCards = [...col.cards];
            newCards.splice(destination.index, 0, { ...card, column: newColumnId });
            return { ...col, cards: newCards };
          }
          return col;
        }),
      };
    });

    try {
      await api.put(`/workspaces/cards/${cardId}/`, { column: newColumnId });
    } catch {
      toast.error('Failed to move card');
      fetchBoard();
    }
  };

  const addCard = async (columnId) => {
    const title = newCardTitles[columnId]?.trim();
    if (!title) return;
    try {
      await api.post(`/workspaces/columns/${columnId}/cards/`, {
        title,
        priority: 'medium',
      });
      setNewCardTitles((prev) => ({ ...prev, [columnId]: '' }));
      setAddingCard(null);
      toast.success('Card added!');
    } catch {
      toast.error('Failed to add card');
    }
  };

  const deleteCard = async (cardId) => {
    try {
      await api.delete(`/workspaces/cards/${cardId}/`);
      toast.success('Card deleted');
    } catch {
      toast.error('Failed to delete card');
    }
  };

  if (!board) return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
      <div className="text-center">
        <svg className="animate-spin h-10 w-10 text-indigo-500 mx-auto mb-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <p className="text-gray-400">Loading board...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Background */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-indigo-600 rounded-full opacity-10 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-purple-600 rounded-full opacity-10 blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="relative border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-full px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(`/workspace/${workspaceId}`)}
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
          <h1 className="text-lg font-bold text-white">{board.name}</h1>
          <div className="ml-auto flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              connected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-gray-500/10 border-gray-500/30 text-gray-400'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`} />
              {connected ? 'Live' : 'Connecting...'}
            </div>
          </div>
        </div>
      </nav>

      {/* Kanban Board */}
      <div className="relative p-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-6 overflow-x-auto pb-6">
            {board.columns.map((column, colIndex) => {
              const colStyle = COLUMN_COLORS[colIndex % COLUMN_COLORS.length];
              return (
                <div
                  key={column.id}
                  className={`bg-white/5 backdrop-blur-xl border ${colStyle.border} rounded-2xl p-4 min-w-80 w-80 flex-shrink-0 flex flex-col`}
                >
                  {/* Column Header */}
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${colStyle.dot}`} />
                      <h2 className={`font-bold text-base ${colStyle.header}`}>
                        {column.name}
                      </h2>
                    </div>
                    <span className="bg-white/10 text-gray-300 text-xs px-2.5 py-1 rounded-full font-semibold">
                      {column.cards.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <Droppable droppableId={String(column.id)}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 min-h-20 rounded-xl transition-all duration-200 ${
                          snapshot.isDraggingOver
                            ? 'bg-indigo-500/10 border border-dashed border-indigo-500/50'
                            : ''
                        }`}
                      >
                        {column.cards.map((card, index) => {
                          const priority = PRIORITY_STYLES[card.priority] || PRIORITY_STYLES.medium;
                          return (
                            <Draggable
                              key={card.id}
                              draggableId={String(card.id)}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-white/8 border border-white/10 rounded-xl p-4 mb-3 cursor-grab active:cursor-grabbing transition-all duration-200 group hover:border-white/20 hover:bg-white/10 ${
                                    snapshot.isDragging
                                      ? 'shadow-2xl shadow-indigo-500/20 rotate-1 scale-105 border-indigo-500/30'
                                      : ''
                                  }`}
                                >
                                  <div className="flex justify-between items-start gap-2 mb-3">
                                    <p className="text-sm font-medium text-white flex-1 leading-snug">
                                      {card.title}
                                    </p>
                                    <button
                                      onClick={() => deleteCard(card.id)}
                                      className="text-gray-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100 flex-shrink-0 text-xs"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${priority.bg} ${priority.text}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
                                      {priority.label}
                                    </span>
                                    {card.due_date && (
                                      <span className="text-xs text-gray-500 ml-auto flex items-center gap-1">
                                        📅 {card.due_date}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>

                  {/* Add Card */}
                  {addingCard === column.id ? (
                    <div className="mt-2">
                      <input
                        autoFocus
                        value={newCardTitles[column.id] || ''}
                        onChange={(e) =>
                          setNewCardTitles((prev) => ({
                            ...prev,
                            [column.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') addCard(column.id);
                          if (e.key === 'Escape') setAddingCard(null);
                        }}
                        placeholder="Card title... (Enter to add)"
                        className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 placeholder-gray-500"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => addCard(column.id)}
                          className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg text-sm font-semibold transition"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setAddingCard(null)}
                          className="text-gray-400 hover:text-white px-3 py-1.5 rounded-lg text-sm transition hover:bg-white/5"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingCard(column.id)}
                      className="w-full text-gray-500 hover:text-white hover:bg-white/5 border border-dashed border-white/10 hover:border-white/20 rounded-xl py-2.5 text-sm transition-all duration-200 mt-2 flex items-center justify-center gap-1"
                    >
                      + Add card
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}