'use client';

import React, { useState, useEffect, Suspense, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import TopBar from '@/src/components/TopBar';
import BottomNav from '@/src/components/BottomNav';
import VideoCallOverlay from '@/src/components/VideoCallOverlay';
import SplashScreen from '@/src/components/SplashScreen';
import PwaInstallPrompt from '@/src/components/PwaInstallPrompt';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase';
import { notificationService } from '@/src/services/notificationService';

const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center py-20 bg-background text-primary">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashFinish = React.useCallback(() => {
    setShowSplash(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn("Auth timeout reached. Proceeding to main app.");
        setLoading(false);
      }
      setShowSplash(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (!user?.uid) return;
    const uid = user.uid;
    const userRef = doc(db, 'users', uid);
    
    const updatePresence = (isOnline: boolean) => {
      updateDoc(userRef, {
        isOnline,
        lastSeen: serverTimestamp()
      }).catch(() => {});
    };
    
    updatePresence(true);
    
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        updatePresence(true);
      } else {
        updatePresence(false);
      }
    };
    
    window.addEventListener('visibilitychange', handleVisibility);
    return () => window.removeEventListener('visibilitychange', handleVisibility);
  }, [user]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(
      (currentUser) => {
        setUser(currentUser);
        setLoading(false);
        if (currentUser) {
          notificationService.saveFCMToken(currentUser.uid);
        }
      },
      (error) => {
        console.error("Firebase Auth Error:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loading || showSplash) return;

    const isAuthPage = ['/login', '/register', '/profile-setup', '/onboarding', '/terms', '/privacy'].includes(pathname);
    
    if (user && ['/login', '/register', '/onboarding'].includes(pathname)) {
      router.push('/');
    } else if (!user && !isAuthPage) {
      router.push('/onboarding');
    }
  }, [user, loading, showSplash, pathname]);

  const isProductDetail = pathname.startsWith('/product/');
  const isPublicProfile = pathname.startsWith('/user/');
  const isSettings = pathname === '/settings';
  const isSell = pathname === '/sell';
  const isSellDetails = pathname === '/sell/details';
  const isSellCamera = pathname === '/sell/camera';
  const isShortPlayer = pathname.startsWith('/short/');
  const isSearch = pathname === '/search';
  const isChat = pathname === '/chat';
  const isChatDetail = pathname.startsWith('/chat/');
  const isFollowing = pathname === '/following';
  const isDiscover = pathname === '/discover';
  const isAlerts = pathname === '/alerts';
  const isAuthPage = ['/login', '/register', '/profile-setup', '/onboarding', '/terms', '/privacy'].includes(pathname);

  if (showSplash || loading) {
    return <SplashScreen onFinish={handleSplashFinish} isReady={!loading} />;
  }

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {!isAuthPage && !isShortPlayer && (
        <TopBar 
          showBack={isProductDetail || isPublicProfile || isSettings || isSell || isSellDetails || isFollowing || isDiscover || isSearch || isChat || isChatDetail || isAlerts} 
          title={
            isProductDetail ? "PRODUTO" : 
            isPublicProfile ? "PERFIL" : 
            isSettings ? "DEFINIÇÕES" : 
            isSell ? "VENDER" : 
            isSellDetails ? "Adicione detalhes" : 
            isFollowing ? "SEGUINDO" : 
            isDiscover ? "DESCOBRIR" : 
            isSearch ? "PESQUISAR" : 
            isChat ? "MENSAGENS" : 
            isChatDetail ? "CHAT" : 
            isAlerts ? "Notificações" :
            "BOLADAS"
          }
          rightElement={isSell ? (
            <button 
              onClick={() => {
                const form = document.getElementById('sell-form') as HTMLFormElement;
                if (form) form.requestSubmit();
              }}
              className="text-[#007AFF] font-bold text-[0.875rem] px-2 py-1 active:opacity-50 transition-opacity"
            >
              PUBLICAR
            </button>
          ) : undefined}
        />
      )}
      
      <main className={`max-w-md mx-auto relative`}>
        {children}
      </main>

      <VideoCallOverlay />
      <PwaInstallPrompt />

      {!isProductDetail && !isAuthPage && !isShortPlayer && !isSellCamera && !isSellDetails && !isChatDetail && !isSearch && <BottomNav />}
    </div>
  );
}
