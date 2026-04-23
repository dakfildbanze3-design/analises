import React, { useState, useEffect, Suspense, lazy, Component, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import VideoCallOverlay from './components/VideoCallOverlay';
import SplashScreen from './components/SplashScreen';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { notificationService } from './services/notificationService';

// Lazy loading components for faster initial load
const Home = lazy(() => import('./pages/Home'));
const Chat = lazy(() => import('./pages/Chat'));
const Alerts = lazy(() => import('./pages/Alerts'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const Sell = lazy(() => import('./pages/Sell'));
const SellDetails = lazy(() => import('./pages/SellDetails'));
const SellCamera = lazy(() => import('./pages/SellCamera'));
const ShortPlayer = lazy(() => import('./pages/ShortPlayer'));
const Search = lazy(() => import('./pages/Search'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ProfileSetup = lazy(() => import('./pages/ProfileSetup'));
const ChatDetail = lazy(() => import('./pages/ChatDetail'));

const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center py-20 bg-background text-primary">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends (Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Critical Render Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#131313] text-white p-8 flex flex-col items-center justify-center text-center">
          <h1 className="text-xl font-bold mb-4">Ups! Algo correu mal.</h1>
          <p className="text-sm opacity-60 mb-6 max-w-xs">
            A aplicação encontrou um erro inesperado. Tenta recarregar a página.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-900 px-6 py-3 rounded-full font-bold text-sm uppercase tracking-widest"
          >
            Recarregar
          </button>
          <div className="mt-8 p-4 bg-black/20 rounded text-[10px] text-left overflow-auto max-w-full">
            <code>{this.state.error?.toString()}</code>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  // Presence Tracking Hook
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
      (user) => {
        setUser(user);
        setLoading(false);
        
        if (user) {
          notificationService.saveFCMToken(user.uid);
        }

        const isAuthPage = ['/login', '/register', '/profile-setup'].includes(location.pathname);
        if (!user && !isAuthPage && !showSplash) {
          navigate('/login');
        }
      },
      (error) => {
        console.error("Firebase Auth Error:", error);
        // This helps the user see if their API key/Auth Domain is misconfigured in production
        if (error.message.includes('auth/unauthorized-domain')) {
          alert("Domínio não autorizado no Firebase! Adiciona este URL nas definições de Autenticação do Firebase.");
        } else {
          alert("Erro de Autenticação: " + error.message);
        }
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [location.pathname, navigate, showSplash]);

  const isProductDetail = location.pathname.startsWith('/product/');
  const isPublicProfile = location.pathname.startsWith('/user/');
  const isSettings = location.pathname === '/settings';
  const isSell = location.pathname === '/sell';
  const isSellDetails = location.pathname === '/sell-details';
  const isSellCamera = location.pathname === '/sell-camera';
  const isShortPlayer = location.pathname.startsWith('/short/');
  const isSearch = location.pathname === '/search';
  const isChat = location.pathname === '/chat';
  const isChatDetail = location.pathname.startsWith('/chat/');
  const isAuthPage = ['/login', '/register', '/profile-setup'].includes(location.pathname);

  // Use SplashScreen to cover both the fixed timer and the firebase auth loading
  if (showSplash || loading) {
    return <SplashScreen onFinish={() => setShowSplash(false)} isReady={!loading} />;
  }

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {!isAuthPage && !isShortPlayer && !isSellCamera && !isSearch && (
        <TopBar 
          showBack={isProductDetail || isPublicProfile || isSettings || isSell || isSellDetails} 
          title={isProductDetail ? "PRODUTO" : isPublicProfile ? "PERFIL" : isSettings ? "DEFINIÇÕES" : isSell ? "VENDER" : isSellDetails ? "Adicione detalhes" : "BOLADAS"}
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
      
      <main className={`max-w-md mx-auto relative ${isAuthPage ? '' : ''}`}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/:chatId" element={<ChatDetail />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/short/:id" element={<ShortPlayer />} />
            <Route path="/user/:id" element={<PublicProfile />} />
            <Route path="/video/:id" element={<ShortPlayer />} />
            <Route path="/sell" element={<Sell />} />
            <Route path="/sell-details" element={<SellDetails />} />
            <Route path="/sell-camera" element={<SellCamera />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile-setup" element={<ProfileSetup />} />
          </Routes>
        </Suspense>
      </main>

      <VideoCallOverlay />
      <PwaInstallPrompt />

      {!isProductDetail && !isAuthPage && !isShortPlayer && !isSellCamera && !isSellDetails && !isChat && !isChatDetail && !isSearch && <BottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppContent />
      </Router>
    </ErrorBoundary>
  );
}
