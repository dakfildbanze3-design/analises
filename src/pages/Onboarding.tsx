import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, Video, MessageSquare, ShieldCheck, ArrowRight, Check } from 'lucide-react';

export default function Onboarding() {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    // Check if terms were accepted when returning from privacy/terms pages
    if (localStorage.getItem('termsAccepted') === 'true') {
      setAccepted(true);
    }
  }, []);

  const handleStart = () => {
    if (!accepted) {
      alert("Para continuar, deves ler e aceitar os Termos e a Política de Privacidade.");
      return;
    }
    localStorage.setItem('hasSeenOnboarding', 'true');
    localStorage.setItem('termsAccepted', 'true');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col z-[100] pb-24 overflow-y-auto hide-scrollbar">
      {/* Header */}
      <header className="px-6 py-8 flex items-center justify-between sticky top-0 bg-background/50 backdrop-blur-xl z-20">
        <div className="flex items-center">
          <img src="/android-chrome-512x512.png" alt="Logo" className="w-11 h-11 object-contain" />
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/register')}
            className="px-5 py-2 text-zinc-400 text-[0.9375rem] font-bold hover:text-white transition-colors"
          >
            Registar
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 pt-10 pb-0 text-center flex flex-col items-center">
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[1.875rem] font-black leading-[1.2] mb-6 uppercase tracking-tighter"
        >
          <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
            Compre e venda produtos rápido com a nossa plataforma boladas
          </span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-white text-[1rem] leading-relaxed mb-3 max-w-sm px-4"
        >
          Conectamos vendedores e compradores em um só lugar. Venda mais rápido e se torne o mestre de vendas
        </motion.p>
      </section>

      {/* Description Sections (Icon + Text) */}
      <section className="px-8 mt-4 mb-16 flex flex-col gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex gap-[12px]"
        >
          <div className="flex-shrink-0 mt-1">
            <ShoppingBag className="w-7 h-7 text-white" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-white text-xl font-black uppercase tracking-tighter">Descobre e vende no teu feed</h2>
            <p className="text-white text-[1rem] leading-relaxed font-medium">
              Explora produtos à venda em Moçambique, encontra boas ofertas e conecta-te com vendedores reais. Publica os teus produtos, alcança mais pessoas e começa a vender de forma simples e rápida.
            </p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="flex gap-[12px]"
        >
          <div className="flex-shrink-0 mt-1">
            <Video className="w-7 h-7 text-white" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-white text-xl font-black uppercase tracking-tighter">Anuncia com vídeos e alcança mais clientes</h2>
            <p className="text-white text-[1rem] leading-relaxed font-medium">
              Cria anúncios em vídeo para mostrar os teus produtos de forma mais atrativa. Alcança pessoas em todo Moçambique e aumenta as tuas vendas com conteúdos que chamam atenção.
            </p>
            <div className="mt-1">
              <span className="text-primary font-bold text-[0.875rem] uppercase tracking-wider">Transforma visualizações em clientes</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Acceptance Status */}
      <section className="px-8 mt-4 mb-12">
        <div 
          className="flex items-start gap-4 p-4 bg-zinc-900/30 rounded-2xl border border-white/5"
        >
          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${accepted ? 'bg-primary border-primary' : 'border-zinc-700'}`}>
            {accepted && <Check className="text-black w-4 h-4" strokeWidth={4} />}
          </div>
          <p className="text-zinc-500 text-[0.875rem] leading-snug">
            {accepted ? (
              <span>Termos e Política de Privacidade aceites. Pode entrar.</span>
            ) : (
              <span>
                Para continuar, por favor leia e aceite os <Link to="/terms" onClick={(e) => e.stopPropagation()} className="text-white underline font-bold">Termos de Uso</Link> e a <Link to="/privacy" onClick={(e) => e.stopPropagation()} className="text-white underline font-bold">Política de Privacidade</Link>.
              </span>
            )}
          </p>
        </div>
      </section>

      {/* Start Button */}
      <div className="px-6 mb-12 flex justify-center">
        <motion.button 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={handleStart}
          className={`px-12 ${accepted ? 'bg-blue-600 hover:bg-blue-700' : 'bg-zinc-800 cursor-not-allowed opacity-50'} text-white font-black h-14 rounded-2xl flex items-center justify-center gap-3 text-[1rem] shadow-xl active:scale-95 transition-all`}
        >
          ENTRAR
          <ArrowRight className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Footer Area */}
      <footer className="px-8 mt-auto py-12 bg-zinc-900/40 border-t border-white/5 space-y-8">
        <div className="flex flex-col gap-4 text-center">
          <img src="/android-chrome-512x512.png" alt="Logo" className="w-10 h-10 object-contain mx-auto opacity-50" />
          <p className="text-zinc-600 text-[0.75rem] uppercase tracking-widest font-black">
            Boladas &copy; {new Date().getFullYear()}
          </p>
        </div>

        <div className="flex justify-center gap-8">
          <Link to="/terms" className="text-zinc-500 hover:text-white transition-colors uppercase tracking-[0.1em] text-[0.625rem] font-black">Termos</Link>
          <Link to="/privacy" className="text-zinc-500 hover:text-white transition-colors uppercase tracking-[0.1em] text-[0.625rem] font-black">Privacidade</Link>
        </div>
        
        <div className="flex justify-center">
          <button 
            onClick={handleStart}
            className="text-zinc-600 font-bold py-4 hover:text-white transition-colors uppercase tracking-[0.15em] text-[0.6875rem]"
          >
            Já tem conta? Clique aqui para entrar
          </button>
        </div>
      </footer>
    </div>
  );
}
