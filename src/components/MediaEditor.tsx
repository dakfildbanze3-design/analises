import React, { useState, useRef, useEffect } from 'react';
import { RefreshCcw, Check, Crop, RotateCcw, Settings2, Sparkles, Volume2, VolumeX, Scissors, Image as ImageIcon } from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../lib/imageEditorUtils';

interface MediaEditorProps {
  media: { type: 'video' | 'image'; url: string; allUrls?: string[] };
  onCancel: () => void;
  onComplete: (mediaUrls: string[], thumbnailUrl?: string, videoMeta?: { start: number, end: number, isMuted: boolean }) => void;
}

const FILTER_PRESETS: Record<string, { label: string, css: string }> = {
  none: { label: 'Normal', css: '' },
  claro: { label: 'Claro', css: 'brightness(1.1) contrast(1.1) saturate(1.2)' },
  quente: { label: 'Quente', css: 'sepia(0.3) saturate(1.3) hue-rotate(-5deg) contrast(1.05)' },
  frio: { label: 'Frio', css: 'saturate(1.1) hue-rotate(15deg) contrast(1.1)' },
  profissional: { label: 'Pro', css: 'contrast(1.15) saturate(1.1) grayscale(0.1)' },
  dark: { label: 'Dark', css: 'contrast(1.2) brightness(0.9) saturate(1.1)' },
};

export default function MediaEditor({ media, onCancel, onComplete }: MediaEditorProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  // Image State
  const [activeTabImage, setActiveTabImage] = useState<'crop' | 'adjust' | 'filters'>('filters');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [preset, setPreset] = useState('none');

  // Video State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeTabVideo, setActiveTabVideo] = useState<'trim' | 'sound' | 'thumb'>('trim');
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [thumbTime, setThumbTime] = useState(0);

  const cssFilterString = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) ${FILTER_PRESETS[preset].css}`.trim();

  useEffect(() => {
    if (media.type === 'video' && videoRef.current) {
      const vid = videoRef.current;
      const onLoadedMeta = () => {
        setDuration(vid.duration);
        setTrimEnd(vid.duration);
      };
      
      let animationFrameId: number;
      
      const checkTime = () => {
        if (activeTabVideo === 'trim') {
            if (vid.currentTime >= trimEnd) {
                vid.currentTime = trimStart;
                vid.play().catch(()=>{});
            }
        }
        animationFrameId = requestAnimationFrame(checkTime);
      };
      
      vid.addEventListener('loadedmetadata', onLoadedMeta);
      animationFrameId = requestAnimationFrame(checkTime);
      
      return () => {
        vid.removeEventListener('loadedmetadata', onLoadedMeta);
        cancelAnimationFrame(animationFrameId);
      };
    }
  }, [media.type, trimStart, trimEnd, activeTabVideo]);

  const handleFinish = async () => {
    setIsProcessing(true);
    try {
      if (media.type === 'image') {
        let targetCrop = croppedAreaPixels;
        if (!targetCrop) {
          const img = new Image();
          img.src = media.url;
          await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
          targetCrop = { x: 0, y: 0, width: img.width, height: img.height } as any;
        }

        let finalUrl = media.url;
        try {
          const croppedUrl = await getCroppedImg(media.url, targetCrop, rotation, cssFilterString);
          if (croppedUrl) finalUrl = croppedUrl;
        } catch (cropErr) {
          console.warn("Crop failed, proceeding with original", cropErr);
        }
        
        const urlsToReturn = media.allUrls ? [...media.allUrls] : [media.url];
        urlsToReturn[0] = finalUrl || media.url;
        onComplete(urlsToReturn);
      } else {
        let thumbUrl = undefined;
        if (videoRef.current) {
           const canvas = document.createElement('canvas');
           canvas.width = videoRef.current.videoWidth;
           canvas.height = videoRef.current.videoHeight;
           const ctx = canvas.getContext('2d');
           if (ctx) {
             const currentT = videoRef.current.currentTime;
             videoRef.current.currentTime = thumbTime;

             await new Promise((resolve) => {
                let resolved = false;
                const onSeeked = () => {
                   if(resolved) return;
                   resolved = true;
                   videoRef.current?.removeEventListener('seeked', onSeeked);
                   resolve(true);
                };
                videoRef.current?.addEventListener('seeked', onSeeked);
                
                // Fallback timeout in case seeked doesn't fire on iOS Safari
                setTimeout(() => {
                   if(!resolved) {
                     resolved = true;
                     videoRef.current?.removeEventListener('seeked', onSeeked);
                     resolve(true);
                   }
                }, 300);
             });

             ctx.drawImage(videoRef.current, 0, 0);
             thumbUrl = canvas.toDataURL('image/jpeg', 0.85);
             videoRef.current.currentTime = currentT;
           }
        }
        const videoMeta = { start: trimStart, end: trimEnd, isMuted };
        onComplete([media.url], thumbUrl, videoMeta); 
      }
    } catch (err) {
      console.error(err);
      alert('Erro inesperado ao processar. A avançar com original...');
      onComplete([media.url]); // Fallback safely
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black flex flex-col font-sans select-none overflow-hidden touch-none">
      {/* Top Header */}
      <div className="flex justify-between items-center px-4 h-[60px] w-full z-50 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0">
        <button 
          onClick={onCancel} 
          className="p-2 text-white/80 active:scale-95 transition-all flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/10"
        >
          <RefreshCcw size={20} strokeWidth={2.5}/>
        </button>

        <span className="text-white font-black uppercase text-[0.8rem] tracking-[0.2em] opacity-90 shadow-black drop-shadow-md">
          {media.type === 'image' ? 'Edição' : 'Vídeo'}
        </span>

        <button 
          onClick={handleFinish} 
          disabled={isProcessing}
          className="flex items-center gap-2 bg-white text-black px-5 py-2 rounded-full font-bold active:scale-95 transition-all disabled:opacity-50 border border-white shadow-lg shadow-white/20"
        >
          <span className="text-[0.75rem] uppercase tracking-wider">{isProcessing ? 'A Guardar' : 'Concluir'}</span>
          {!isProcessing && <Check size={18} strokeWidth={3} />}
        </button>
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 w-full bg-zinc-950 flex flex-col justify-center relative overflow-hidden pt-[60px] pb-[160px]">
        {media.type === 'image' ? (
          <div className="w-full h-full relative">
            {/* Always show Cropper but hide grid when not cropping */}
            <Cropper
              image={media.url}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1} // Marketplace standard 1:1 square feels most professional
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels as any)}
              showGrid={activeTabImage === 'crop'}
              style={{
                containerStyle: { background: '#000' },
                mediaStyle: { filter: cssFilterString },
                cropAreaStyle: { 
                  border: activeTabImage === 'crop' ? '1.5px solid rgba(255,255,255,0.8)' : 'none', 
                  color: activeTabImage === 'crop' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.2)' 
                }
              }}
            />
          </div>
        ) : (
          <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
             <div className="w-full max-w-[400px] h-full rounded-xl overflow-hidden bg-black relative border border-white/10 shadow-2xl">
               <video 
                 ref={videoRef}
                 src={media.url} 
                 muted={isMuted}
                 className="w-full h-full object-cover" 
                 playsInline
                 autoPlay={activeTabVideo === 'trim'}
                 loop
               />
               {activeTabVideo === 'thumb' && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                    <div className="border-[2px] border-white w-[70%] aspect-[9/16] rounded-xl flex flex-col items-center justify-center shadow-2xl">
                      <ImageIcon size={32} className="text-white mb-2 opacity-80" />
                      <span className="text-black text-[0.65rem] bg-white px-4 py-1.5 rounded-full font-bold uppercase tracking-widest shadow-md">Capa do Anúncio</span>
                    </div>
                 </div>
               )}
             </div>
          </div>
        )}
      </div>

      {/* Editor Controls Bottom Panel */}
      <div className="absolute bottom-0 left-0 w-full bg-zinc-950 border-t border-white/5 rounded-t-[32px] pt-4 pb-8 flex flex-col z-50 shadow-[0_-20px_60px_rgba(0,0,0,0.8)]">
        
        {/* Active Tool Workspace */}
        <div className="h-[80px] w-full flex items-center justify-center px-4">
           {media.type === 'image' && (
             <div className="w-full h-full flex items-center justify-center">
               {activeTabImage === 'crop' && (
                 <div className="flex w-full max-w-md items-center gap-6 px-4">
                    <button 
                      onClick={() => setRotation(r => r - 90)} 
                      className="flex flex-col items-center justify-center gap-1.5 text-white p-3 hover:bg-white/10 rounded-2xl bg-white/5 active:scale-95 transition-all"
                    >
                       <RotateCcw size={20} />
                    </button>
                    <div className="flex-1 flex flex-col gap-2">
                       <span className="text-[0.6rem] text-white/50 font-bold uppercase tracking-widest px-1">Zoom</span>
                       <input 
                         type="range" min="1" max="3" step="0.05" value={zoom} 
                         onChange={(e) => setZoom(Number(e.target.value))} 
                         className="w-full h-1 appearance-none bg-white/20 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full" 
                       />
                    </div>
                 </div>
               )}
               {activeTabImage === 'adjust' && (
                 <div className="flex flex-col w-full max-w-md gap-3 px-4">
                    <div className="flex items-center gap-4">
                      <span className="text-white/80 text-[0.65rem] uppercase font-bold w-16 text-right tracking-wider">Brilho</span>
                      <input 
                        type="range" min="50" max="150" value={brightness} 
                        onChange={(e) => setBrightness(Number(e.target.value))} 
                        className="flex-1 h-1 appearance-none bg-white/20 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full" />
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-white/80 text-[0.65rem] uppercase font-bold w-16 text-right tracking-wider">Contraste</span>
                      <input 
                        type="range" min="50" max="150" value={contrast} 
                        onChange={(e) => setContrast(Number(e.target.value))} 
                        className="flex-1 h-1 appearance-none bg-white/20 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full" />
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-white/80 text-[0.65rem] uppercase font-bold w-16 text-right tracking-wider">Saturação</span>
                      <input 
                        type="range" min="0" max="200" value={saturation} 
                        onChange={(e) => setSaturation(Number(e.target.value))} 
                        className="flex-1 h-1 appearance-none bg-white/20 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full" />
                    </div>
                 </div>
               )}
               {activeTabImage === 'filters' && (
                 <div className="flex w-full items-center justify-start gap-4 overflow-x-auto hide-scrollbar px-4 py-2">
                    {Object.keys(FILTER_PRESETS).map(key => (
                      <button 
                        key={key} 
                        onClick={() => setPreset(key)}
                        className={`flex flex-col items-center gap-2 transition-all flex-shrink-0 ${preset === key ? 'scale-110 opacity-100' : 'opacity-50 hover:opacity-80'}`}
                      >
                         <div className={`w-14 h-14 rounded-full overflow-hidden border-[3px] ${preset === key ? 'border-white' : 'border-transparent'}`}>
                             <div className="w-full h-full bg-gradient-to-tr from-white/40 to-white/10" style={{ filter: FILTER_PRESETS[key].css }} />
                         </div>
                         <span className={`text-[0.6rem] font-bold uppercase tracking-wider ${preset === key ? 'text-white' : 'text-zinc-500'}`}>
                            {FILTER_PRESETS[key].label}
                         </span>
                      </button>
                    ))}
                    <div className="w-4 h-full flex-shrink-0" />
                 </div>
               )}
             </div>
           )}

           {media.type === 'video' && (
             <div className="w-full h-full flex items-center justify-center">
               {activeTabVideo === 'trim' && duration > 0 && (
                 <div className="w-full max-w-md flex flex-col gap-4 px-4">
                    <div className="w-full flex justify-between items-center text-white/50 text-[0.65rem] font-bold tracking-widest px-2">
                      <span className="bg-white/10 px-3 py-1 rounded-full text-white">{trimStart.toFixed(1)}s</span>
                      <span className="uppercase text-[0.55rem]">{(trimEnd - trimStart).toFixed(1)}s selecionados</span>
                      <span className="bg-white/10 px-3 py-1 rounded-full text-white">{trimEnd.toFixed(1)}s</span>
                    </div>

                    <div 
                      className="relative w-full h-12 bg-zinc-900 rounded-lg border border-white/10 flex items-center touch-none select-none"
                      onPointerDown={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const percentage = x / rect.width;
                        const time = percentage * duration;
                        
                        // Decide which thumb is closer
                        if (Math.abs(time - trimStart) < Math.abs(time - trimEnd)) {
                           if (time < trimEnd - 0.5) setTrimStart(Math.max(0, time));
                        } else {
                           if (time > trimStart + 0.5) setTrimEnd(Math.min(duration, time));
                        }
                      }}
                      onPointerMove={(e) => {
                         if (e.buttons !== 1) return;
                         const rect = e.currentTarget.getBoundingClientRect();
                         const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                         const percentage = x / rect.width;
                         const time = percentage * duration;
                         
                         if (Math.abs(time - trimStart) < Math.abs(time - trimEnd)) {
                             if (time < trimEnd - 0.5) {
                                 setTrimStart(time);
                                 if (videoRef.current) videoRef.current.currentTime = time;
                             }
                         } else {
                             if (time > trimStart + 0.5) {
                                 setTrimEnd(time);
                             }
                         }
                      }}
                    >
                       {/* Background Track */}
                       <div className="absolute inset-0 bg-white/5 pointer-events-none" />
                       
                       {/* Highlighted Window */}
                       <div 
                         className="absolute top-0 bottom-0 bg-white/20 border-y-2 border-white pointer-events-none" 
                         style={{ 
                            left: `${(trimStart / duration) * 100}%`, 
                            right: `${100 - (trimEnd / duration) * 100}%` 
                         }} 
                       />

                       {/* Custom Drag Handles (Visual Only) */}
                       <div className="absolute top-0 bottom-0 w-3 bg-white rounded-md shadow-lg pointer-events-none -ml-1.5 flex items-center justify-center border border-zinc-300" style={{ left: `${(trimStart / duration) * 100}%` }}>
                          <div className="w-0.5 h-4 bg-zinc-400 rounded-full" />
                       </div>
                       <div className="absolute top-0 bottom-0 w-3 bg-white rounded-md shadow-lg pointer-events-none -mr-1.5 flex items-center justify-center border border-zinc-300" style={{ right: `${100 - (trimEnd / duration) * 100}%` }}>
                          <div className="w-0.5 h-4 bg-zinc-400 rounded-full" />
                       </div>
                    </div>
                 </div>
               )}
               {activeTabVideo === 'sound' && (
                 <button 
                   onClick={() => setIsMuted(!isMuted)} 
                   className={`flex items-center gap-3 px-8 py-4 rounded-[20px] font-bold text-sm tracking-wider uppercase transition-all shadow-xl ${isMuted ? 'bg-red-500 text-white' : 'bg-white text-black'}`}
                 >
                   {isMuted ? <VolumeX size={20} strokeWidth={2.5}/> : <Volume2 size={20} strokeWidth={2.5}/>}
                   {isMuted ? 'Áudio Mudo' : 'Áudio Ativo'}
                 </button>
               )}
               {activeTabVideo === 'thumb' && duration > 0 && (
                 <div className="w-full max-w-md flex flex-col items-center gap-4 px-4">
                    <div className="text-white text-[0.65rem] font-bold uppercase tracking-widest whitespace-nowrap bg-white/10 px-4 py-1.5 rounded-full border border-white/20">
                      Deslize para Escolher a Capa do Anúncio
                    </div>
                    <div className="relative w-full h-10 flex items-center touch-none select-none">
                      <div className="w-full h-3 bg-zinc-800 rounded-full border border-white/5 overflow-hidden">
                        <div className="h-full bg-white/30" style={{ width: `${(thumbTime / duration) * 100}%` }} />
                      </div>
                      <input 
                        type="range" min="0" max={duration} step="0.1" value={thumbTime} 
                        onChange={(e) => {
                           const val = Number(e.target.value);
                           setThumbTime(val); 
                           if (videoRef.current) { videoRef.current.currentTime = val; videoRef.current.pause(); }
                        }} 
                        className="absolute w-full h-full opacity-0 cursor-pointer pointer-events-auto" 
                      />
                      {/* Custom Handle */}
                      <div className="absolute w-5 h-7 bg-white rounded-md shadow-lg pointer-events-none -ml-2.5 flex items-center justify-center border border-zinc-300" style={{ left: `${(thumbTime / duration) * 100}%` }}>
                         <div className="w-0.5 h-4 bg-zinc-400 rounded-full" />
                      </div>
                    </div>
                 </div>
               )}
             </div>
           )}
        </div>

        {/* Bottom Tab Selectors */}
        <div className="flex justify-evenly py-4 px-2 w-full max-w-sm mx-auto">
          {media.type === 'image' ? (
            <>
              <TabBtn icon={<Sparkles />} label="Filtros" active={activeTabImage === 'filters'} onClick={() => setActiveTabImage('filters')} />
              <TabBtn icon={<Settings2 />} label="Ajustar" active={activeTabImage === 'adjust'} onClick={() => setActiveTabImage('adjust')} />
              <TabBtn icon={<Crop />} label="Recortar" active={activeTabImage === 'crop'} onClick={() => setActiveTabImage('crop')} />
            </>
          ) : (
            <>
              <TabBtn icon={<Scissors />} label="Cortar" active={activeTabVideo === 'trim'} onClick={() => { setActiveTabVideo('trim'); videoRef.current?.play(); }} />
              <TabBtn icon={<ImageIcon />} label="Capa" active={activeTabVideo === 'thumb'} onClick={() => { setActiveTabVideo('thumb'); videoRef.current?.pause(); }} />
              <TabBtn icon={isMuted ? <VolumeX /> : <Volume2 />} label="Som" active={activeTabVideo === 'sound'} onClick={() => setActiveTabVideo('sound')} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TabBtn({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-2 transition-all w-[72px] rounded-xl py-2 ${active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
    >
      <div className={`p-0 transition-colors ${active ? 'text-white scale-110 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-transparent text-zinc-500'}`}>
         {React.cloneElement(icon as React.ReactElement, { size: 24, strokeWidth: active ? 2.5 : 2 })}
      </div>
      <span className={`text-[0.65rem] font-bold tracking-widest uppercase ${active ? 'text-white opacity-100' : 'opacity-60'}`}>{label}</span>
    </button>
  );
}
