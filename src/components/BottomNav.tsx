import React from 'react';
import { Flame, Users, MessageSquare, UserCircle, Heart, Camera } from 'lucide-react';

export type TabType = 'moments' | 'stranger' | 'discover' | 'chats' | 'profile';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  unreadCount: number;
  onlineCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  unreadCount,
  onlineCount,
}) => {
  const tabs = [
    {
      id: 'moments' as TabType,
      label: 'Moments',
      icon: Camera,
      badge: null,
    },
    {
      id: 'stranger' as TabType,
      label: 'Spark',
      icon: Heart,
      badge: null,
    },
    {
      id: 'discover' as TabType,
      label: 'People',
      icon: Users,
      badge: onlineCount > 0 ? `${onlineCount}` : null,
    },
    {
      id: 'chats' as TabType,
      label: 'Chats',
      icon: MessageSquare,
      badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : null,
    },
    {
      id: 'profile' as TabType,
      label: 'Profile',
      icon: UserCircle,
      badge: null,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/92 backdrop-blur-md border-t border-rose-950/40 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 transition-colors">
      <div className="max-w-md mx-auto grid grid-cols-5 items-center h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center min-h-[44px] min-w-[44px] w-full py-1 transition-all active:scale-95 ${
                isActive ? 'text-rose-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.4] text-rose-400' : 'stroke-[1.8]'
                  }`}
                />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 min-w-[16px] h-4 bg-gradient-to-r from-rose-500 to-indigo-600 text-[10px] font-bold text-white rounded-full flex items-center justify-center leading-none shadow">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] tracking-tight mt-1 truncate">
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 absolute bottom-0.5 shadow-sm shadow-rose-500" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
