import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      // Impede o prompt padrão de aparecer automaticamente
      e.preventDefault();
      // Guarda o evento para acionar mais tarde
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Mostra o prompt de instalação do sistema
    deferredPrompt.prompt();
    
    // Aguarda a resposta do usuário
    const { outcome } = await deferredPrompt.userChoice;
    
    // Se aceitar, podemos esconder ou limpar o prompt
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  const showPrompt = deferredPrompt && !isDismissed;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="fixed bottom-24 right-4 z-50 flex items-center bg-blue-600 text-white rounded-full shadow-xl shadow-blue-900/20 p-1 pr-4 gap-2"
        >
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              handleDismiss(); 
            }} 
            className="p-2 hover:bg-black/20 rounded-full transition-colors flex-shrink-0 active:scale-90"
            aria-label="Fechar"
          >
            <X size={16} strokeWidth={3} />
          </button>
          <div 
            onClick={handleInstallClick} 
            className="flex items-center gap-2 flex-1 cursor-pointer group active:opacity-70"
          >
            <Download size={18} strokeWidth={3} className="group-hover:-translate-y-0.5 transition-transform" />
            <span className="font-bold text-[0.8rem] uppercase tracking-wider">Instalar App</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
