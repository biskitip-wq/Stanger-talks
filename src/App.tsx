import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { StrangerMatchView } from './components/StrangerMatchView';
import { ActiveUsersView } from './components/ActiveUsersView';
import { MomentsFeedView } from './components/MomentsFeedView';
import { ConversationsView } from './components/ConversationsView';
import { ProfileView } from './components/ProfileView';
import { DirectChatScreen } from './components/DirectChatScreen';
import { AuthModal } from './components/AuthModal';
import { InstallModal } from './components/InstallModal';
import { User, AppStats } from './types';
import { soundManager } from './utils/sound';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('moments');
  const [activeDirectChat, setActiveDirectChat] = useState<{
    conversationId: string;
    participant: User;
  } | null>(null);

  const [stats, setStats] = useState<AppStats | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [roseToast, setRoseToast] = useState<string | null>(null);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [isSwitchOpen, setIsSwitchOpen] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  // Check URL query for test user flag
  const getStorageKey = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const testId = urlParams.get('account');
    return testId ? `sf_user_${testId}` : 'sf_current_user';
  };

  // Load user from storage on mount
  useEffect(() => {
    const storageKey = getStorageKey();
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const u = JSON.parse(saved);
        setCurrentUser(u);
      } catch {
        setIsAuthOpen(true);
      }
    } else {
      setIsAuthOpen(true);
    }
  }, []);

  // Fetch stats periodically
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 8000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket Connection
  const connectWebSocket = useCallback(() => {
    if (!currentUser) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        ws.send(
          JSON.stringify({
            type: 'auth',
            userId: currentUser.id,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'presence') {
            window.dispatchEvent(new CustomEvent('sf_ws_presence', { detail: data }));
            fetchStats();
          }

          if (data.type === 'direct_message') {
            if (data.message.senderId !== currentUser.id && activeDirectChat?.conversationId !== data.conversationId) {
              setUnreadCount((c) => c + 1);
            }
          }

          // Dispatch to global event bus for active view components
          window.dispatchEvent(new CustomEvent('sf_ws_message', { detail: data }));
        } catch (err) {
          console.error('WS parse error:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Try auto reconnect after 3 seconds
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      ws.onerror = () => {
        setIsConnected(false);
      };
    } catch (err) {
      console.warn('WS initialization error:', err);
    }
  }, [currentUser, activeDirectChat]);

  useEffect(() => {
    if (currentUser) {
      connectWebSocket();
    }
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [currentUser, connectWebSocket]);

  // Listener to send messages through WebSocket from child components
  useEffect(() => {
    const handleSend = (e: CustomEvent) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(e.detail));
      }
    };

    window.addEventListener('sf_ws_send' as any, handleSend as any);
    return () => {
      window.removeEventListener('sf_ws_send' as any, handleSend as any);
    };
  }, []);

  // Handle successful registration or profile update
  const handleAuthSuccess = (user: User) => {
    const storageKey = getStorageKey();
    localStorage.setItem(storageKey, JSON.stringify(user));
    setCurrentUser(user);
    setIsAuthOpen(false);
    setIsEditProfileOpen(false);
    setIsSwitchOpen(false);
    fetchStats();
  };

  // Open Direct Chat with user
  const handleStartDirectChatWith = async (targetUserId: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    try {
      const res = await fetch('/api/conversations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          targetUserId,
        }),
      });
      const data = await res.json();
      if (data.conversation) {
        setActiveDirectChat({
          conversationId: data.conversation.id,
          participant: data.conversation.participant,
        });
      }
    } catch (err) {
      console.error('Failed to start chat:', err);
    }
  };

  // Open conversation from inbox
  const handleOpenConversation = (conversationId: string, participant: User) => {
    setActiveDirectChat({
      conversationId,
      participant,
    });
  };

  // Send a romantic Rose & Love Spark to a stranger
  const handleSendRoseTo = async (targetUserId: string, targetName: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    try {
      const res = await fetch(`/api/users/${targetUserId}/send-crush`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: currentUser.id }),
      });
      const data = await res.json();
      soundManager.playMatch();
      setRoseToast(`🌹 You sent a sweet Rose & Love Spark to ${targetName}!`);
      setTimeout(() => setRoseToast(null), 3500);

      if (data.conversationId) {
        // Open the conversation directly
        const targetRes = await fetch(`/api/users/${targetUserId}`);
        const targetData = await targetRes.json();
        if (targetData.user) {
          setActiveDirectChat({
            conversationId: data.conversationId,
            participant: targetData.user,
          });
        }
      }
    } catch (err) {
      console.error('Failed to send rose:', err);
    }
  };

  // Open a 2nd window with a separate account session so testing is effortless
  const handleOpenTestAccountTab = () => {
    const currentAccount = new URLSearchParams(window.location.search).get('account') || '1';
    const nextAccount = currentAccount === '1' ? '2' : '1';
    const newUrl = `${window.location.origin}${window.location.pathname}?account=${nextAccount}`;
    window.open(newUrl, '_blank');
  };

  // Switch account locally
  const handleSwitchAccount = () => {
    setIsSwitchOpen(true);
  };

  const handleLogout = () => {
    const storageKey = getStorageKey();
    localStorage.removeItem(storageKey);
    setCurrentUser(null);
    setActiveDirectChat(null);
    setIsAuthOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Floating Romantic Toast */}
      {roseToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 text-white text-xs font-semibold shadow-xl shadow-rose-600/30 flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <span>{roseToast}</span>
        </div>
      )}

      {/* Top Header */}
      <Header
        currentUser={currentUser}
        stats={stats}
        isConnected={isConnected}
        onOpenInstall={() => setIsInstallOpen(true)}
        onOpenSwitchAccount={handleSwitchAccount}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16 overflow-hidden flex flex-col">
        {activeDirectChat && currentUser ? (
          <DirectChatScreen
            conversationId={activeDirectChat.conversationId}
            partner={activeDirectChat.participant}
            currentUser={currentUser}
            onBack={() => setActiveDirectChat(null)}
          />
        ) : (
          <>
            {activeTab === 'moments' && currentUser && (
              <MomentsFeedView
                currentUser={currentUser}
                onStartDirectChatWith={handleStartDirectChatWith}
                onSendRoseTo={handleSendRoseTo}
                onOpenTestTab={handleOpenTestAccountTab}
              />
            )}

            {activeTab === 'stranger' && currentUser && (
              <StrangerMatchView
                currentUser={currentUser}
                onStartDirectChatWith={handleStartDirectChatWith}
                onSendRoseTo={handleSendRoseTo}
                onOpenTestTab={handleOpenTestAccountTab}
              />
            )}

            {activeTab === 'discover' && currentUser && (
              <ActiveUsersView
                currentUser={currentUser}
                onStartDirectChatWith={handleStartDirectChatWith}
                onSendRoseTo={handleSendRoseTo}
                onOpenTestTab={handleOpenTestAccountTab}
              />
            )}

            {activeTab === 'chats' && currentUser && (
              <ConversationsView
                currentUser={currentUser}
                onOpenConversation={handleOpenConversation}
                onGoToDirectory={() => setActiveTab('discover')}
              />
            )}

            {activeTab === 'profile' && currentUser && (
              <ProfileView
                currentUser={currentUser}
                stats={stats}
                onEditProfile={() => setIsEditProfileOpen(true)}
                onOpenInstall={() => setIsInstallOpen(true)}
                onSwitchAccount={handleSwitchAccount}
                onLogout={handleLogout}
              />
            )}
          </>
        )}
      </main>

      {/* Fixed Bottom Navigation (hidden when inside a direct chat screen for immersion) */}
      {!activeDirectChat && (
        <BottomNav
          activeTab={activeTab}
          onChangeTab={(tab) => {
            setActiveTab(tab);
            if (tab === 'chats') {
              setUnreadCount(0);
            }
          }}
          unreadCount={unreadCount}
          onlineCount={stats?.onlineUsers ?? 0}
        />
      )}

      {/* Auth Modal (Register First Time) */}
      <AuthModal
        isOpen={isAuthOpen}
        currentUser={null}
        onSuccess={handleAuthSuccess}
        canClose={!!currentUser}
        onClose={() => setIsAuthOpen(false)}
      />

      {/* Edit Profile Modal */}
      {currentUser && (
        <AuthModal
          isOpen={isEditProfileOpen}
          currentUser={currentUser}
          onSuccess={handleAuthSuccess}
          canClose={true}
          onClose={() => setIsEditProfileOpen(false)}
        />
      )}

      {/* Switch Account Modal */}
      {isSwitchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4">
            <button
              onClick={() => setIsSwitchOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              ✕
            </button>

            <h3 className="text-base font-bold text-white">Switch or Test Account</h3>
            <p className="text-xs text-slate-400">
              Create another real account to chat with yourself in 2 tabs or switch user.
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setIsSwitchOpen(false);
                  handleOpenTestAccountTab();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition"
              >
                Open 2nd Window as User #2 (Test 2-way chat)
              </button>

              <button
                onClick={() => {
                  setIsSwitchOpen(false);
                  setIsAuthOpen(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
              >
                Register a Brand New Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Install APK Modal */}
      <InstallModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
      />
    </div>
  );
}
