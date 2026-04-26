'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import { auth, googleProvider } from '@/src/lib/firebase';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { GoogleIcon } from '@/components/icons/GoogleIcon';

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push('/profile-setup');
    } catch (error: any) {
      alert('Erro ao criar conta: ' + error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      router.push('/profile-setup');
    } catch (error: any) {
      alert('Erro com Google: ' + error.message);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen bg-background px-6 py-8 flex flex-col"
    >
      <div className="flex-1 flex flex-col justify-center items-center text-center">
        <div className="w-16 h-16 mb-6 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/10">
          <span className="text-2xl font-black text-primary italic">B</span>
        </div>
        {/*
        <img 
          src="/android-chrome-512x512.png" 
          alt="Logo" 
          className="w-16 h-16 mb-6 object-contain"
        />
        */}
        <h1 className="text-[2rem] font-black uppercase tracking-tighter mb-2">Criar Conta</h1>
        <p className="text-on-surface-variant text-[0.875rem] mb-8 max-w-[280px]">
          Junta-te à maior comunidade de boladas em Moçambique.
        </p>

        <form onSubmit={handleRegister} className="space-y-4 mb-8 w-full text-left">
          <div>
            <label className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
              Email
            </label>
            <input 
              type="email" 
              placeholder="O teu melhor email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-[3px] px-4 py-3.5 text-[0.875rem] focus:ring-2 focus:ring-primary outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
              Senha
            </label>
            <input 
              type="password" 
              placeholder="Cria uma senha forte"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-[3px] px-4 py-3.5 text-[0.875rem] focus:ring-2 focus:ring-primary outline-none transition-all"
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full shiny-button text-white py-4 rounded-full font-black uppercase tracking-[0.2em] text-[0.875rem] shadow-2xl mt-4"
          >
            Começar Agora
          </button>
        </form>

        <div className="relative flex items-center justify-center mb-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-outline-variant/20"></div>
          </div>
          <span className="relative bg-background px-4 text-[0.75rem] text-on-surface-variant uppercase tracking-widest font-bold">
            Ou
          </span>
        </div>

        <button 
          type="button"
          onClick={handleGoogleLogin}
          className="w-full bg-surface-container-low text-on-surface py-3.5 rounded-[3px] font-bold text-[0.875rem] flex items-center justify-center gap-3 active:scale-[0.98] transition-all border border-outline-variant/10 hover:bg-surface-container-high"
        >
          <GoogleIcon />
          Registar com Google
        </button>

        <p className="text-center mt-auto pt-8 text-[0.875rem] text-on-surface-variant">
          Já tens uma conta?{' '}
          <Link href="/login" className="text-primary font-bold hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
