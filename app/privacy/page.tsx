'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background pt-12 pb-20">
      <header className="fixed top-0 left-0 right-0 h-14 bg-surface px-4 flex items-center gap-3 z-50">
        <button onClick={() => router.back()}><ArrowLeft size={20} /></button>
        <h1 className="text-sm font-black uppercase italic">Política de Privacidade</h1>
      </header>

      <div className="px-6 py-6 space-y-8 max-w-2xl mx-auto">
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-surface-container rounded-[20px] p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-primary font-bold mb-2">1. Informações que Recolhemos</h2>
              <p className="text-sm opacity-70">Este aplicativo recolhe informações como nome, email e conteúdos publicados para melhorar a experiência.</p>
            </div>
            <div>
              <h2 className="text-primary font-bold mb-2">2. Como Usamos os Dados</h2>
              <ul className="text-sm opacity-70 list-disc ml-4 space-y-1">
                <li>Acesso à conta</li>
                <li>Exibir anúncios</li>
                <li>Notificações</li>
              </ul>
            </div>
            <div>
              <h2 className="text-primary font-bold mb-2">3. Eliminação de Conta</h2>
              <p className="text-sm opacity-70">Pode solicitar a exclusão da conta a qualquer momento.</p>
            </div>
          </div>
        </motion.section>

        <button onClick={() => router.push('/')} className="w-full bg-primary text-black font-black py-4 rounded-full uppercase text-sm">Li e Aceito</button>
      </div>
    </div>
  );
}
