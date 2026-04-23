import React, { useEffect, useRef } from 'react';

interface AdBannerProps {
  adSlot?: string;
  adClient?: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  className?: string;
  useImageBackground?: boolean;
}

/**
 * AdBanner Component for Google AdSense / AdMob for Web
 */
export default function AdBanner({ 
  adSlot = import.meta.env.VITE_ADSENSE_SLOT_FEED || "6870833164", 
  adClient = import.meta.env.VITE_ADSENSE_CLIENT_ID || "ca-pub-7509073601077347", 
  format = "auto",
  className = "",
  useImageBackground = false
}: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null);
  
  useEffect(() => {
    // Small delay to ensure DOM is fully ready and avoid race conditions in React
    const timeout = setTimeout(() => {
      try {
        // Check if the current ad element is already initialized or being processed
        // AdSense adds data-adsbygoogle-status="done" once processed
        if (adRef.current && !adRef.current.hasAttribute('data-adsbygoogle-status')) {
          // @ts-ignore
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        }
      } catch (e) {
        console.error("AdSense error:", e);
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [adSlot, adClient]);

  return (
    <div className={`my-4 overflow-hidden rounded-xl bg-zinc-900/50 border border-white/5 ${className}`}>
      <div className="p-2 border-b border-white/5 flex justify-between items-center bg-zinc-900">
        <span className="text-[0.6rem] font-bold text-zinc-500 uppercase tracking-widest">Patrocinado</span>
        <span className="text-[0.6rem] text-zinc-600 px-1.5 py-0.5 border border-zinc-700 rounded-sm">AD</span>
      </div>
      <div className="flex items-center justify-center min-h-[100px] relative bg-zinc-950/50">
        {useImageBackground && <img src="/logo.png" alt="AD" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-[2px]" />}
        {/* Google AdSense / AdMob Tag */}
        <ins 
          ref={adRef}
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', minWidth: '250px' }}
          data-ad-client={adClient}
          data-ad-slot={adSlot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
        
        {/* Placeholder UI */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 z-0">
          <p className="text-[0.75rem] font-black uppercase text-white italic tracking-tighter opacity-10">BOLADAS ADS</p>
        </div>
      </div>
    </div>
  );
}
