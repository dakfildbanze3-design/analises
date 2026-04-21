import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Check, Lock, Loader2, Smartphone, Shield, AlertTriangle } from 'lucide-react';
import { auth, handleFirestoreError, OperationType } from '../../lib/firebase';
import { updatePassword, updateEmail } from 'firebase/auth';

const FullScreenOverlay: React.FC<{ title: string, onClose: () => void, children: React.ReactNode }> = ({ title, onClose, children }) => (
  <motion.div 
    initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    className="fixed inset-0 z-50 bg-background overflow-y-auto"
  >
    <div className="sticky top-0 bg-background/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-outline-variant/10 z-10">
      <button onClick={onClose} className="p-2 border border-outline-variant/20 rounded-full text-on-surface hover:bg-surface-container transition-colors">
        <ArrowLeft size={20} />
      </button>
      <h2 className="text-[0.875rem] font-bold text-on-surface uppercase tracking-widest">{title}</h2>
      <div className="w-9" />
    </div>
    <div className="p-6">
      {children}
    </div>
  </motion.div>
);

export const EmailPhoneSettings: React.FC<{ onClose: () => void }> = ({ onClose }) => {

  const [email, setEmail] = useState(auth.currentUser?.email || '');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      if (email !== auth.currentUser.email) {
        await updateEmail(auth.currentUser, email);
      }
      // Firebase phone Auth needs recaptcha, so we mock saving it or use user custom claims
      alert('Dados de contacto atualizados! Para o e-mail verifique a sua caixa de entrada.');
      onClose();
    } catch (e: any) {
      if (e.code === 'auth/requires-recent-login') {
        alert('Por segurança corporativa, você precisa refazer o login para alterar estes dados sensíveis.');
      } else {
        alert('Erro: ' + e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <FullScreenOverlay title="E-mail e Telefone" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant block mb-1">E-mail</label>
          <input 
            type="email" className="w-full bg-surface-container p-3 rounded-[3px] text-[0.875rem] border border-outline-variant/10 focus:border-primary outline-none"
            value={email} onChange={e => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant block mb-1">Telefone / WhatsApp</label>
          <input 
            className="w-full bg-surface-container p-3 rounded-[3px] text-[0.875rem] border border-outline-variant/10 focus:border-primary outline-none"
            value={phone} onChange={e => setPhone(e.target.value)} placeholder="+258 8X XXX XXXX"
          />
        </div>
      </div>
      <button onClick={handleSave} disabled={loading} className="w-full mt-8 bg-blue-900 text-white font-black text-[0.875rem] uppercase tracking-widest py-4 flex items-center justify-center gap-2">
        {loading ? <Loader2 className="animate-spin" /> : 'Atualizar Dados'}
      </button>
    </FullScreenOverlay>
  );
}

export const SecuritySettings: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!auth.currentUser || !password) return;
    setLoading(true);
    try {
      await updatePassword(auth.currentUser, password);
      alert('Senha atualizada com sucesso!');
      setPassword('');
      onClose();
    } catch (e: any) {
       if (e.code === 'auth/requires-recent-login') {
        alert('Por segurança, você precisa refazer o login para alterar sua senha.');
      } else {
        alert('Erro: ' + e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <FullScreenOverlay title="Segurança de Dados" onClose={onClose}>
      <div className="space-y-8">
        <div>
          <h3 className="text-[0.875rem] font-bold uppercase mb-4 flex items-center gap-2"><Lock size={18} /> Alterar Senha</h3>
          <input 
            type="password" placeholder="Nova palavra-passe"
            className="w-full bg-surface-container p-3 rounded-[3px] text-[0.875rem] border border-outline-variant/10 focus:border-primary outline-none mb-3"
            value={password} onChange={e => setPassword(e.target.value)}
          />
          <button onClick={handleChangePassword} disabled={loading || !password} className="w-full bg-surface-container-highest text-on-surface font-bold text-[0.75rem] py-3 uppercase">
            {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Atualizar Senha'}
          </button>
        </div>

        <div className="border-t border-outline-variant/10 pt-8">
          <h3 className="text-[0.875rem] font-bold uppercase mb-4">Sessões Ativas</h3>
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-[3px] p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Smartphone className="text-primary" size={24} />
              <div>
                <p className="text-[0.875rem] font-bold text-on-surface">Este Dispositivo</p>
                <p className="text-[0.625rem] text-on-surface-variant uppercase">Maputo, Moçambique • Agora</p>
              </div>
            </div>
            <span className="text-[0.625rem] px-2 py-1 bg-primary/10 text-primary font-bold uppercase rounded-[2px]">Ativo</span>
          </div>
        </div>

        <button className="w-full mt-4 border border-error/50 text-error bg-error/5 font-black text-[0.75rem] uppercase tracking-widest py-3 flex items-center justify-center gap-2">
          Terminar Sessão em Todos
        </button>
      </div>
    </FullScreenOverlay>
  );
}

export const PaymentSettings: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <FullScreenOverlay title="Pagamentos" onClose={onClose}>
      <div className="text-center py-10 opacity-50">
        <AlertTriangle size={32} className="mx-auto mb-4" />
        <h3 className="font-bold text-[0.875rem] uppercase mb-2">Sem Métodos Adicionados</h3>
        <p className="text-[0.75rem]">Atualmente o Boladas utiliza transações M-Pesa integradas por meio de contato direto. Módulo de carteira Boladas em breve.</p>
      </div>
    </FullScreenOverlay>
  );
}

export const HelpSupportSettings: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const handleSupportClick = () => {
    const message = encodeURIComponent("Olá, preciso de suporte com o aplicativo Boladas.");
    window.open(`https://wa.me/258855767005?text=${message}`, '_blank');
  };

  const handleBugReportClick = () => {
    const message = encodeURIComponent("Olá, encontrei um bug no aplicativo Boladas: ");
    window.open(`https://wa.me/258855767005?text=${message}`, '_blank');
  };

  return (
    <FullScreenOverlay title="Ajuda e Suporte" onClose={onClose}>
       <div className="space-y-6">
        <div className="text-center py-6">
          <Shield size={48} className="mx-auto mb-4 text-primary opacity-20" />
          <h3 className="font-bold text-[1.125rem] text-white uppercase tracking-tight">Como podemos ajudar?</h3>
          <p className="text-[0.875rem] text-zinc-400 mt-2">Escolha uma das opções abaixo para entrar em contato com a nossa equipa.</p>
        </div>

        <div className="grid gap-3">
          <button 
            onClick={handleSupportClick}
            className="w-full flex items-center justify-between p-4 bg-zinc-800/50 border border-white/5 rounded-2xl hover:bg-zinc-800 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400 group-hover:scale-110 transition-transform">
                <Smartphone size={24} />
              </div>
              <div className="text-left">
                <p className="font-bold text-white uppercase text-sm">Suporte via WhatsApp</p>
                <p className="text-xs text-zinc-500 uppercase tracking-widest mt-0.5">Atendimento Direto</p>
              </div>
            </div>
          </button>

          <button 
            onClick={handleBugReportClick}
            className="w-full flex items-center justify-between p-4 bg-zinc-800/50 border border-white/5 rounded-2xl hover:bg-zinc-800 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                <AlertTriangle size={24} />
              </div>
              <div className="text-left">
                <p className="font-bold text-white uppercase text-sm">Informar Bugs</p>
                <p className="text-xs text-zinc-500 uppercase tracking-widest mt-0.5">Reportar Erro Técnico</p>
              </div>
            </div>
          </button>
        </div>

        <div className="p-6 bg-blue-900/10 border border-blue-500/20 rounded-2xl">
          <p className="text-xs text-blue-400 leading-relaxed font-medium uppercase tracking-tight text-center">
            O nosso tempo médio de resposta é de menos de 1 hora durante o horário comercial.
          </p>
        </div>
      </div>
    </FullScreenOverlay>
  );
}
