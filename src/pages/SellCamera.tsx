import React, { useState, useRef, useEffect } from 'react';
import { X, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';

export default function SellCamera() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [activeTab, setActiveTab] = useState('Camera');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    async function setupCamera() {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      try {
        const userStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode, aspectRatio: 9/16 },
          audio: true
        });
        setStream(userStream);
        if (videoRef.current) {
          videoRef.current.srcObject = userStream;
        }
      } catch (err: any) {
        console.error("Camera error:", err);
        setPermissionError("Erro ao acessar a camera. Por favor, verifique as permissões no navegador.");
      }
    }
    setupCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleStartRecording = () => {
    if (!stream) return;
    
    const options = { mimeType: 'video/webm;codecs=vp9,opus' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
    }

    const recorder = new MediaRecorder(stream, options);
    mediaRecorderRef.current = recorder;
    const localChunks: Blob[] = [];
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        localChunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(localChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      // Navigate immediately to editing as requested
      navigate('/sell-details', { state: { capturedVideoUrl: url } });
    };

    recorder.start();
    setIsRecording(true);
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      // Navigate immediately as requested
      navigate('/sell-details', { state: { capturedImages: [dataUrl] } });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  if (permissionError) {
    return (
      <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-white mb-6 font-medium">{permissionError}</p>
        <button onClick={() => navigate(-1)} className="bg-white text-black px-6 py-2 rounded-full font-bold uppercase tracking-wider">
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col overflow-hidden">
      {/* Hidden Inputs */}
      <input 
          ref={videoInputRef}
          type="file" 
          accept="video/*" 
          className="hidden" 
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file || !auth.currentUser) return;
            const url = URL.createObjectURL(file);
            navigate('/sell-details', { state: { capturedVideoUrl: url } });
          }}
      />
      <input 
          ref={imageInputRef}
          type="file" 
          accept="image/*" 
          multiple
          className="hidden" 
          onChange={async (e) => {
            const files = e.target.files;
            if (!files || files.length === 0 || !auth.currentUser) return;
            const urls = Array.from(files).map((file: File) => URL.createObjectURL(file));
            navigate('/sell-details', { state: { capturedImages: urls } });
          }}
      />

      {/* Camera Stream */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Visual Overlay like the gray bar at the top */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full z-20" />

      {/* Top Controls */}
      <div className="absolute top-4 left-0 w-full px-4 flex justify-between items-center z-10">
        <button onClick={() => navigate(-1)} className="p-2 bg-black/20 rounded-full text-white backdrop-blur-sm active:scale-95 transition-all">
          <X size={24} />
        </button>
        
        <div className="text-white font-bold text-[0.875rem]">15</div>
      </div>
      {/* Right Sidebar Controls */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-5 z-10">
          <button 
            onClick={toggleCamera}
            className="flex flex-col items-center justify-center w-10 h-10 bg-black/40 backdrop-blur-md rounded-full text-white active:scale-95 transition-all shadow-lg"
          >
            <RotateCcw size={22} strokeWidth={2} />
          </button>
        </div>
      
      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 w-full flex flex-col items-center pb-8 z-10">
        <div className="w-full px-12 flex items-center justify-between mb-8">
          {/* Gallery Preview / Adicionar */}
          <button 
            onClick={() => {
              if (activeTab === 'Anunciar short' || activeTab === 'Camera') {
                videoInputRef.current?.click();
              } else {
                imageInputRef.current?.click();
              }
            }}
            className="flex flex-col items-center gap-1 cursor-pointer active:scale-95 transition-all"
          >
            <div className="w-10 h-10 bg-zinc-800 rounded-[8px] overflow-hidden border border-white/20">
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon size={20} className="text-white/40" />
              </div>
            </div>
            <span className="text-[0.6875rem] text-white font-medium">Adicionar</span>
          </button>

          {/* Record / Capture Button */}
          <button 
            onClick={() => {
              if (activeTab === 'Foto') {
                takePhoto();
              } else {
                isRecording ? handleStopRecording() : handleStartRecording();
              }
            }}
            className={`relative w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all ${isRecording ? 'scale-110' : 'active:scale-95'}`}
          >
            <div className={`bg-blue-600 transition-all ${isRecording ? 'w-10 h-10 rounded-[6px]' : 'w-16 h-16 rounded-full'}`} />
          </button>

          <div className="w-10" />
        </div>

        {/* Bottom Tabs */}
        <div className="flex gap-4 items-center bg-black/60 p-2 rounded-full backdrop-blur-md mb-2 border border-white/5">
          {['Camera', 'Foto', 'Anunciar short', 'Anunciar'].map((tab) => (
            <button 
              key={tab}
              onClick={() => {
                if (tab === 'Anunciar short') {
                  videoInputRef.current?.click();
                  return;
                }
                if (tab === 'Anunciar') {
                  imageInputRef.current?.click();
                  return;
                }
                setActiveTab(tab);
              }}
              className={`transition-all uppercase px-4 py-1.5 rounded-full text-[0.75rem] font-black tracking-widest ${activeTab === tab ? 'bg-white text-black' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
