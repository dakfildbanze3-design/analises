'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background pt-12 pb-20">
      <header className="fixed top-0 left-0 right-0 h-14 bg-surface px-4 flex items-center gap-3 z-50">
        <button onClick={() => router.back()}><ArrowLeft size={20} /></button>
        <h1 className="text-sm font-black uppercase italic">Termos de Uso</h1>
      </header>

      <div className="px-6 py-6 space-y-8 max-w-2xl mx-auto">
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-surface-container rounded-[20px] p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-primary font-bold mb-2">1. Aceitação dos Termos</h2>
              <p className="text-sm opacity-70">Ao utilizar este aplicativo, você concorda plenamente com estes Termos de Uso.</p>
            </div>
            <div>
              <h2 className="text-primary font-bold mb-2">2. Regras da Plataforma</h2>
              <p className="text-sm opacity-70">É proibida a publicação de anúncios de produtos ilegais, ofensivos ou que violem os direitos de terceiros.</p>
            </div>
            <div>
              <h2 className="text-primary font-bold mb-2">3. Prevenção de Fraude</h2>
              <p className="text-sm opacity-70">Contas envolvidas em atividades suspeitas serão suspensas imediatamente.</p>
            </div>
          </div>
        </motion.section>

        <button onClick={() => router.push('/')} className="w-full bg-primary text-black font-black py-4 rounded-full uppercase text-sm">Li e Aceito</button>
      </div>
    </div>
  );
}
