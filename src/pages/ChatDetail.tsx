import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, Loader2, Phone, MoreVertical, Mic, Paperclip, Video, Smile, Play, Pause, Image as ImageIcon, FileVideo, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';
import { chatService, Message, ChatRoom } from '../services/chatService';
import { formatRelativeTime } from '../lib/dateUtils';
import EmojiPicker from '../components/EmojiPicker';
import CameraRecorder from '../components/CameraRecorder';
import { Check, CheckCheck } from 'lucide-react';

// Common Video Player for chat
function VideoPlayer({ videoUrl }: { videoUrl: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="relative rounded-[5px] overflow-hidden bg-black max-w-[240px] aspect-[9/16]">
      <video 
        ref={videoRef}
        src={videoUrl} 
        className="w-full h-full object-cover"
        playsInline
        onEnded={() => setIsPlaying(false)}
        onClick={togglePlay}
      />
      {!isPlaying && (
        <button 
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 text-white"
        >
          <Play size={40} fill="currentColor" />
        </button>
      )}
    </div>
  );
}

const isOnlyEmojis = (str?: string): boolean => {
  if (!str) return false;
  const stripped = str.replace(/[\s\n]/g, '');
  if (stripped.length === 0) return false;
  try {
    const re = /^[\p{Extended_Pictographic}\u200d\uFE0F]+$/u;
    return re.test(stripped) && Array.from(stripped).length <= 3;
  } catch (e) {
    return false;
  }
};

function AudioPlayer({ duration, isMe, audioUrl }: { duration: number, isMe: boolean, audioUrl?: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (audioUrl) {
      const audio = new Audio();
      audio.src = audioUrl;
      audio.crossOrigin = "anonymous"; // Essential for AudioContext with external URLs
      audio.preload = "auto";
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        setProgress(0);
      };
      audio.ontimeupdate = () => {
        if (audioRef.current && audioRef.current.duration) {
          const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
          setProgress(p);
        }
      };
      
      // Error handling
      audio.onerror = (e) => {
        console.error("Audio error:", e);
      };
    }
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [audioUrl]);

  const togglePlay = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Initialize Audio Context on first play (user gesture)
      if (!audioCtxRef.current) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioContextClass();
          const source = ctx.createMediaElementSource(audioRef.current);
          const gainNode = ctx.createGain();
          
          // Correct gain to ensure clarity and volume without distortion
          gainNode.gain.value = 2.0; 
          
          source.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          audioCtxRef.current = ctx;
          gainNodeRef.current = gainNode;
        } catch (e) {
          console.warn("Audio Context failed, using standard playback:", e);
        }
      }

      if (audioCtxRef.current?.state === 'suspended') {
        await audioCtxRef.current.resume();
      }

      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error("Playback failed:", err);
      }
    }
  };

  return (
    <div className="flex flex-col gap-1 w-44 sm:w-52"> 
      <div className="flex items-center gap-2">
        <button 
          className="text-white hover:text-white/80 transition-colors shrink-0" 
          onClick={togglePlay}
          type="button"
        >
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </button>
        
        {/* Simple Waveform Animation */}
        <div className="flex-1 flex items-center gap-0.5 h-6">
          {[...Array(15)].map((_, i) => (
            <div 
              key={i} 
              className={`w-1 rounded-full bg-white/20 transition-all ${isPlaying ? 'animate-pulse' : ''}`}
              style={{ 
                height: isPlaying ? `${Math.random() * 80 + 20}%` : '30%',
                opacity: progress > (i / 15) * 100 ? 1 : 0.4,
                backgroundColor: progress > (i / 15) * 100 ? '#fff' : 'rgba(255,255,255,0.2)'
              }}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-between items-center text-[0.6rem] text-white/70 ml-7">
        <span>{formatTime(Math.round(audioRef.current?.currentTime || 0))}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}

// Global helper for formatting time inside ChatDetail scope or outside
const formatTime = (time: number) => {
  const min = Math.floor(time / 60);
  const sec = Math.floor(time % 60);
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};

export default function ChatDetail() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isDraggingToCancel, setIsDraggingToCancel] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const startPosRef = useRef<{ x: number, y: number } | null>(null);
  const recordingCtxRef = useRef<AudioContext | null>(null);

  // Recording timer logic
  useEffect(() => {
    if (isRecording) {
      setRecordTime(0);
      recordIntervalRef.current = setInterval(() => {
        setRecordTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    }
    return () => { if (recordIntervalRef.current) clearInterval(recordIntervalRef.current); };
  }, [isRecording]);

  const startRecording = async (e: React.PointerEvent) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        }
      });
      
      // Setup Web Audio API Processing Chain
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass({ sampleRate: 48000 });
      recordingCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);

      // Light Compressor to prevent clipping and keep volume consistent
      const compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.value = -12; // Only acts on very loud peaks
      compressor.knee.value = 40;
      compressor.ratio.value = 2;   // Very gentle
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      // Make up gain (Safe amplification to make it loud after native AGC)
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 2.5; // Moderate boost

      const destination = audioCtx.createMediaStreamDestination();

      // Simple chain: Source -> Compressor -> Gain -> Destination
      source.connect(compressor);
      compressor.connect(gainNode);
      gainNode.connect(destination);

      // Record from the processed destination stream with higher quality bits
      const mediaRecorder = new MediaRecorder(destination.stream, {
        audioBitsPerSecond: 128000 // High quality bitrate
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      startPosRef.current = { x: e.clientX, y: e.clientY };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const wasCancelled = isDraggingToCancel;
        setIsDraggingToCancel(false);
        setIsRecording(false);

        // Cleanup resources
        stream.getTracks().forEach(track => track.stop());
        destination.stream.getTracks().forEach(track => track.stop());
        if (recordingCtxRef.current) {
          recordingCtxRef.current.close().catch(() => {});
          recordingCtxRef.current = null;
        }

        if (wasCancelled) {
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (chatId && recordTime > 0) {
          try {
            await chatService.sendMessage(chatId, "", "audio", recordTime, audioBlob);
          } catch (err) {
            console.error("Failed to send audio:", err);
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsDraggingToCancel(false);
    } catch (error: any) {
      console.error("Error accessing microphone:", error);
      alert("Acesso ao microfone negado ou indisponível.");
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isRecording || !startPosRef.current) return;
    
    const diffX = startPosRef.current.x - e.clientX;
    if (diffX > 80) {
      setIsDraggingToCancel(true);
    } else {
      setIsDraggingToCancel(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    if (!chatId || !auth.currentUser) return;

    setLoading(true);
    
    // Subscribe to messages
    const unsubMessages = chatService.subscribeToMessages(chatId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      
      // Mark as read when messages arrive
      chatService.markAsRead(chatId).catch(console.error);
    });

    // Subscribe to room info
    const unsubRoom = chatService.subscribeToChatRoom(chatId, (roomData) => {
      setRoom(roomData);
    });

    return () => {
      unsubMessages();
      unsubRoom();
    };
  }, [chatId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !chatId) return;

    const text = inputText.trim();
    setInputText('');
    setShowEmojiPicker(false);
    
    try {
      await chatService.sendMessage(chatId, text);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  const handleStartCall = (type: 'video' | 'audio') => {
    if (!room?.otherUser || !chatId) return;
    
    // Check if global function exists (from VideoCallOverlay)
    if ((window as any).startVideoCall) {
      (window as any).startVideoCall(
        room.otherUser.id, 
        room.otherUser.displayName || 'Utilizador', 
        room.otherUser.avatarUrl || '',
        chatId
      );
    }
  };

  const handleMediaUpload = async (file: File, type: 'image' | 'video') => {
    if (!chatId) return;
    setIsUploading(true);
    setShowMediaMenu(false);
    try {
      await chatService.sendMessage(chatId, "", type, 0, file);
    } catch (err) {
      console.error("Failed to upload media:", err);
      alert("Erro ao enviar ficheiro.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCameraCapture = async (blob: Blob) => {
    if (!chatId) return;
    setIsUploading(true);
    setShowCamera(false);
    try {
      await chatService.sendMessage(chatId, "", "video", 0, blob);
    } catch (err) {
      console.error("Failed to send recorded video:", err);
      alert("Erro ao enviar vídeo.");
    } finally {
      setIsUploading(false);
    }
  };

  if (loading && !messages.length) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black/90">
      {/* Header */}
      <header className="bg-black/80 backdrop-blur-md px-4 py-3 flex items-center justify-between sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-white hover:bg-white/10 rounded-full transition-colors active:scale-95">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => room?.otherUser && navigate(`/user/${room.otherUser.id}`)}>
            <img 
              src={room?.otherUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chatId}`}
              className="w-9 h-9 rounded-full object-cover border border-white/20"
              alt="Avatar"
              referrerPolicy="no-referrer"
            />
            <div className="flex flex-col">
              <span className="text-[0.875rem] font-bold text-white leading-none mb-0.5">{room?.otherUser?.displayName || 'Carregando...'}</span>
              <span className="text-[0.625rem] text-zinc-400 font-bold uppercase tracking-widest leading-none">Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => handleStartCall('video')}
            className="p-2 text-white hover:bg-white/10 rounded-full active:scale-95 transition-all text-blue-400"
          >
            <Video size={20} />
          </button>
          <button 
            onClick={() => handleStartCall('audio')}
            className="p-2 text-white hover:bg-white/10 rounded-full active:scale-95 transition-all"
          >
            <Phone size={20} />
          </button>
          <button className="p-2 text-white hover:bg-white/10 rounded-full active:scale-95 transition-all">
            <MoreVertical size={20} />
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        onClick={() => {
          setShowEmojiPicker(false);
          setShowMediaMenu(false);
        }}
        className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4 scroll-smooth hide-scrollbar bg-black/40 pb-24"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-40 text-white">
            <p className="text-[0.875rem] font-medium">Inicia uma conversa segura.</p>
            <p className="text-[0.75rem]">As tuas mensagens são privadas.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === auth.currentUser?.uid;
            const pureEmoji = isOnlyEmojis(msg.text);

            if (msg.type === 'call_log') {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="bg-white/5 border border-white/5 px-4 py-1 rounded-full">
                    <span className="text-[0.65rem] text-white/40 font-medium uppercase tracking-wider">{msg.text}</span>
                  </div>
                </div>
              );
            }

            return (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                key={msg.id}
                className={`flex gap-3 items-start ${isMe ? 'flex-row-reverse px-2' : 'flex-row px-2'}`}
              >
                {/* Avatar */}
                <img 
                  src={msg.sender_avatar || (isMe ? (auth.currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.sender_id}`) : (room?.otherUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.sender_id}`))}
                  className={`w-9 h-9 rounded-full object-cover border border-white/10 shrink-0 ${pureEmoji ? 'mt-4' : 'mt-0.5'}`}
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                />

                <div className="flex flex-col gap-1 max-w-[75%] min-w-0">
                  {/* Sender Name */}
                  <span className={`text-[0.6rem] font-bold uppercase tracking-wider ${isMe ? 'text-right text-white/40' : 'text-left text-blue-400'}`}>
                    {msg.sender_name || (isMe ? 'Eu' : room?.otherUser?.displayName || 'Usuário')}
                  </span>

                  <div className={pureEmoji 
                    ? "relative w-fit" 
                    : `w-fit px-3 py-1.5 rounded-[5px] shadow-sm relative ${isMe ? 'bg-blue-900 text-white rounded-tr-none ml-auto' : 'bg-zinc-800 text-white rounded-tl-none'}`
                  }>
                    {msg.type === 'audio' ? (
                      <div className="py-0.5">
                        <AudioPlayer 
                          duration={msg.duration || 3} 
                          isMe={isMe} 
                          audioUrl={msg.audio_url}
                        />
                        <div className="flex justify-end items-center text-[0.5rem] text-white/50 mt-0.5">
                          <span>{formatRelativeTime(msg.created_at || msg.createdAt)}</span>
                        </div>
                      </div>
                    ) : msg.type === 'image' ? (
                      <div className="py-1">
                        <img 
                          src={msg.image_url} 
                          className="max-w-[200px] rounded-[5px] object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                          referrerPolicy="no-referrer"
                          onClick={() => window.open(msg.image_url, '_blank')}
                        />
                        <div className={`text-[0.55rem] mt-1 flex items-center gap-1 ${isMe ? 'text-white/50 justify-end' : 'text-white/50'}`}>
                          <span>{formatRelativeTime(msg.created_at || msg.createdAt)}</span>
                          {isMe && (
                            <span className={`${msg.status === 'seen' ? 'text-blue-400' : 'text-white/30'}`}>
                              {msg.status === 'seen' ? <CheckCheck size={12} /> : <Check size={12} />}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : msg.type === 'video' ? (
                      <div className="py-1">
                        <VideoPlayer videoUrl={msg.video_url || ''} />
                        <div className={`text-[0.55rem] mt-1 flex items-center gap-1 ${isMe ? 'text-white/50 justify-end' : 'text-white/50'}`}>
                          <span>{formatRelativeTime(msg.created_at || msg.createdAt)}</span>
                          {isMe && (
                            <span className={`${msg.status === 'seen' ? 'text-blue-400' : 'text-white/30'}`}>
                              {msg.status === 'seen' ? <CheckCheck size={12} /> : <Check size={12} />}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col min-w-[40px]">
                        <p className={pureEmoji ? "text-[3.5rem] leading-none" : "text-[0.875rem] leading-snug break-words"}>{msg.text}</p>
                        <div className={pureEmoji 
                          ? `text-[0.55rem] mt-1 flex items-center gap-1 ${isMe ? 'absolute -bottom-3 right-0 text-white/70 drop-shadow-md' : 'absolute -bottom-3 left-0 text-white/70 drop-shadow-md'}` 
                          : `text-[0.55rem] mt-0.5 flex items-center gap-1 ${isMe ? 'text-white/50 justify-end' : 'text-white/50'}`
                        }>
                          {formatRelativeTime(msg.created_at || msg.createdAt)}
                          {isMe && (
                            <span className={`${msg.status === 'seen' ? 'text-blue-400' : 'text-white/30'}`}>
                              {msg.status === 'seen' ? <CheckCheck size={12} /> : <Check size={12} />}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </motion.div>
          );
        })
      )}
    </div>      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-black px-4 pb-4 pt-3 z-50">
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-[calc(100%+8px)] left-4 right-4 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[60]"
            >
              <EmojiPicker onSelect={(emoji) => setInputText((prev) => prev + emoji)} />
            </motion.div>
          )}

          {showMediaMenu && (
             <motion.div
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="absolute bottom-[calc(100%+8px)] left-4 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-4 flex flex-col gap-4 z-[60]"
             >
               <button 
                 onClick={() => {
                   const input = document.createElement('input');
                   input.type = 'file';
                   input.accept = 'image/*';
                   input.onchange = (e: any) => {
                     const file = e.target.files[0];
                     if (file) handleMediaUpload(file, 'image');
                   };
                   input.click();
                 }}
                 className="flex items-center gap-3 text-white hover:text-blue-400 transition-colors"
               >
                 <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                   <ImageIcon size={20} className="text-white" />
                 </div>
                 <span className="text-sm font-medium">Imagens</span>
               </button>
               <button 
                 onClick={() => {
                   const input = document.createElement('input');
                   input.type = 'file';
                   input.accept = 'video/*';
                   input.onchange = (e: any) => {
                     const file = e.target.files[0];
                     if (file) handleMediaUpload(file, 'video');
                   };
                   input.click();
                 }}
                 className="flex items-center gap-3 text-white hover:text-purple-400 transition-colors"
               >
                 <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                   <FileVideo size={20} className="text-white" />
                 </div>
                 <span className="text-sm font-medium">Vídeos</span>
               </button>
             </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSend} className="flex items-center gap-2">
            
          {!isRecording && (
            <>
              <button 
                type="button" 
                onClick={() => {
                  setShowMediaMenu(!showMediaMenu);
                  setShowEmojiPicker(false);
                }}
                className={`text-white transition-colors p-3 ${showMediaMenu ? 'text-blue-400' : 'hover:text-primary'}`}
              >
                  <Paperclip size={24} strokeWidth={2} />
              </button>
              <button 
                type="button" 
                onClick={() => setShowCamera(true)}
                className="text-white hover:text-primary transition-colors p-3"
              >
                  <Video size={24} strokeWidth={2} />
              </button>
            </>
          )}
            
          <div className="flex-1 flex items-center bg-zinc-800 rounded-full px-5 py-3 relative overflow-hidden">
            {isUploading ? (
              <div className="flex-1 flex items-center justify-center gap-2 text-white/60">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm font-medium">Enviando ficheiro...</span>
              </div>
            ) : isRecording ? (
              <div className="flex-1 flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-500 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="font-mono text-[1rem]">{formatTime(recordTime)}</span>
                </div>
                <div className={`text-white/60 text-[0.875rem] transition-all flex items-center gap-2 ${isDraggingToCancel ? 'translate-x-[-100%] opacity-0' : ''}`}>
                  <span>&larr;</span>
                  <span>Solte para enviar ou arraste para cancelar</span>
                </div>
                {isDraggingToCancel && (
                  <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center text-red-500 font-bold animate-pulse">
                    Solte para cancelar
                  </div>
                )}
              </div>
            ) : (
              <>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowEmojiPicker(!showEmojiPicker);
                    setShowMediaMenu(false);
                  }}
                  className={`${showEmojiPicker ? 'text-blue-400' : 'text-white/60 hover:text-white'} transition-colors mr-3`}
                >
                    <Smile size={24} />
                </button>
                <input 
                  type="text"
                  value={inputText}
                  onFocus={() => {
                    setShowEmojiPicker(false);
                    setShowMediaMenu(false);
                  }}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Escreve..."
                  className="w-full bg-transparent border-none outline-none text-[1rem] text-white placeholder:text-white/40"
                />
              </>
            )}
          </div>

          {!inputText.trim() || isRecording ? (
            <button 
              type="button" 
              className={`w-12 h-12 ${isRecording ? 'bg-red-600 scale-125 z-50' : 'bg-blue-900'} text-white rounded-full flex items-center justify-center transition-all shadow-md touch-none`}
              onPointerDown={startRecording}
              onPointerUp={stopRecording}
              onPointerMove={handlePointerMove}
              onPointerLeave={() => {
                if (isRecording) {
                  stopRecording();
                }
              }}
            >
              <Mic size={24} strokeWidth={2} />
            </button>
          ) : (
            <button 
              type="submit"
              className="w-12 h-12 bg-blue-900 text-white rounded-full flex items-center justify-center active:scale-90 transition-transform shadow-md"
            >
              <Send size={20} className="translate-x-0.5" />
            </button>
          )}
        </form>
      </div>

      <AnimatePresence>
        {showCamera && (
          <CameraRecorder 
            onCapture={handleCameraCapture}
            onClose={() => setShowCamera(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
