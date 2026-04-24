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
const Following = lazy(() => import('./pages/Following'));
const DiscoverUsers = lazy(() => import('./pages/DiscoverUsers'));
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
class ErrorBoundary extends Component<any, any> {
  constructor(props: any) {
    super(props);
    // @ts-ignore
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Critical Catch:", error, errorInfo);
  }

  render() {
    // @ts-ignore
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          backgroundColor: '#000000',
          backgroundImage: 'radial-gradient(circle at top, #111111 0%, #000000 100%)',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '20px',
          fontFamily: 'sans-serif'
        }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Ups! Algo falhou.</h1>
          <p style={{ fontSize: '14px', opacity: 0.7, marginBottom: '24px' }}>
            A aplicação encontrou um problema técnico.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#1e3a8a',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '999px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Recarregar App
          </button>
          <pre style={{ marginTop: '30px', fontSize: '10px', opacity: 0.5, maxWidth: '100%', overflow: 'auto' }}>
            {/* @ts-ignore */}
            {this.state.error?.message || String(this.state.error)}
          </pre>
        </div>
      );
    }
    // @ts-ignore
    return this.props.children;
  }
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  // Safety Timeout: Force-disable loading state after 8 seconds if Firebase/Auth is slow/stuck
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn("Auth timeout reached. Proceeding to main app.");
        setLoading(false);
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [loading]);

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
  const isFollowing = location.pathname === '/following';
  const isDiscover = location.pathname === '/discover';
  const isAlerts = location.pathname === '/alerts';
  const isAuthPage = ['/login', '/register', '/profile-setup'].includes(location.pathname);

  // Use SplashScreen to cover both the fixed timer and the firebase auth loading
  if (showSplash || loading) {
    return <SplashScreen onFinish={() => setShowSplash(false)} isReady={!loading} />;
  }

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {!isAuthPage && (
        <TopBar 
          showBack={isProductDetail || isPublicProfile || isSettings || isSell || isSellDetails || isFollowing || isDiscover || isSearch || isChat || isChatDetail || isShortPlayer || isSellCamera || isAlerts} 
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
            isShortPlayer ? "Anúncios em shorts" : 
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
      
      <main className={`max-w-md mx-auto relative ${isAuthPage ? '' : ''}`}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/following" element={<Following />} />
            <Route path="/discover" element={<DiscoverUsers />} />
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

      {!isProductDetail && !isAuthPage && !isShortPlayer && !isSellCamera && !isSellDetails && !isChatDetail && !isSearch && <BottomNav />}
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
