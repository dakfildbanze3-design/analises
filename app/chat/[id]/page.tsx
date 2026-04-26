'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Send, Loader2, Phone, MoreVertical, Mic, Paperclip, Video, Smile, Play, Pause, Image as ImageIcon, FileVideo, X, User, BellOff, Bell, UserX, Trash2, Pin, PinOff, Search as SearchIcon, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '@/src/lib/firebase';
import { chatService, Message, ChatRoom } from '@/src/services/chatService';
import { formatRelativeTime } from '@/src/lib/dateUtils';
import EmojiPicker from '@/src/components/EmojiPicker';
import CameraRecorder from '@/src/components/CameraRecorder';
import { verifyNativeAppLock } from '@/src/lib/nativeAuth';
import { Check, CheckCheck } from 'lucide-react';

function VideoPlayer({ videoUrl }: { videoUrl: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };
  return (
    <div className="relative rounded-[5px] overflow-hidden bg-black max-w-[240px] aspect-[9/16]">
      <video ref={videoRef} src={videoUrl} className="w-full h-full object-cover" playsInline onEnded={() => setIsPlaying(false)} onClick={togglePlay} />
      {!isPlaying && <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-black/20 text-white"><Play size={40} fill="currentColor" /></button>}
    </div>
  );
}

function AudioPlayer({ duration, isMe, audioUrl }: { duration: number, isMe: boolean, audioUrl?: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => { setIsPlaying(false); setProgress(0); };
      audio.ontimeupdate = () => {
        if (audioRef.current && audioRef.current.duration) {
          setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
        }
      };
    }
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { audioRef.current.play(); setIsPlaying(true); }
  };

  return (
    <div className="flex flex-col gap-1 w-44">
      <div className="flex items-center gap-2">
        <button onClick={togglePlay} className="text-white">{isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</button>
        <div className="flex-1 flex items-center gap-0.5 h-6">
          {[...Array(10)].map((_, i) => (
            <div key={i} className={`w-1 rounded-full transition-all ${progress > (i / 10) * 100 ? 'bg-white' : 'bg-white/20'}`} style={{ height: isPlaying ? `${(i * 23) % 80 + 20}%` : '30%' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChatDetailPage() {
  const params = useParams();
  const chatId = params.id as string;
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [presence, setPresence] = useState({ isOnline: false, lastSeen: null });

  useEffect(() => {
    if (!chatId) return;
    const unsubMsgs = chatService.subscribeToMessages(chatId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      chatService.markAsRead(chatId);
    });
    const unsubRoom = chatService.subscribeToChatRoom(chatId, (roomData) => {
      setRoom(roomData);
      if (roomData.otherUser?.id) {
         chatService.subscribeToRealtimePresence(roomData.otherUser.id, setPresence);
      }
    });
    return () => { unsubMsgs(); unsubRoom(); };
  }, [chatId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !chatId) return;
    const text = inputText;
    setInputText('');
    await chatService.sendMessage(chatId, text);
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col h-screen bg-background pt-12">
      <header className="fixed top-0 left-0 right-0 h-14 bg-surface px-4 flex items-center gap-3 z-50">
        <button onClick={() => router.back()}><ArrowLeft size={20} /></button>
        <img src={room?.otherUser?.avatarUrl} className="w-9 h-9 rounded-full object-cover" />
        <div className="flex flex-col">
          <span className="text-sm font-bold">{room?.otherUser?.displayName}</span>
          <span className="text-[0.6rem] text-primary">{presence.isOnline ? 'online' : 'offline'}</span>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4 pb-24">
        {messages.map((msg) => {
          const isMe = msg.sender_id === auth.currentUser?.uid;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-2 rounded-[10px] ${isMe ? 'bg-primary text-white' : 'bg-surface-container text-white'}`}>
                {msg.type === 'image' ? <img src={msg.image_url} className="rounded" /> : 
                 msg.type === 'video' ? <VideoPlayer videoUrl={msg.video_url || ''} /> :
                 msg.type === 'audio' ? <AudioPlayer duration={msg.duration || 0} isMe={isMe} audioUrl={msg.audio_url} /> :
                 <p className="text-sm">{msg.text}</p>}
                <div className="text-[0.5rem] mt-1 opacity-50 flex justify-end">
                   {formatRelativeTime(msg.created_at)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background z-50">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input value={inputText} onChange={(e) => setInputText(e.target.value)} className="flex-1 bg-surface-container rounded-full px-4 py-2 outline-none" placeholder="Mensagem..." />
          <button type="submit" className="w-10 h-10 bg-primary rounded-full flex items-center justify-center"><Send size={20} /></button>
        </form>
      </div>
    </div>
  );
}
