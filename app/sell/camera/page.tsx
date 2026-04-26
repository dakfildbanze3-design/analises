'use client';

import React, { useState, useRef, useEffect } from 'react';
import { RotateCcw, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { auth } from '@/src/lib/firebase';
import MediaEditor from '@/src/components/MediaEditor';

export default function SellCamera() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [activeTab, setActiveTab] = useState('Vídeo');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [editingMedia, setEditingMedia] = useState<{type: 'video' | 'image', url: string, allUrls?: string[]} | null>(null);

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
        if (videoRef.current) videoRef.current.srcObject = userStream;
      } catch (err) {
        console.error(err);
      }
    }
    setupCamera();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, [facingMode]);

  const handleStartRecording = () => {
    if (!stream) return;
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const url = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
      setEditingMedia({ type: 'video', url });
    };
    recorder.start();
    setIsRecording(true);
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    setEditingMedia({ type: 'image', url: canvas.toDataURL('image/jpeg') });
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  if (editingMedia) {
    return (
      <MediaEditor
        media={editingMedia}
        onCancel={() => setEditingMedia(null)}
        onComplete={(urls) => {
          localStorage.setItem('sell_media', JSON.stringify({ type: editingMedia.type, urls }));
          router.push('/sell/details');
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden">
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) setEditingMedia({ type: 'video', url: URL.createObjectURL(file) });
      }} />
      <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
        if (!e.target.files) return;
        const urls = Array.from(e.target.files).map(f => URL.createObjectURL(f));
        setEditingMedia({ type: 'image', url: urls[0], allUrls: urls });
      }} />

      <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" />

      <div className="absolute top-4 left-4 z-10"><button onClick={() => router.back()}><ArrowLeft size={24} /></button></div>

      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-5 z-10">
        <button onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')} className="w-10 h-10 bg-black/40 rounded-full flex items-center justify-center"><RotateCcw /></button>
      </div>
      
      <div className="absolute bottom-0 left-0 w-full flex flex-col items-center pb-8 z-10">
        <div className="w-full px-12 flex items-center justify-between mb-8">
          <button onClick={() => activeTab === 'Vídeo' ? videoInputRef.current?.click() : imageInputRef.current?.click()} className="flex flex-col items-center"><div className="w-10 h-10 bg-zinc-800 rounded-[8px] flex items-center justify-center"><ImageIcon size={20} /></div><span className="text-[0.6rem] mt-1 font-bold">GALERIA</span></button>
          <button onClick={() => activeTab === 'Foto' ? takePhoto() : (isRecording ? handleStopRecording() : handleStartRecording())} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center"><div className={`bg-primary transition-all ${isRecording ? 'w-10 h-10 rounded-[6px]' : 'w-16 h-16 rounded-full'}`} /></button>
          <div className="w-10" />
        </div>
        <div className="flex gap-4 bg-black/40 p-2 rounded-full backdrop-blur-md">
          {['Vídeo', 'Foto'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 rounded-full text-xs font-black uppercase ${activeTab === tab ? 'bg-white text-black' : 'opacity-50'}`}>{tab}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
