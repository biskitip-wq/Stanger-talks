import React from 'react';
import {
  User as UserIcon,
  MapPin,
  Edit3,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Sparkles,
  Volume2,
  Copy,
  Check,
  Radio
} from 'lucide-react';
import { User, AppStats } from '../types';

interface ProfileViewProps {
  currentUser: User;
  stats: AppStats | null;
  onEditProfile: () => void;
  onOpenInstall: () => void;
  onSwitchAccount: () => void;
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  stats,
  onEditProfile,
  onOpenInstall,
  onSwitchAccount,
  onLogout,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-112px)] max-w-2xl mx-auto w-full overflow-y-auto p-4 space-y-4 bg-slate-950/50 sm:border-x sm:border-slate-800">
      {/* Profile Card */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3 relative">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.displayName}
                className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-500/50 bg-slate-800"
              />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
            </div>

            <div className="min-w-0">
              <h2 className="text-base font-bold text-white truncate">
                {currentUser.displayName}
              </h2>
              <p className="text-xs text-slate-400 truncate">@{currentUser.username}</p>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                <span>{currentUser.gender}</span>
                <span>·</span>
                <span className="tabular-nums">{currentUser.age} yrs</span>
                <span>·</span>
                <span className="flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" />
                  {currentUser.city}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onEditProfile}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95 flex items-center gap-1.5 text-xs font-medium"
            title="Edit Profile"
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Edit DP</span>
          </button>
        </div>

        {/* Bio */}
        {currentUser.bio && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-300 leading-relaxed">
            {currentUser.bio}
          </div>
        )}

        {/* Status Line */}
        {currentUser.statusMessage && (
          <div className="mt-2 text-xs text-rose-300 italic flex items-center gap-1.5">
            <span>💕</span>
            <span>"{currentUser.statusMessage}"</span>
          </div>
        )}

        {/* Interests */}
        {currentUser.interests && currentUser.interests.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {currentUser.interests.map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-medium text-rose-200/90 bg-rose-950/40 px-2.5 py-0.5 rounded-md border border-rose-900/40"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Network Stats Card */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            Real Users
          </div>
          <div className="text-lg font-bold text-white tabular-nums mt-0.5">
            {stats?.totalRegisteredUsers ?? 1}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <div className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider">
            Live Now
          </div>
          <div className="text-lg font-bold text-emerald-300 tabular-nums mt-0.5 flex items-center justify-center gap-1">
            <Radio className="w-3 h-3 animate-pulse" />
            {stats?.onlineUsers ?? 1}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <div className="text-[10px] uppercase font-semibold text-rose-400 tracking-wider">
            Moments
          </div>
          <div className="text-lg font-bold text-rose-300 tabular-nums mt-0.5 flex items-center justify-center gap-1">
            <span>📷</span>
            <span>{stats?.totalPosts ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Android APK Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 to-cyan-950/40 border border-indigo-900/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 flex items-center justify-center text-indigo-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Android APK App</h3>
              <p className="text-[11px] text-slate-400">Install to your phone launcher</p>
            </div>
          </div>
          <button
            onClick={onOpenInstall}
            className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition active:scale-95"
          >
            Install
          </button>
        </div>
      </div>

      {/* Account & Testing Tools */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Testing & Profiles
        </h4>

        {/* Switch Account / Test 2nd Account */}
        <button
          onClick={onSwitchAccount}
          className="w-full p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800/80 flex items-center justify-between text-xs text-slate-200 transition"
        >
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-indigo-400" />
            <span>Switch or Create 2nd Test Account</span>
          </div>
          <span className="text-[11px] text-slate-500">Tap to test 2-way</span>
        </button>

        {/* Copy Invite Link */}
        <button
          onClick={handleCopyLink}
          className="w-full p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800/80 flex items-center justify-between text-xs text-slate-200 transition"
        >
          <div className="flex items-center gap-2">
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-indigo-400" />}
            <span>{copied ? 'App Link Copied!' : 'Copy Share Link for Friends'}</span>
          </div>
          <span className="text-[11px] text-slate-500">Invite Real People</span>
        </button>

        {/* Zero bots guarantee badge */}
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Zero Fake Bots: Only real active registered people appear in this app.</span>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full py-3 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-900/50 text-rose-400 font-medium text-xs flex items-center justify-center gap-2 transition"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Log Out / Switch User</span>
      </button>
    </div>
  );
};
