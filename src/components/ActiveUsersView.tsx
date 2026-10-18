import React, { useState, useEffect } from 'react';
import {
  Search,
  MessageCircle,
  Radio,
  MapPin,
  Filter,
  ShieldCheck,
  UserPlus,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { User } from '../types';

interface ActiveUsersViewProps {
  currentUser: User;
  onStartDirectChatWith: (targetUserId: string) => void;
  onSendRoseTo: (targetUserId: string, targetName: string) => void;
  onOpenTestTab: () => void;
}

export const ActiveUsersView: React.FC<ActiveUsersViewProps> = ({
  currentUser,
  onStartDirectChatWith,
  onSendRoseTo,
  onOpenTestTab,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'online' | 'female' | 'male'>('all');
  const [totalCount, setTotalCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedProfile, setSelectedProfile] = useState<User | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        currentUserId: currentUser.id,
        filter: activeFilter,
        q: searchQuery,
        page: page.toString(),
        limit: '60',
      });
      const res = await fetch(`/api/users/active?${params}`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotalCount(data.total || 0);
      setOnlineCount(data.totalOnline || 0);
    } catch (err) {
      console.error('Failed to load active users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [activeFilter, page]);

  // Handle debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Listen for real-time presence updates via WS custom event
  useEffect(() => {
    const handlePresence = (e: CustomEvent) => {
      const { userId, isOnline } = e.detail;
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isOnline } : u))
      );
      if (isOnline) {
        setOnlineCount((c) => c + 1);
      } else {
        setOnlineCount((c) => Math.max(0, c - 1));
      }
    };

    window.addEventListener('sf_ws_presence' as any, handlePresence as any);
    return () => {
      window.removeEventListener('sf_ws_presence' as any, handlePresence as any);
    };
  }, []);

  return (
    <div className="flex flex-col h-[calc(100dvh-112px)] max-w-3xl mx-auto w-full bg-slate-950/50 sm:border-x sm:border-slate-800">
      {/* Top Search & Filter Bar */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white tracking-tight">
              Community Directory
            </h2>
            <span className="text-[11px] text-slate-400">
              ({totalCount} real people)
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <Radio className="w-2.5 h-2.5 animate-pulse" />
              <span className="tabular-nums">{onlineCount}</span> Live Now
            </span>
            <button
              onClick={fetchUsers}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Refresh Directory"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search strangers by name, city, or interest..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:border-indigo-500 focus:outline-hidden placeholder:text-slate-600 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {[
            { id: 'all', label: 'All Registered' },
            { id: 'online', label: 'Online Now' },
            { id: 'female', label: 'Female' },
            { id: 'male', label: 'Male' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition active:scale-95 ${
                activeFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Content List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500 space-y-2">
            <span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Loading active community...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center p-6 space-y-4 max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">No Fake Bots Added!</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                As requested, only genuine registered people appear here.
                Be the first to invite your friends or launch a 2nd user tab to start chatting!
              </p>
            </div>
            <button
              onClick={onOpenTestTab}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Open 2nd Account to Test Multi-User</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800/90 transition shadow-sm flex items-center justify-between gap-3 group"
              >
                {/* User avatar & Info */}
                <div
                  onClick={() => setSelectedProfile(user)}
                  className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                >
                  <div className="relative shrink-0">
                    <img
                      src={user.avatar}
                      alt={user.displayName}
                      className="w-12 h-12 rounded-full object-cover bg-slate-800 ring-2 ring-slate-800 group-hover:ring-indigo-500/40 transition"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                        user.isOnline ? 'bg-emerald-400' : 'bg-slate-600'
                      }`}
                      title={user.isOnline ? 'Online Now' : 'Offline'}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition">
                        {user.displayName}
                      </span>
                      <span className="text-xs text-slate-400 truncate">
                        @{user.username}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                      <span>{user.gender}</span>
                      <span>·</span>
                      <span className="tabular-nums">{user.age} yrs</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5 text-slate-400">
                        <MapPin className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                        {user.city}
                      </span>
                    </div>

                    {user.statusMessage && (
                      <p className="text-[11px] text-slate-400 truncate mt-1 italic">
                        "{user.statusMessage}"
                      </p>
                    )}

                    {/* Interests tags */}
                    {user.interests && user.interests.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 overflow-hidden">
                        {user.interests.slice(0, 3).map((item) => (
                          <span
                            key={item}
                            className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800/80 shrink-0"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons: Send Rose and Message */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onSendRoseTo(user.id, user.displayName)}
                    className="py-1.5 px-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-medium flex items-center gap-1 transition active:scale-95"
                    title={`Send a Rose to ${user.displayName}`}
                  >
                    <span>🌹</span>
                    <span className="hidden sm:inline">Rose</span>
                  </button>

                  <button
                    onClick={() => onStartDirectChatWith(user.id)}
                    className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition active:scale-95"
                    title={`Message ${user.displayName}`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Profile Detail Bottom Sheet / Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4">
            <button
              onClick={() => setSelectedProfile(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              ✕
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="relative mb-2">
                <img
                  src={selectedProfile.avatar}
                  alt={selectedProfile.displayName}
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-indigo-500/30"
                />
                <span
                  className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
                    selectedProfile.isOnline ? 'bg-emerald-400' : 'bg-slate-600'
                  }`}
                />
              </div>

              <h3 className="text-lg font-bold text-white">
                {selectedProfile.displayName}
              </h3>
              <p className="text-xs text-slate-400">@{selectedProfile.username}</p>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                <span>{selectedProfile.gender}</span>
                <span>·</span>
                <span>{selectedProfile.age} yrs</span>
                <span>·</span>
                <span>{selectedProfile.city}</span>
              </div>
            </div>

            {selectedProfile.bio && (
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  About
                </div>
                {selectedProfile.bio}
              </div>
            )}

            {selectedProfile.interests && selectedProfile.interests.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Interests
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProfile.interests.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs text-indigo-300 bg-indigo-950/50 border border-indigo-800/60 px-2.5 py-1 rounded-lg"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const id = selectedProfile.id;
                  const name = selectedProfile.displayName;
                  setSelectedProfile(null);
                  onSendRoseTo(id, name);
                }}
                className="w-full py-2.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/40 border border-rose-500/40 text-rose-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <span>🌹</span>
                <span>Send Rose</span>
              </button>

              <button
                onClick={() => {
                  const id = selectedProfile.id;
                  setSelectedProfile(null);
                  onStartDirectChatWith(id);
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/25 flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Direct Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
