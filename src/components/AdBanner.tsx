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
    let observer: ResizeObserver | null = null;
    
    const initAd = () => {
      try {
        if (adRef.current && !adRef.current.hasAttribute('data-adsbygoogle-status')) {
          const width = adRef.current.offsetWidth || (adRef.current.parentElement?.offsetWidth ?? 0);
          if (width > 0) {
            // @ts-ignore
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            if (observer) observer.disconnect();
          }
        }
      } catch (e) {
        console.error("AdSense error:", e);
      }
    };

    // Small delay to ensure DOM is fully ready and avoid race conditions in React
    const timeout = setTimeout(() => {
      initAd();
      
      // Fallback: observe resizing in case width was initially 0
      if (adRef.current && !adRef.current.hasAttribute('data-adsbygoogle-status')) {
        observer = new ResizeObserver(() => {
          if (adRef.current && adRef.current.offsetWidth > 0) {
            initAd();
          }
        });
        observer.observe(adRef.current);
      }
    }, 250);

    return () => {
      clearTimeout(timeout);
      if (observer) observer.disconnect();
    };
  }, [adSlot, adClient]);

  return (
    <div className={`my-4 overflow-hidden bg-background ${className}`}>
      <div className="p-2 flex justify-between items-center">
        <span className="text-[0.6rem] font-bold text-zinc-500 uppercase tracking-widest">Patrocinado</span>
        <span className="text-[0.6rem] text-zinc-600 px-1.5 py-0.5 border border-zinc-800 rounded-sm">AD</span>
      </div>
      <div className="flex items-center justify-center min-h-[100px] relative bg-background">
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
