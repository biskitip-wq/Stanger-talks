import React, { useState } from 'react';
import { Camera, Upload, User as UserIcon, MapPin, Sparkles, X, Check, ShieldCheck } from 'lucide-react';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  currentUser: User | null;
  onSuccess: (user: User) => void;
  onClose?: () => void;
  canClose?: boolean;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
];

const INTEREST_OPTIONS = [
  'Deep Talks', 'Music', 'Gaming', 'Movies', 'Travel', 'Anime', 'Tech',
  'Fitness', 'Art', 'Foodie', 'Books', 'Late Night Vibe', 'Photography', 'Philosophy'
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  currentUser,
  onSuccess,
  onClose,
  canClose = false,
}) => {
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || AVATAR_PRESETS[0]);
  const [bio, setBio] = useState(currentUser?.bio || 'Hey! Looking to make new friends and chat.');
  const [gender, setGender] = useState(currentUser?.gender || 'Female');
  const [age, setAge] = useState<number>(currentUser?.age || 22);
  const [city, setCity] = useState(currentUser?.city || 'Delhi');
  const [statusMessage, setStatusMessage] = useState(currentUser?.statusMessage || 'Online & ready to talk');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    currentUser?.interests || ['Deep Talks', 'Music', 'Movies']
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest));
    } else {
      if (selectedInterests.length >= 6) return;
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError('Please choose an image under 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError('Please enter your Name');
      return;
    }

    const cleanUser = (username || displayName).toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    if (!cleanUser) {
      setError('Please choose a valid username');
      return;
    }

    setLoading(true);

    try {
      const endpoint = currentUser ? '/api/users/profile' : '/api/auth/register';
      const method = currentUser ? 'PUT' : 'POST';

      const payload = {
        userId: currentUser?.id,
        displayName: displayName.trim(),
        username: cleanUser,
        avatar,
        bio: bio.trim(),
        gender,
        age: Number(age),
        city: city.trim(),
        interests: selectedInterests,
        statusMessage: statusMessage.trim(),
      };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save profile');
      }

      onSuccess(data.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-100 my-8 max-h-[90vh] overflow-y-auto">
        {canClose && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            100% Real People · Zero Bots
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {currentUser ? 'Edit Profile & DP' : 'Create Your Profile'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {currentUser
              ? 'Update your photo and stranger preferences'
              : 'Join Stranger Friends to chat with real active people right now.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar / DP Selection */}
          <div className="flex flex-col items-center">
            <label className="text-xs font-medium text-slate-300 mb-2">
              Profile Picture (DP)
            </label>
            <div className="relative group">
              <div className="w-20 h-20 rounded-full ring-2 ring-indigo-500/40 p-0.5 overflow-hidden bg-slate-800 shadow-md">
                <img
                  src={avatar}
                  alt="DP Preview"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <label
                htmlFor="avatar-upload"
                className="absolute inset-0 rounded-full bg-black/40 backdrop-blur-xs flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer text-white"
                title="Upload Photo"
              >
                <Camera className="w-5 h-5" />
                <span className="text-[10px] font-medium mt-0.5">Upload</span>
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Quick Presets */}
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
              <label
                htmlFor="avatar-upload"
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition shrink-0"
              >
                <Upload className="w-3 h-3 text-indigo-400" />
                Custom DP
              </label>
              {AVATAR_PRESETS.map((p, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setAvatar(p)}
                  className={`w-7 h-7 rounded-full overflow-hidden shrink-0 transition ring-2 ${
                    avatar === p ? 'ring-indigo-500 scale-110' : 'ring-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={p} alt="Preset" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Name & Username Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Your Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-hidden transition placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Username <span className="text-slate-500">(@handle)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-500">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="rahul_99"
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-hidden transition placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>

          {/* Gender & Age & City */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-2.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:border-indigo-500 focus:outline-hidden transition"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Secret">Private</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Age</label>
              <input
                type="number"
                min="18"
                max="99"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:border-indigo-500 focus:outline-hidden transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Mumbai"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:border-indigo-500 focus:outline-hidden transition placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Bio / About You
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell strangers something interesting about you..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:border-indigo-500 focus:outline-hidden transition resize-none placeholder:text-slate-600"
            />
          </div>

          {/* Status Message */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Current Status / Mood
            </label>
            <input
              type="text"
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              placeholder="e.g. Listening to lo-fi · Looking for deep talks"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:border-indigo-500 focus:outline-hidden transition placeholder:text-slate-600"
            />
          </div>

          {/* Interests Chips */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">
                Interests (Choose up to 6)
              </label>
              <span className="text-[11px] text-slate-500">
                {selectedInterests.length}/6 selected
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-950/60 rounded-xl border border-slate-800/80">
              {INTEREST_OPTIONS.map((item) => {
                const isSelected = selectedInterests.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleInterest(item)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition active:scale-95 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{currentUser ? 'Save Changes' : 'Start Chatting as Stranger'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
