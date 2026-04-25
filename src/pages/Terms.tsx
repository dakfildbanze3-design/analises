import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-zinc-300 pb-12">
      <header className="p-6 flex items-center gap-4 sticky top-0 bg-background/80 backdrop-blur-xl z-20">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-white font-black text-xl uppercase italic tracking-tighter">Termos de Uso</h1>
      </header>

      <div className="px-6 space-y-8 max-w-2xl mx-auto">
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 shadow-xl rounded-3xl p-8 border border-white/5"
        >
          <div className="flex flex-col gap-6">
            <div className="p-4 bg-blue-500/10 rounded-2xl w-fit">
              <span className="text-blue-400 font-bold text-lg">📄 1. Aceitação dos Termos</span>
            </div>
            <p className="leading-relaxed">
              Ao utilizar este aplicativo, você concorda plenamente com estes Termos de Uso. Se não concordar, por favor, não utilize a plataforma.
            </p>

            <div className="p-4 bg-blue-500/10 rounded-2xl w-fit">
              <span className="text-blue-400 font-bold text-lg">🚫 2. Regras da Plataforma</span>
            </div>
            <p className="leading-relaxed">
              É proibida a publicação de anúncios de produtos ilegais, ofensivos ou que violem os direitos de terceiros. Reservamo-nos o direito de remover qualquer conteúdo que não cumpra estas regras.
            </p>

            <div className="p-4 bg-blue-500/10 rounded-2xl w-fit">
              <span className="text-blue-400 font-bold text-lg">⚡ 3. Responsabilidade do Usuário</span>
            </div>
            <p className="leading-relaxed">
              O usuário é o único responsável pela veracidade das informações publicadas em seus anúncios e pelas negociações realizadas com terceiros.
            </p>

            <div className="p-4 bg-blue-500/10 rounded-2xl w-fit">
              <span className="text-blue-400 font-bold text-lg">🛡️ 4. Prevenção de Fraude</span>
            </div>
            <p className="leading-relaxed">
              A nossa plataforma proíbe qualquer tentativa de fraude ou atividade maliciosa. Contas envolvidas em atividades suspeitas serão suspensas imediatamente.
            </p>

            <div className="p-4 bg-blue-500/10 rounded-2xl w-fit">
              <span className="text-blue-400 font-bold text-lg">🛠️ 5. Modificações</span>
            </div>
            <p className="leading-relaxed">
              Reservamo-nos o direito de modificar o aplicativo ou estes termos a qualquer momento, sem aviso prévio. O uso continuado do aplicativo após tais alterações constitui aceitação dos novos termos.
            </p>
          </div>
        </motion.section>

        <div className="pt-8 pb-12 flex justify-center">
          <button
            onClick={() => {
              localStorage.setItem('termsAccepted', 'true');
              navigate('/onboarding');
            }}
            className="px-10 bg-primary hover:bg-primary-dark text-black font-black h-14 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-primary/20 active:scale-95 transition-all uppercase tracking-widest text-sm"
          >
            Li e Aceito (Continuar)
          </button>
        </div>
      </div>
    </div>
  );
}
