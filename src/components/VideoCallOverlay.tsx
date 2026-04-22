import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Camera, X } from 'lucide-react';
import { auth } from '../lib/firebase';
import { callService, CallData, CallStatus } from '../services/callService';
import { chatService } from '../services/chatService';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function VideoCallOverlay() {
  const [activeCall, setActiveCall] = useState<CallData | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for incoming calls
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const unsub = callService.subscribeToIncomingCalls(userId, (call) => {
      if (!activeCall) {
        setActiveCall(call);
        // Play ringtone if needed
      }
    });

    return () => unsub();
  }, [activeCall]);

  // Handle call status changes
  useEffect(() => {
    if (!activeCall) return;

    const unsub = callService.subscribeToCall(activeCall.id, (updatedCall) => {
      setActiveCall(updatedCall);
      
      if (updatedCall.status === 'ended' || updatedCall.status === 'rejected') {
        cleanup();
      }

      if (updatedCall.status === 'accepted' && updatedCall.caller_id === auth.currentUser?.uid) {
        // As caller, wait for answer
        if (updatedCall.answer && pcRef.current?.signalingState !== 'stable') {
          const remoteDesc = new RTCSessionDescription(updatedCall.answer);
          pcRef.current?.setRemoteDescription(remoteDesc);
        }
      }
    });

    return () => unsub();
  }, [activeCall?.id]);

  // Timer for call duration
  useEffect(() => {
    if (activeCall?.status === 'accepted') {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeCall?.status]);

  // Handle missed call timeout (1 minute)
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (activeCall?.status === 'calling') {
      timeout = setTimeout(() => {
        handleMissedCall();
      }, 60000); // 1 minute
    }
    return () => { if (timeout) clearTimeout(timeout); };
  }, [activeCall?.status]);

  const handleMissedCall = async () => {
    if (!activeCall) return;
    
    // Notify chat about missed call
    if (currentChatId) {
      const isCaller = activeCall.caller_id === auth.currentUser?.uid;
      const message = isCaller 
        ? "📞 Chamada não atendida" 
        : `📞 Chamada perdida de ${activeCall.caller_name}`;
      
      await chatService.sendMessage(currentChatId, message, 'call_log');
    }

    await callService.updateCallStatus(activeCall.id, 'ended');
    cleanup();
  };

  const cleanup = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);
    setCallDuration(0);
  };

  const setupMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: isFrontCamera ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      console.error("Error accessing media devices:", err);
      return null;
    }
  };

  const createPeerConnection = (callId: string, isCaller: boolean) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        callService.addIceCandidate(callId, event.candidate, isCaller ? 'caller' : 'receiver');
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };

    // Sub to candidates from the other side
    const targetType = isCaller ? 'receiver' : 'caller';
    callService.subscribeToIceCandidates(callId, targetType, (candidate) => {
      pc.addIceCandidate(candidate);
    });

    return pc;
  };

  const startCall = async (receiverId: string, receiverName: string, receiverAvatar: string, chatId?: string) => {
    const stream = await setupMedia();
    if (!stream) return;

    if (chatId) setCurrentChatId(chatId);

    const callId = await callService.createCall(receiverId, receiverName, receiverAvatar);
    const pc = createPeerConnection(callId, true);

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await callService.setOffer(callId, offer);

    setActiveCall({ 
      id: callId, 
      caller_id: auth.currentUser!.uid, 
      receiver_id: receiverId, 
      status: 'calling', 
      type: 'video', 
      created_at: null,
      receiver_name: receiverName,
      receiver_avatar: receiverAvatar
    });
  };

  const acceptCall = async () => {
    if (!activeCall) return;
    
    const stream = await setupMedia();
    if (!stream) return;

    const pc = createPeerConnection(activeCall.id, false);
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    if (activeCall.offer) {
      await pc.setRemoteDescription(new RTCSessionDescription(activeCall.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await callService.setAnswer(activeCall.id, answer);
      await callService.updateCallStatus(activeCall.id, 'accepted');
    }
  };

  const rejectCall = async () => {
    if (!activeCall) return;
    
    // Log in chat before ending
    if (currentChatId) {
      await chatService.sendMessage(currentChatId, "📞 Chamada recusada", 'call_log');
    }

    await callService.updateCallStatus(activeCall.id, 'rejected');
    cleanup();
  };

  const endCall = async () => {
    if (!activeCall) return;
    
    // If ended before accepted, it's a cancellation
    if (activeCall.status === 'calling' && currentChatId) {
      const isCaller = activeCall.caller_id === auth.currentUser?.uid;
      await chatService.sendMessage(currentChatId, isCaller ? "📞 Chamada cancelada" : "📞 Chamada perdida", 'call_log');
    }

    await callService.updateCallStatus(activeCall.id, 'ended');
    cleanup();
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);
    }
  };

  const toggleCam = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsCamOn(videoTrack.enabled);
    }
  };

  const switchCamera = async () => {
    const newMode = !isFrontCamera;
    setIsFrontCamera(newMode);
    
    if (localStream) {
      // Re-setup media with new facingMode
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newMode ? 'user' : 'environment' },
        audio: true
      });
      
      const oldVideoTrack = localStream.getVideoTracks()[0];
      const newVideoTrack = stream.getVideoTracks()[0];
      
      if (pcRef.current) {
        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(newVideoTrack);
      }
      
      oldVideoTrack.stop();
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Expose startCall to window for ChatDetail to trigger
  useEffect(() => {
    (window as any).startVideoCall = startCall;
    return () => { delete (window as any).startVideoCall; };
  }, []);

  if (!activeCall) return null;

  const isCaller = activeCall.caller_id === auth.currentUser?.uid;
  const isIncoming = !isCaller && activeCall.status === 'calling';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
        
        {/* Incoming Call Notification */}
        {isIncoming && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="absolute top-0 w-[90%] max-w-md bg-zinc-900/90 backdrop-blur-xl rounded-2xl p-4 flex items-center justify-between shadow-2xl pointer-events-auto"
          >
            <div className="flex items-center gap-3">
              <img 
                src={activeCall.caller_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeCall.caller_id}`} 
                className="w-12 h-12 rounded-full font-bold"
                alt="Caller"
              />
              <div className="flex flex-col">
                <span className="text-white font-bold">{activeCall.caller_name || 'Alguém'}</span>
                <span className="text-white/60 text-xs animate-pulse">Chamada de vídeo...</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={rejectCall} className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform">
                <PhoneOff size={20} />
              </button>
              <button onClick={acceptCall} className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform">
                <Phone size={20} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Active Call UI */}
        {(activeCall.status === 'accepted' || (!isIncoming && activeCall.status !== 'rejected')) && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-black flex flex-col pointer-events-auto"
          >
            {/* Remote Video (Full Screen) */}
            <div className="relative flex-1 bg-zinc-900 overflow-hidden">
              {remoteStream ? (
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                  <img 
                    src={isCaller ? activeCall.receiver_avatar : activeCall.caller_avatar} 
                    className="w-32 h-32 rounded-full animate-pulse"
                    alt="Remote"
                  />
                  <span className="text-white font-bold text-xl">{isCaller ? activeCall.receiver_name : activeCall.caller_name}</span>
                  <span className="text-white/60 animate-pulse">
                    {activeCall.status === 'accepted' ? 'Conectando...' : 'Chamando...'}
                  </span>
                </div>
              )}

              {/* Local Video (Floating Box) */}
              <div className={`absolute top-6 right-6 w-32 h-48 bg-zinc-800 rounded-2xl overflow-hidden shadow-xl transition-all ${!isCamOn ? 'opacity-50' : ''}`}>
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {!isCamOn && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80">
                    <VideoOff size={24} className="text-white/40" />
                  </div>
                )}
              </div>

              {/* Top Details (Duration) */}
              {activeCall.status === 'accepted' && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-4 py-1 rounded-full">
                  <span className="text-white font-mono text-sm">{formatDuration(callDuration)}</span>
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="bg-gradient-to-t from-black/80 to-transparent p-10 flex items-center justify-center gap-6">
              <button 
                onClick={toggleMic}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMicOn ? 'bg-white/10 text-white' : 'bg-red-500 text-white shadow-lg shadow-red-500/20'}`}
              >
                {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
              </button>
              
              <button 
                onClick={endCall}
                className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-red-500/40 active:scale-90 transition-transform"
              >
                <PhoneOff size={32} />
              </button>

              <button 
                onClick={toggleCam}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isCamOn ? 'bg-white/10 text-white' : 'bg-red-500 text-white shadow-lg shadow-red-500/20'}`}
              >
                {isCamOn ? <Video size={24} /> : <VideoOff size={24} />}
              </button>

              <button 
                onClick={switchCamera}
                className="w-14 h-14 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all"
              >
                <Camera size={24} />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
}
