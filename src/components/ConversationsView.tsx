import React, { useState, useEffect } from 'react';
import { MessageSquare, Search, Radio, ChevronRight, UserPlus } from 'lucide-react';
import { User, ConversationSummary } from '../types';

interface ConversationsViewProps {
  currentUser: User;
  onOpenConversation: (conversationId: string, participant: User) => void;
  onGoToDirectory: () => void;
}

export const ConversationsView: React.FC<ConversationsViewProps> = ({
  currentUser,
  onOpenConversation,
  onGoToDirectory,
}) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchConversations = async () => {
    try {
      const res = await fetch(`/api/conversations?userId=${currentUser.id}`);
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [currentUser.id]);

  // Listen for new direct messages to update inbox in real time
  useEffect(() => {
    const handleWsMsg = (e: CustomEvent) => {
      const data = e.detail;
      if (data.type === 'direct_message') {
        fetchConversations();
      }
    };
    window.addEventListener('sf_ws_message' as any, handleWsMsg as any);
    return () => {
      window.removeEventListener('sf_ws_message' as any, handleWsMsg as any);
    };
  }, []);

  const filtered = conversations.filter((c) =>
    c.participant.displayName.toLowerCase().includes(search.toLowerCase()) ||
    c.participant.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100dvh-112px)] max-w-3xl mx-auto w-full bg-slate-950/50 sm:border-x sm:border-slate-800">
      {/* Top Search Bar */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white tracking-tight">Direct Chats</h2>
          <span className="text-xs text-slate-400">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:border-indigo-500 focus:outline-hidden placeholder:text-slate-600 transition"
          />
        </div>
      </div>

      {/* Inbox List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500 space-y-2">
            <span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Loading chats...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center p-6 space-y-3 max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">No Direct Chats Yet</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect with active strangers or message anyone from the Community directory.
              </p>
            </div>
            <button
              onClick={onGoToDirectory}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/25 flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Browse 1000+ Active People</span>
            </button>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => onOpenConversation(item.id, item.participant)}
              className="p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800/90 transition shadow-sm flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative shrink-0">
                  <img
                    src={item.participant.avatar}
                    alt={item.participant.displayName}
                    className="w-12 h-12 rounded-full object-cover bg-slate-800 ring-2 ring-slate-800 group-hover:ring-indigo-500/40 transition"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                      item.participant.isOnline ? 'bg-emerald-400' : 'bg-slate-600'
                    }`}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition">
                      {item.participant.displayName}
                    </span>
                    {item.lastMessage && (
                      <span className="text-[10px] text-slate-500 shrink-0 tabular-nums">
                        {new Date(item.lastMessage.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 truncate">
                    {item.lastMessage ? item.lastMessage.text || 'Photo or Voice note' : 'Start chatting...'}
                  </p>
                </div>
              </div>

              {item.unreadCount > 0 && (
                <span className="px-2 py-0.5 min-w-[20px] h-5 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                  {item.unreadCount}
                </span>
              )}

              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
