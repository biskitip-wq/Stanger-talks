import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  Send,
  Image as ImageIcon,
  Mic,
  Square,
  Play,
  Pause,
  SkipForward,
  UserPlus,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  Smile,
  X
} from 'lucide-react';
import { User, StrangerPartner, StrangerMessage } from '../types';
import { soundManager } from '../utils/sound';

interface StrangerMatchViewProps {
  currentUser: User;
  onStartDirectChatWith: (targetUserId: string) => void;
  onSendRoseTo: (targetUserId: string, targetName: string) => void;
  onOpenTestTab: () => void;
}

export const StrangerMatchView: React.FC<StrangerMatchViewProps> = ({
  currentUser,
  onStartDirectChatWith,
  onSendRoseTo,
  onOpenTestTab,
}) => {
  const [matchingState, setMatchingState] = useState<'idle' | 'searching' | 'connected' | 'disconnected'>('idle');
  const [partner, setPartner] = useState<StrangerPartner | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StrangerMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [disconnectReason, setDisconnectReason] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  // Audio player state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Auto scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  // WebSocket message listeners
  useEffect(() => {
    const handleWsEvent = (e: CustomEvent) => {
      const data = e.detail;

      if (data.type === 'stranger_matched') {
        setPartner(data.stranger);
        setSessionId(data.sessionId);
        setMatchingState('connected');
        setMessages([
          {
            id: 'sys_' + Date.now(),
            senderId: 'system',
            text: `You are now chatting with a real stranger from ${data.stranger.city || 'somewhere in the world'}! Say hello! 👋`,
            timestamp: Date.now(),
          },
        ]);
        soundManager.playMatch();
      }

      if (data.type === 'stranger_message') {
        setMessages((prev) => [...prev, data.message]);
        if (data.message.senderId !== currentUser.id) {
          soundManager.playReceived();
        } else {
          soundManager.playSent();
        }
      }

      if (data.type === 'stranger_typing') {
        setPartnerTyping(!!data.isTyping);
      }

      if (data.type === 'stranger_partner_left') {
        setMatchingState('disconnected');
        setDisconnectReason(data.reason || 'Stranger has disconnected.');
        setPartnerTyping(false);
        soundManager.playReceived();
      }
    };

    window.addEventListener('sf_ws_message' as any, handleWsEvent as any);
    return () => {
      window.removeEventListener('sf_ws_message' as any, handleWsEvent as any);
    };
  }, [currentUser.id]);

  // Start Searching for a Stranger
  const handleFindStranger = async () => {
    setMatchingState('searching');
    setPartner(null);
    setSessionId(null);
    setMessages([]);
    setDisconnectReason('');

    try {
      const res = await fetch('/api/stranger/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          interests: currentUser.interests,
        }),
      });
      const data = await res.json();

      if (data.status === 'matched') {
        setPartner(data.stranger);
        setSessionId(data.sessionId);
        setMatchingState('connected');
        setMessages([
          {
            id: 'sys_' + Date.now(),
            senderId: 'system',
            text: `Matched with a real stranger (${data.stranger.displayName})! Say hi! ✨`,
            timestamp: Date.now(),
          },
        ]);
        soundManager.playMatch();
      }
      // If waiting, WS 'stranger_matched' will handle the match when another user joins!
    } catch (err) {
      console.error('Error finding stranger:', err);
      setMatchingState('idle');
    }
  };

  // Leave / Skip Stranger
  const handleSkipOrLeave = async () => {
    try {
      await fetch('/api/stranger/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
    } catch {
      // ignore
    }
    handleFindStranger();
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/stranger/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
    } catch {
      // ignore
    }
    setMatchingState('idle');
    setPartner(null);
    setSessionId(null);
    setMessages([]);
  };

  // Send Text Message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || matchingState !== 'connected') return;

    window.dispatchEvent(
      new CustomEvent('sf_ws_send', {
        detail: {
          type: 'stranger_msg',
          text: inputText.trim(),
        },
      })
    );

    // Stop typing
    window.dispatchEvent(
      new CustomEvent('sf_ws_send', {
        detail: {
          type: 'stranger_typing',
          isTyping: false,
        },
      })
    );

    setInputText('');
  };

  // Handle typing notification
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    window.dispatchEvent(
      new CustomEvent('sf_ws_send', {
        detail: {
          type: 'stranger_typing',
          isTyping: true,
        },
      })
    );

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('sf_ws_send', {
          detail: {
            type: 'stranger_typing',
            isTyping: false,
          },
        })
      );
    }, 1500);
  };

  // Image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        window.dispatchEvent(
          new CustomEvent('sf_ws_send', {
            detail: {
              type: 'stranger_msg',
              text: '📷 Photo',
              mediaUrl: reader.result,
              mediaType: 'image',
            },
          })
        );
      }
    };
    reader.readAsDataURL(file);
  };

  // Voice note recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            window.dispatchEvent(
              new CustomEvent('sf_ws_send', {
                detail: {
                  type: 'stranger_msg',
                  text: '🎤 Voice Note',
                  mediaUrl: reader.result,
                  mediaType: 'audio',
                },
              })
            );
          }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordTimerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone permission denied or not available:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  };

  const playVoiceNote = (msgId: string, url: string) => {
    if (playingAudioId === msgId) {
      audioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPlayingAudioId(null);
      audio.play().catch(() => {});
      setPlayingAudioId(msgId);
    }
  };

  const copyShareLink = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-112px)] max-w-2xl mx-auto w-full bg-slate-950/50 sm:border-x sm:border-slate-800">
      {/* Top Banner / Match Status Bar */}
      {matchingState === 'connected' && partner && (
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-3 shadow-md shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <img
                src={partner.avatar}
                alt={partner.displayName}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/50"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white truncate">
                  {partner.displayName}
                </span>
                <span className="text-xs text-slate-400">· {partner.city || 'Global'}</span>
              </div>
              <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                <span>{partner.gender}</span>
                {partner.interests && partner.interests.length > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-indigo-400 truncate">
                      {partner.interests.slice(0, 2).join(', ')}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Send Rose */}
            <button
              onClick={() => onSendRoseTo(partner.id, partner.displayName)}
              className="py-1.5 px-2.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-medium flex items-center gap-1 transition active:scale-95"
              title="Send a Rose to this stranger"
            >
              <span>🌹</span>
              <span className="hidden sm:inline">Send Rose</span>
            </button>

            {/* Add as direct friend */}
            <button
              onClick={() => onStartDirectChatWith(partner.id)}
              className="p-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium flex items-center gap-1 transition active:scale-95"
              title="Save as permanent friend to chat anytime"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Friend</span>
            </button>

            {/* Skip to Next Stranger */}
            <button
              onClick={handleSkipOrLeave}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition active:scale-95"
              title="Find another stranger"
            >
              <SkipForward className="w-3.5 h-3.5 text-amber-400" />
              <span>Next</span>
            </button>

            {/* Stop / Leave */}
            <button
              onClick={handleDisconnect}
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 transition"
              title="Leave chat"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* State: Idle / Start Match */}
        {matchingState === 'idle' && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-5 animate-in fade-in">
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-rose-500 via-pink-500 to-indigo-600 p-1 shadow-xl shadow-rose-500/30 flex items-center justify-center animate-pulse">
                <span className="text-4xl">💕</span>
              </div>
              <span className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-rose-500 text-[10px] font-bold text-white shadow">
                LOVE SPARK
              </span>
            </div>

            <div className="space-y-1.5 max-w-sm">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Spark a Romantic Connection 💕
              </h2>
              <p className="text-xs text-rose-200/80 leading-relaxed">
                Connect 1-on-1 instantly with real people looking for meaningful talks, chemistry, and friendship. Zero fake bots, pure real vibes.
              </p>
            </div>

            <button
              onClick={handleFindStranger}
              className="w-full max-w-xs py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              <span>🌹</span>
              <span>Find a Stranger Match Now</span>
            </button>

            {/* Real User Testing Helper: Single click test tab */}
            <div className="pt-4 border-t border-slate-800/80 max-w-sm w-full space-y-2">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-left">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Testing with a 2nd user?</span>
                  <button
                    onClick={onOpenTestTab}
                    className="text-indigo-400 hover:text-indigo-300 text-[11px] underline"
                  >
                    Open 2nd Account
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Open another browser tab or share your link so two real people can match instantly.
                </p>
                <button
                  onClick={copyShareLink}
                  className="mt-2 w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy App Link to Invite'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* State: Searching / Radar */}
        {matchingState === 'searching' && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6 animate-in fade-in">
            <div className="relative flex items-center justify-center">
              {/* Radar rings */}
              <div className="absolute w-44 h-44 rounded-full border border-indigo-500/20 animate-ping opacity-60" />
              <div className="absolute w-32 h-32 rounded-full border border-cyan-500/30 animate-pulse" />
              <div className="w-20 h-20 rounded-full bg-slate-900 border border-indigo-500/60 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Flame className="w-8 h-8 text-indigo-400 animate-bounce" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white tracking-tight">
                Searching for a real stranger...
              </h3>
              <p className="text-xs text-slate-400">
                Matching with someone who shares your vibe
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleDisconnect}
                className="py-2 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-400 transition"
              >
                Cancel
              </button>

              <button
                onClick={onOpenTestTab}
                className="py-2 px-4 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-semibold text-indigo-300 transition"
              >
                Simulate 2nd Person
              </button>
            </div>
          </div>
        )}

        {/* State: Disconnected Banner */}
        {matchingState === 'disconnected' && (
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-3 my-auto">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                {disconnectReason || 'Stranger has disconnected'}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Don't worry! There are plenty of active people ready to talk.
              </p>
            </div>
            <button
              onClick={handleFindStranger}
              className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition active:scale-95"
            >
              Find New Stranger
            </button>
          </div>
        )}

        {/* State: Connected Chat Messages */}
        {matchingState === 'connected' && (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isMe = msg.senderId === currentUser.id;
              const isSystem = msg.senderId === 'system';

              if (isSystem) {
                return (
                  <div key={msg.id} className="text-center my-2">
                    <span className="inline-block px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMe && partner && (
                    <img
                      src={partner.avatar}
                      alt={partner.displayName}
                      className="w-7 h-7 rounded-full object-cover shrink-0 mb-1"
                    />
                  )}
                  <div
                    className={`max-w-[78%] rounded-2xl p-3 text-sm shadow-sm ${
                      isMe
                        ? 'bg-indigo-600 text-white rounded-br-xs'
                        : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-xs'
                    }`}
                  >
                    {/* Media: Image */}
                    {msg.mediaType === 'image' && msg.mediaUrl && (
                      <div className="mb-1.5 rounded-lg overflow-hidden max-h-60 bg-black/30">
                        <img
                          src={msg.mediaUrl}
                          alt="Photo attachment"
                          className="w-full h-auto object-cover"
                        />
                      </div>
                    )}

                    {/* Media: Voice Note */}
                    {msg.mediaType === 'audio' && msg.mediaUrl && (
                      <div className="flex items-center gap-2 py-1">
                        <button
                          type="button"
                          onClick={() => playVoiceNote(msg.id, msg.mediaUrl!)}
                          className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
                        >
                          {playingAudioId === msg.id ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>
                        <div className="text-xs font-medium">Voice Message</div>
                      </div>
                    )}

                    {msg.text && <p className="break-words leading-relaxed">{msg.text}</p>}

                    <div
                      className={`text-[10px] mt-1 text-right tabular-nums ${
                        isMe ? 'text-indigo-200' : 'text-slate-500'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Partner Typing indicator */}
            {partnerTyping && (
              <div className="flex items-center gap-2 text-slate-400 text-xs pl-9">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
                <span className="text-[11px] text-slate-400">Stranger is typing...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input Bar (Only visible when connected) */}
      {matchingState === 'connected' && (
        <div className="p-3 bg-slate-900 border-t border-slate-800 shrink-0">
          {isRecording ? (
            <div className="flex items-center justify-between gap-3 px-3 py-2 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span>Recording voice note... ({recordingDuration}s)</span>
              </div>
              <button
                type="button"
                onClick={stopRecording}
                className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium flex items-center gap-1 transition"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
                title="Send Photo"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={startRecording}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
                title="Hold or tap to record voice note"
              >
                <Mic className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder="Type a message to stranger..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-hidden placeholder:text-slate-600 transition"
              />

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white flex items-center justify-center shadow transition shrink-0 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
