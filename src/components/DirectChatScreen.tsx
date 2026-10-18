import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  Mic,
  Square,
  Play,
  Pause,
  Check,
  CheckCheck,
  Smile,
  Shield,
  PhoneCall
} from 'lucide-react';
import { User, Message } from '../types';
import { soundManager } from '../utils/sound';

interface DirectChatScreenProps {
  conversationId: string;
  partner: User;
  currentUser: User;
  onBack: () => void;
}

export const DirectChatScreen: React.FC<DirectChatScreenProps> = ({
  conversationId,
  partner,
  currentUser,
  onBack,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [partnerOnline, setPartnerOnline] = useState(partner.isOnline);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [loading, setLoading] = useState(true);

  // Audio recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  // Audio player
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  // Load message history
  const loadMessages = async () => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages?userId=${currentUser.id}`);
      const data = await res.json();
      setMessages(data.messages || []);
      if (data.participant) {
        setPartnerOnline(data.participant.isOnline);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  // Listen for real-time WS events
  useEffect(() => {
    const handleWs = (e: CustomEvent) => {
      const data = e.detail;

      if (data.type === 'direct_message' && data.conversationId === conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });

        if (data.message.senderId !== currentUser.id) {
          soundManager.playReceived();
        } else {
          soundManager.playSent();
        }
      }

      if (data.type === 'typing' && data.conversationId === conversationId) {
        setPartnerTyping(!!data.isTyping);
      }

      if (data.type === 'presence' && data.userId === partner.id) {
        setPartnerOnline(!!data.isOnline);
      }
    };

    window.addEventListener('sf_ws_message' as any, handleWs as any);
    return () => {
      window.removeEventListener('sf_ws_message' as any, handleWs as any);
    };
  }, [conversationId, currentUser.id, partner.id]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText.trim();
    setInputText('');

    // Emit stop typing
    window.dispatchEvent(
      new CustomEvent('sf_ws_send', {
        detail: {
          type: 'typing',
          recipientId: partner.id,
          conversationId,
          isTyping: false,
        },
      })
    );

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          text,
        }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        soundManager.playSent();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    window.dispatchEvent(
      new CustomEvent('sf_ws_send', {
        detail: {
          type: 'typing',
          recipientId: partner.id,
          conversationId,
          isTyping: true,
        },
      })
    );

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('sf_ws_send', {
          detail: {
            type: 'typing',
            recipientId: partner.id,
            conversationId,
            isTyping: false,
          },
        })
      );
    }, 1500);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        try {
          const res = await fetch(`/api/conversations/${conversationId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              senderId: currentUser.id,
              text: '📷 Photo',
              mediaUrl: reader.result,
              mediaType: 'image',
            }),
          });
          const data = await res.json();
          if (data.message) {
            setMessages((prev) => [...prev, data.message]);
            soundManager.playSent();
          }
        } catch (err) {
          console.error('Failed to send photo:', err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async () => {
          if (typeof reader.result === 'string') {
            try {
              const res = await fetch(`/api/conversations/${conversationId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  senderId: currentUser.id,
                  text: '🎤 Voice Note',
                  mediaUrl: reader.result,
                  mediaType: 'audio',
                  audioDuration: recordingDuration,
                }),
              });
              const data = await res.json();
              if (data.message) {
                setMessages((prev) => [...prev, data.message]);
                soundManager.playSent();
              }
            } catch (err) {
              console.error('Failed to send audio note:', err);
            }
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
      console.warn('Microphone permission denied:', err);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  };

  const playVoice = (msgId: string, url: string) => {
    if (playingAudioId === msgId) {
      audioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      const a = new Audio(url);
      audioRef.current = a;
      a.onended = () => setPlayingAudioId(null);
      a.play().catch(() => {});
      setPlayingAudioId(msgId);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-112px)] max-w-2xl mx-auto w-full bg-slate-950 sm:border-x sm:border-slate-800">
      {/* Top Header */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition active:scale-95"
            title="Back to inbox"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative shrink-0">
            <img
              src={partner.avatar}
              alt={partner.displayName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/40"
            />
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                partnerOnline ? 'bg-emerald-400' : 'bg-slate-600'
              }`}
            />
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate leading-tight">
              {partner.displayName}
            </h3>
            <div className="text-[11px] text-slate-400 truncate">
              {partnerTyping ? (
                <span className="text-indigo-400 font-medium animate-pulse">typing...</span>
              ) : partnerOnline ? (
                <span className="text-emerald-400 font-medium">Online</span>
              ) : (
                <span>@{partner.username} · {partner.city}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-xs text-slate-400">
          <span className="hidden sm:inline bg-slate-800 px-2 py-0.5 rounded text-[10px]">
            {partner.gender}
          </span>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {loading ? (
          <div className="py-12 flex justify-center">
            <span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <p className="text-xs">No messages yet. Send a friendly greeting to break the ice!</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderId === currentUser.id;

            return (
              <div
                key={m.id}
                className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {!isMe && (
                  <img
                    src={partner.avatar}
                    alt={partner.displayName}
                    className="w-7 h-7 rounded-full object-cover shrink-0 mb-1"
                  />
                )}
                <div
                  className={`max-w-[75%] rounded-2xl p-3 text-sm shadow-sm ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-xs'
                  }`}
                >
                  {/* Photo */}
                  {m.mediaType === 'image' && m.mediaUrl && (
                    <div className="mb-1.5 rounded-lg overflow-hidden max-h-60 bg-black/40">
                      <img
                        src={m.mediaUrl}
                        alt="Photo attachment"
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  )}

                  {/* Voice note */}
                  {m.mediaType === 'audio' && m.mediaUrl && (
                    <div className="flex items-center gap-2 py-1">
                      <button
                        type="button"
                        onClick={() => playVoice(m.id, m.mediaUrl!)}
                        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
                      >
                        {playingAudioId === m.id ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </button>
                      <div className="text-xs font-medium">Voice note</div>
                    </div>
                  )}

                  {m.text && <p className="break-words leading-relaxed">{m.text}</p>}

                  <div
                    className={`text-[10px] mt-1 flex items-center justify-end gap-1 tabular-nums ${
                      isMe ? 'text-indigo-200' : 'text-slate-500'
                    }`}
                  >
                    <span>
                      {new Date(m.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {isMe && (
                      <CheckCheck className={`w-3.5 h-3.5 ${m.read ? 'text-cyan-300' : 'text-indigo-300'}`} />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {partnerTyping && (
          <div className="flex items-center gap-2 text-slate-400 text-xs pl-9">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
            <span className="text-[11px] text-slate-400">{partner.displayName} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 shrink-0">
        {isRecording ? (
          <div className="flex items-center justify-between gap-3 px-3 py-2 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span>Recording audio... ({recordingDuration}s)</span>
            </div>
            <button
              type="button"
              onClick={stopVoiceRecording}
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
              onClick={startVoiceRecording}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
              title="Record Voice Note"
            >
              <Mic className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setInputText('🌹 Sending you a special Rose & loving vibe! 💕');
              }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition shrink-0"
              title="Quick Rose Note"
            >
              <span className="text-sm">🌹</span>
            </button>

            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder="Write a message..."
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
    </div>
  );
};
