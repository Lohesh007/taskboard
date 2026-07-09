/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../api/axios';
import toast from 'react-hot-toast';

const PRIORITY_COLORS = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
};

export default function Board() {
  const { boardId } = useParams();
  const [searchParams] = useSearchParams();
  const workspaceId = searchParams.get('workspace');
  const navigate = useNavigate();

  const [board, setBoard] = useState(null);
  const [newCardTitles, setNewCardTitles] = useState({});
  const [addingCard, setAddingCard] = useState(null);

  // ✅ fetchBoard defined BEFORE useEffect
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
            const card = prev.columns
              .flatMap((c) => c.cards)
              .find((c) => c.id === cardId);
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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
      Loading board...
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(`/workspace/${workspaceId}`)}
          className="text-gray-400 hover:text-white transition"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold">{board.name}</h1>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-6">
          {board.columns.map((column) => (
            <div
              key={column.id}
              className="bg-gray-800 rounded-2xl p-4 min-w-72 w-72 flex-shrink-0"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg">{column.name}</h2>
                <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full">
                  {column.cards.length}
                </span>
              </div>

              <Droppable droppableId={String(column.id)}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-20 rounded-xl transition ${
                      snapshot.isDraggingOver ? 'bg-gray-700' : ''
                    }`}
                  >
                    {column.cards.map((card, index) => (
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
                            className={`bg-gray-700 rounded-xl p-4 mb-3 cursor-grab active:cursor-grabbing transition ${
                              snapshot.isDragging ? 'shadow-2xl rotate-2 opacity-90' : ''
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <p className="text-sm font-medium flex-1">{card.title}</p>
                              <button
                                onClick={() => deleteCard(card.id)}
                                className="text-gray-500 hover:text-red-400 transition text-xs flex-shrink-0"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[card.priority]}`} />
                              <span className="text-xs text-gray-400 capitalize">{card.priority}</span>
                              {card.due_date && (
                                <span className="text-xs text-gray-400 ml-auto">
                                  📅 {card.due_date}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

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
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => addCard(column.id)}
                      className="bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-lg text-sm font-semibold transition"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setAddingCard(null)}
                      className="text-gray-400 hover:text-white px-3 py-1 rounded-lg text-sm transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingCard(column.id)}
                  className="w-full text-gray-400 hover:text-white hover:bg-gray-700 rounded-xl py-2 text-sm transition mt-2"
                >
                  + Add card
                </button>
              )}
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}