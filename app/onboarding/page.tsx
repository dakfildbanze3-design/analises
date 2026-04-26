'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingBag, Video, ArrowRight, Check } from 'lucide-react';

export default function Onboarding() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('termsAccepted') === 'true') setAccepted(true);
  }, []);

  const handleStart = () => {
    if (!accepted) {
      alert("Para continuar, aceda aos Termos e Política de Privacidade.");
      return;
    }
    localStorage.setItem('hasSeenOnboarding', 'true');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pt-12 pb-24 overflow-y-auto">
      <header className="px-6 py-6 flex items-center justify-between">
        <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-white/10">
          <span className="text-xl font-black text-primary italic">B</span>
        </div>
        {/*
        <img src="/android-chrome-512x512.png" alt="Logo" className="w-10 h-10 object-contain" />
        */}
        <button onClick={() => router.push('/register')} className="text-zinc-500 font-bold uppercase text-xs">Registar</button>
      </header>

      <section className="px-6 py-10 text-center">
        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-3xl font-black uppercase tracking-tighter leading-none mb-6">
          Compre e venda produtos rápido na boladas
        </motion.h1>
      </section>

      <section className="px-8 space-y-8 mb-12">
        <div className="flex gap-4">
          <ShoppingBag size={24} className="flex-shrink-0" />
          <div>
            <h2 className="text-xl font-black uppercase">Descobre o teu feed</h2>
            <p className="text-sm opacity-60">Explora produtos em Moçambique e conecta-te com vendedores reais.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <Video size={24} className="flex-shrink-0" />
          <div>
            <h2 className="text-xl font-black uppercase">Vídeos curtos</h2>
            <p className="text-sm opacity-60">Anuncia com vídeos para alcançar mais clientes de forma atrativa.</p>
          </div>
        </div>
      </section>

      <section className="px-8 mb-12">
        <div className={`p-4 rounded-[20px] flex gap-4 ${accepted ? 'bg-primary/20 border border-primary' : 'bg-surface-container'}`}>
           <Check size={20} className={accepted ? 'text-primary' : 'opacity-20'} />
           <p className="text-xs opacity-70">
            {accepted ? 'Termos aceites.' : <span>Leia os <Link href="/terms" className="underline font-bold">Termos</Link> e a <Link href="/privacy" className="underline font-bold">Privacidade</Link>.</span>}
           </p>
        </div>
      </section>

      <div className="px-8 mb-12 flex justify-center">
        <button onClick={handleStart} className={`w-full py-4 rounded-full font-black flex items-center justify-center gap-2 ${accepted ? 'bg-primary text-black' : 'bg-surface-container opacity-50'}`}>
          ENTRAR <ArrowRight size={20} />
        </button>
      </div>

      <footer className="mt-auto py-12 px-8 text-center space-y-4">
        <p className="text-[0.6rem] opacity-30 uppercase font-black tracking-widest">Boladas &copy; 2024</p>
        <div className="flex justify-center gap-6 text-[0.6rem] font-black uppercase opacity-50">
          <Link href="/terms">Termos</Link>
          <Link href="/privacy">Privacidade</Link>
        </div>
      </footer>
    </div>
  );
}
