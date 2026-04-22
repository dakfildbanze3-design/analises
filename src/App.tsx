import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Chat from './pages/Chat';
import Alerts from './pages/Alerts';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import ProductDetail from './pages/ProductDetail';
import PublicProfile from './pages/PublicProfile';
import Sell from './pages/Sell';
import SellDetails from './pages/SellDetails';
import SellCamera from './pages/SellCamera';
import ShortPlayer from './pages/ShortPlayer';
import Search from './pages/Search';
import Login from './pages/Login';
import Register from './pages/Register';
import ProfileSetup from './pages/ProfileSetup';
import ChatDetail from './pages/ChatDetail';
import VideoCallOverlay from './components/VideoCallOverlay';
import SplashScreen from './components/SplashScreen';
import { auth } from './lib/firebase';
import { notificationService } from './services/notificationService';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

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
          <Route path="/sell" element={<Sell />} />
          <Route path="/sell-details" element={<SellDetails />} />
          <Route path="/sell-camera" element={<SellCamera />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile-setup" element={<ProfileSetup />} />
        </Routes>
      </main>

      <VideoCallOverlay />

      {!isProductDetail && !isAuthPage && !isShortPlayer && !isSellCamera && !isSellDetails && !isChat && !isChatDetail && !isSearch && <BottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
