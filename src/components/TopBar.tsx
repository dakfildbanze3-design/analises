import React, { useState } from 'react';
import { Menu, Search, ShoppingCart, ArrowLeft, Share2, MoreVertical, Settings, MessageCircle, Bug, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

interface TopBarProps {
  showBack?: boolean;
  title?: string;
  rightElement?: React.ReactNode;
}

export default function TopBar({ showBack, title = "BOLADAS", rightElement }: TopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleMenuClick = () => {
    setIsMenuOpen(true);
  };

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleSupportClick = () => {
    const message = encodeURIComponent("Olá, preciso de suporte com o aplicativo Boladas.");
    window.open(`https://wa.me/258855767005?text=${message}`, '_blank');
    setIsMenuOpen(false);
  };

  const handleBugReportClick = () => {
    const message = encodeURIComponent("Olá, encontrei um bug no aplicativo Boladas: ");
    window.open(`https://wa.me/258855767005?text=${message}`, '_blank');
    setIsMenuOpen(false);
  };

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-black flex justify-between items-center px-4 h-12 border-b border-white/5">
        <div className="flex items-center gap-4">
          {showBack ? (
            <button 
              onClick={handleBack}
              className="text-on-surface hover:bg-surface-container-highest transition-colors p-1 rounded active:scale-95"
            >
              <ArrowLeft size={20} strokeWidth={3} />
            </button>
          ) : (
            <button 
              onClick={handleMenuClick}
              className="text-on-surface hover:bg-surface-container-highest transition-colors p-1 rounded active:scale-95 transition-all active:scale-90"
            >
              <Menu size={20} strokeWidth={3} />
            </button>
          )}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <h1 className="text-lg font-black text-white uppercase tracking-tighter">
              {title}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {rightElement ? (
            rightElement
          ) : (
            <>
              {location.pathname === '/' && (
                <button 
                  onClick={() => navigate('/search')}
                  className="text-on-surface hover:bg-surface-container-highest transition-colors p-1 rounded active:scale-95 transition-all"
                >
                  <Search size={20} strokeWidth={3} />
                </button>
              )}
              {showBack && (
                <>
                  <button className="text-on-surface hover:bg-surface-container-highest transition-colors p-1 rounded active:scale-95">
                    <Share2 size={20} strokeWidth={3} />
                  </button>
                  <button className="text-on-surface hover:bg-surface-container-highest transition-colors p-1 rounded active:scale-95">
                    <MoreVertical size={20} strokeWidth={3} />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </header>

      {/* Small Dropdown Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: -10, y: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: -10, y: -10 }}
              className="absolute top-12 left-4 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-[101] py-1 overflow-hidden"
            >
              <button 
                onClick={() => { navigate('/settings'); setIsMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/5 transition-colors active:bg-white/10"
              >
                <Settings size={18} strokeWidth={3} className="text-white shrink-0" />
                <span className="text-[0.75rem] font-black uppercase tracking-widest whitespace-nowrap">Definições</span>
              </button>

              <button 
                onClick={handleSupportClick}
                className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/5 transition-colors active:bg-white/10"
              >
                <MessageCircle size={18} strokeWidth={3} className="text-white shrink-0" />
                <span className="text-[0.75rem] font-black uppercase tracking-widest whitespace-nowrap">Suporte</span>
              </button>

              <button 
                onClick={handleBugReportClick}
                className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/5 transition-colors active:bg-white/10"
              >
                <Bug size={18} strokeWidth={3} className="text-white shrink-0" />
                <span className="text-[0.75rem] font-black uppercase tracking-widest whitespace-nowrap">Report Bug</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
