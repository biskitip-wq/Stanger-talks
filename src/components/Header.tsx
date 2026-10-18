import React from 'react';
import { Volume2, VolumeX, Smartphone, RefreshCw, Radio } from 'lucide-react';
import { User, AppStats } from '../types';
import { soundManager } from '../utils/sound';

interface HeaderProps {
  currentUser: User | null;
  stats: AppStats | null;
  isConnected: boolean;
  onOpenInstall: () => void;
  onOpenSwitchAccount: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  stats,
  isConnected,
  onOpenInstall,
  onOpenSwitchAccount,
}) => {
  const [soundOn, setSoundOn] = React.useState(soundManager.isEnabled());

  const toggleSound = () => {
    const next = !soundOn;
    soundManager.setSoundEnabled(next);
    setSoundOn(next);
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 transition-colors">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 via-pink-500 to-indigo-600 p-0.5 shadow-md shadow-rose-500/25">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center overflow-hidden">
                <img
                  src="/src/assets/images/stranger_friends_app_icon_1792326855270.jpg"
                  alt="Stranger Friends"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span className="text-xs font-bold text-rose-400">SF</span>
              </div>
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-amber-400 animate-pulse'
              }`}
              title={isConnected ? 'Connected to live server' : 'Connecting to live server...'}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold text-white tracking-tight leading-tight truncate">
                Stranger Friends
              </h1>
              <span className="text-xs text-rose-400 animate-pulse">💕</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 leading-none">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Radio className="w-2.5 h-2.5 animate-pulse" />
                <span className="tabular-nums">{stats?.onlineUsers ?? 1}</span> live
              </span>
              <span>·</span>
              <span className="text-slate-400 truncate">
                {stats?.totalRegisteredUsers ?? 1} real users
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            aria-label={soundOn ? 'Mute sounds' : 'Enable sounds'}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition active:scale-95"
            title={soundOn ? 'Sound On' : 'Sound Muted'}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Android APK / Install Button */}
          <button
            onClick={onOpenInstall}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition active:scale-95"
            title="Install as Android APK or App"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Install App</span>
            <span className="sm:hidden">APK</span>
          </button>

          {/* User Profile Avatar / Switcher */}
          {currentUser && (
            <button
              onClick={onOpenSwitchAccount}
              className="flex items-center gap-1.5 p-1 pl-1.5 pr-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition active:scale-95"
              title="Current Profile - Tap to switch"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.displayName}
                className="w-6 h-6 rounded-full object-cover bg-slate-800"
              />
              <span className="text-xs text-slate-300 font-medium max-w-[80px] truncate hidden md:inline">
                {currentUser.displayName}
              </span>
              <RefreshCw className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
