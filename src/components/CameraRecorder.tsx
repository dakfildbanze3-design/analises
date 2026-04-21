import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Check, Timer, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CameraRecorderProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

export default function CameraRecorder({ onCapture, onClose }: CameraRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [timer, setTimer] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startStream();
    return () => stopStream();
  }, []);

  const startStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: true 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      alert("Não foi possível aceder à câmara.");
      onClose();
    }
  };

  const stopStream = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const startRecording = () => {
    if (!videoRef.current?.srcObject) return;
    
    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(videoRef.current.srcObject as MediaStream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
      setRecordedBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      if (timerRef.current) clearInterval(timerRef.current);
    };

    mediaRecorder.start();
    setIsRecording(true);
    setTimer(0);
    timerRef.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleConfirm = () => {
    if (recordedBlob) {
      onCapture(recordedBlob);
    }
  };

  const handleReset = () => {
    setPreviewUrl(null);
    setRecordedBlob(null);
    setTimer(0);
    startStream();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
      <div className="relative w-full h-full max-w-md mx-auto flex flex-col">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
          <button onClick={onClose} className="text-white p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={28} />
          </button>
          {isRecording && (
            <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full animate-pulse">
              <div className="w-2 h-2 rounded-full bg-white" />
              <span className="text-white font-mono font-bold text-sm">{formatTime(timer)}</span>
            </div>
          )}
        </div>

        {/* Video Viewport */}
        <div className="flex-1 bg-zinc-900 flex items-center justify-center overflow-hidden">
          {previewUrl ? (
            <video 
              src={previewUrl} 
              autoPlay 
              loop 
              playsInline 
              className="w-full h-full object-cover"
            />
          ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline 
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Controls */}
        <div className="p-8 flex items-center justify-center gap-8 bg-gradient-to-t from-black/60 to-transparent">
          {previewUrl ? (
            <>
              <button 
                onClick={handleReset}
                className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700 transition-colors"
                title="Gravar novamente"
              >
                <RotateCcw size={28} />
              </button>
              <button 
                onClick={handleConfirm}
                className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white hover:bg-blue-500 shadow-xl transition-all active:scale-90"
                title="Enviar vídeo"
              >
                <Check size={40} />
              </button>
            </>
          ) : (
            <button 
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all active:scale-90 ${isRecording ? 'border-red-600' : 'border-white'}`}
            >
              <div className={`transition-all ${isRecording ? 'w-10 h-10 bg-red-600 rounded-[4px]' : 'w-16 h-16 bg-red-600 rounded-full scale-90 hover:scale-95'}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
