"use client";
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SplashScreenProps {
  onFinish: () => void;
  isReady: boolean;
}

export default function SplashScreen({ onFinish, isReady }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [minTimeExpired, setMinTimeExpired] = useState(false);

  useEffect(() => {
    // Minimum display time of 2 seconds
    const timer = setTimeout(() => {
      setMinTimeExpired(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Only hide splash when both minimum time has passed AND app is ready
    if (minTimeExpired && isReady) {
      setIsVisible(false);
      onFinish();
    }
  }, [minTimeExpired, isReady, onFinish]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="w-[200px] h-[200px]"
          >
            <div className="w-full h-full flex items-center justify-center bg-zinc-900 rounded-[40px] border border-white/10">
              <span className="text-6xl font-black text-primary italic tracking-tighter">B</span>
            </div>
            {/* 
            <img 
              src="/android-chrome-512x512.png" 
              alt="Logo" 
              className="w-full h-full object-contain"
            />
            */}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
