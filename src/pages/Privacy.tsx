import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-zinc-300 pb-12">
      <header className="p-6 flex items-center gap-4 sticky top-0 bg-background/80 backdrop-blur-xl z-20">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-white font-black text-xl uppercase italic tracking-tighter">Política de Privacidade</h1>
      </header>

      <div className="px-6 space-y-8 max-w-2xl mx-auto">
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 shadow-xl rounded-3xl p-8 border border-white/5"
        >
          <div className="flex flex-col gap-6">
            <div className="p-4 bg-primary/10 rounded-2xl w-fit">
              <span className="text-primary font-bold text-lg">🔐 1. Informações que Recolhemos</span>
            </div>
            <p className="leading-relaxed">
              Este aplicativo recolhe informações como nome, email e conteúdos publicados pelos usuários para melhorar a experiência e permitir funcionalidades como login e publicação de anúncios.
            </p>
            
            <div className="p-4 bg-primary/10 rounded-2xl w-fit">
              <span className="text-primary font-bold text-lg">💡 2. Como Usamos os Dados</span>
            </div>
            <div className="leading-relaxed">
              Os dados são usados para:
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li>Permitir o acesso à conta (Login/Registo)</li>
                <li>Exibir anúncios e conectar vendedores e compradores</li>
                <li>Enviar notificações relevantes sobre a sua conta</li>
                <li>Melhorar a segurança e prevenir fraudes</li>
              </ul>
            </div>

            <div className="p-4 bg-primary/10 rounded-2xl w-fit">
              <span className="text-primary font-bold text-lg">🛡️ 3. Compartilhamento de Dados</span>
            </div>
            <p className="leading-relaxed">
              Os seus dados são armazenados de forma segura e não são vendidos a terceiros. Podemos usar serviços como Firebase (Google) para autenticação e armazenamento de dados em nuvem.
            </p>

            <div className="p-4 bg-primary/10 rounded-2xl w-fit">
              <span className="text-primary font-bold text-lg">🗑️ 4. Eliminação de Conta</span>
            </div>
            <p className="leading-relaxed">
              O usuário pode solicitar a exclusão da sua conta a qualquer momento através das definições do perfil ou enviando um email para o nosso suporte. Ao eliminar a conta, todos os seus dados pessoais serão removidos dos nossos servidores ativos.
            </p>

            <div className="p-4 bg-primary/10 rounded-2xl w-fit">
              <span className="text-primary font-bold text-lg">📧 5. Contacto</span>
            </div>
            <p className="leading-relaxed">
              Se tiver dúvidas sobre esta política, pode contactar-nos através do suporte oficial do aplicativo.
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
