import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  MessageCircle,
  Camera,
  Upload,
  Send,
  Sparkles,
  MapPin,
  X,
  Share2,
  ShieldCheck,
  Check,
  UserPlus
} from 'lucide-react';
import { User, Post } from '../types';
import { soundManager } from '../utils/sound';

interface MomentsFeedViewProps {
  currentUser: User;
  onStartDirectChatWith: (targetUserId: string) => void;
  onSendRoseTo: (targetUserId: string, targetName: string) => void;
  onOpenTestTab: () => void;
}

const ROMANTIC_MOODS = [
  'Romantic 💕',
  'Late Night Thoughts 🌙',
  'Looking for My Special One 🌹',
  'Coffee & Conversations ☕',
  'Good Vibes Only ✨',
  'Weekend Explorer 🚗',
  'Music & Soul 🎧',
];

export const MomentsFeedView: React.FC<MomentsFeedViewProps> = ({
  currentUser,
  onStartDirectChatWith,
  onSendRoseTo,
  onOpenTestTab,
}) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // New post form state
  const [postImage, setPostImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedMood, setSelectedMood] = useState(ROMANTIC_MOODS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [floatingHeartPostId, setFloatingHeartPostId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/posts');
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Please choose an image under 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPostImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postImage) {
      alert('Please select a photo to post');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          imageUrl: postImage,
          caption,
          mood: selectedMood,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPosts((prev) => [data.post, ...prev]);
        setIsCreateOpen(false);
        setPostImage(null);
        setCaption('');
        soundManager.playSent();
      } else {
        alert(data.error || 'Failed to post photo');
      }
    } catch (err) {
      console.error('Error creating post:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    try {
      soundManager.playSent();
      setFloatingHeartPostId(postId);
      setTimeout(() => setFloatingHeartPostId(null), 1000);

      // Optimistic update
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const hasLiked = p.likes.includes(currentUser.id);
          const newLikes = hasLiked
            ? p.likes.filter((id) => id !== currentUser.id)
            : [...p.likes, currentUser.id];
          return { ...p, likes: newLikes };
        })
      );

      await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!commentText.trim()) return;

    try {
      const res = await fetch(`/api/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          text: commentText.trim(),
        }),
      });

      const data = await res.json();
      if (data.comment) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, comments: [...p.comments, data.comment] } : p
          )
        );
        setCommentText('');
        soundManager.playSent();
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-112px)] max-w-2xl mx-auto w-full bg-slate-950/40 sm:border-x sm:border-rose-950/30">
      {/* Top Banner with Post Photo Trigger */}
      <div className="p-3 bg-gradient-to-r from-slate-950 via-purple-950/30 to-rose-950/40 border-b border-rose-900/30 flex items-center justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>Stranger Moments</span>
              <span className="text-rose-400">💕</span>
            </h2>
          </div>
          <p className="text-[11px] text-rose-300/70 truncate">
            Real photos & sweet vibes from strangers
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="py-1.5 px-3.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-rose-600/30 flex items-center gap-1.5 transition active:scale-95"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Post Photo</span>
        </button>
      </div>

      {/* Posts List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-rose-300 space-y-2">
            <span className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Loading moments...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center p-6 space-y-4 max-w-sm mx-auto">
            <div className="w-14 h-14 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
              <Camera className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Be the First to Post a Photo!</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Share a smile, a lovely view, or late-night thoughts. Real people can like, comment, and send you a romantic Rose 🌹!
              </p>
            </div>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 text-white font-semibold text-xs shadow-md flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Post Your First Photo</span>
            </button>
          </div>
        ) : (
          posts.map((post) => {
            const hasLiked = post.likes.includes(currentUser.id);
            const isMyPost = post.userId === currentUser.id;

            return (
              <div
                key={post.id}
                className="rounded-2xl bg-slate-900/90 border border-rose-950/40 hover:border-rose-900/60 shadow-lg shadow-black/40 overflow-hidden transition"
              >
                {/* Author Bar */}
                <div className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={post.userAvatar}
                      alt={post.userName}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-rose-500/40 bg-slate-800 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-white truncate">
                          {post.userName}
                        </span>
                        {post.mood && (
                          <span className="text-[10px] text-rose-300 bg-rose-950/70 border border-rose-800/40 px-2 py-0.5 rounded-full">
                            {post.mood}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-2.5 h-2.5 text-slate-500" />
                        <span>{post.userCity}</span>
                        <span>·</span>
                        <span className="tabular-nums">
                          {new Date(post.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Connect / Send Rose action */}
                  {!isMyPost && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onSendRoseTo(post.userId, post.userName)}
                        className="py-1 px-2.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-1 transition active:scale-95"
                        title="Send a Romantic Rose"
                      >
                        <span>🌹</span>
                        <span className="hidden sm:inline">Send Rose</span>
                      </button>

                      <button
                        onClick={() => onStartDirectChatWith(post.userId)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95"
                        title="Chat with poster"
                      >
                        <MessageCircle className="w-4 h-4 text-indigo-400" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Photo Display */}
                <div className="relative bg-black/60 max-h-[460px] flex items-center justify-center overflow-hidden">
                  <img
                    src={post.imageUrl}
                    alt={post.caption || 'Moment photo'}
                    className="w-full h-auto max-h-[460px] object-cover"
                  />

                  {/* Heart burst animation on like */}
                  {floatingHeartPostId === post.id && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-ping">
                      <Heart className="w-24 h-24 text-rose-500 fill-rose-500 drop-shadow-xl" />
                    </div>
                  )}
                </div>

                {/* Action Bar (Like, Comment count, Caption) */}
                <div className="p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Heart Button */}
                      <button
                        onClick={() => handleToggleLike(post.id)}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition active:scale-95 ${
                          hasLiked
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-400 hover:text-rose-300 hover:bg-slate-700'
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 transition ${
                            hasLiked ? 'fill-rose-500 text-rose-500 scale-110' : ''
                          }`}
                        />
                        <span className="tabular-nums">{post.likes.length}</span>
                      </button>

                      {/* Comment Toggle */}
                      <button
                        onClick={() =>
                          setActiveCommentPostId(
                            activeCommentPostId === post.id ? null : post.id
                          )
                        }
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 transition"
                      >
                        <MessageCircle className="w-4 h-4 text-cyan-400" />
                        <span className="tabular-nums">{post.comments.length}</span>
                      </button>
                    </div>

                    <button
                      onClick={() => onStartDirectChatWith(post.userId)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                    >
                      <span>Direct Chat</span>
                      <span>→</span>
                    </button>
                  </div>

                  {/* Caption */}
                  {post.caption && (
                    <p className="text-xs text-slate-200 leading-relaxed break-words font-medium">
                      {post.caption}
                    </p>
                  )}

                  {/* Comments Expansion */}
                  {activeCommentPostId === post.id && (
                    <div className="pt-2.5 border-t border-slate-800 space-y-2 animate-in fade-in">
                      {post.comments.length > 0 && (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {post.comments.map((c) => (
                            <div key={c.id} className="text-xs flex items-start gap-2">
                              <span className="font-bold text-rose-300 shrink-0">
                                {c.userName}:
                              </span>
                              <span className="text-slate-300 break-words">{c.text}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddComment(post.id);
                          }}
                          placeholder="Write a sweet comment..."
                          className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-rose-500 focus:outline-hidden placeholder:text-slate-600 transition"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          className="p-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition active:scale-95"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Photo Post Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in overflow-y-auto">
          <div className="relative w-full max-w-md bg-slate-900 border border-rose-900/40 rounded-2xl shadow-2xl p-5 text-slate-100 my-6">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-4">
              <h3 className="text-base font-bold text-white flex items-center justify-center gap-1.5">
                <span>Share a Moment</span>
                <span className="text-rose-400">✨</span>
              </h3>
              <p className="text-xs text-slate-400">
                Post a photo for active strangers to admire and connect
              </p>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-3.5">
              {/* Photo selector & preview */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {postImage ? (
                <div className="relative rounded-xl overflow-hidden max-h-56 bg-black flex items-center justify-center border border-rose-900/30">
                  <img
                    src={postImage}
                    alt="Preview"
                    className="w-full h-auto max-h-56 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPostImage(null)}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-40 rounded-xl border-2 border-dashed border-rose-900/50 hover:border-rose-500/60 bg-slate-950/50 flex flex-col items-center justify-center cursor-pointer transition p-4 text-center group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold text-white">
                    Tap to Choose Photo
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">
                    Upload from Gallery or Camera
                  </span>
                </div>
              )}

              {/* Romantic Mood selection */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Choose Vibe / Mood
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ROMANTIC_MOODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMood(m)}
                      className={`text-xs px-2.5 py-1 rounded-lg transition ${
                        selectedMood === m
                          ? 'bg-rose-600 text-white font-semibold shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Caption */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Caption / Sweet Note
                </label>
                <textarea
                  rows={2}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Tell strangers something cute about this photo..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-rose-500 focus:outline-hidden resize-none placeholder:text-slate-600"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !postImage}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-40"
              >
                {submitting ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Publish Moment</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
