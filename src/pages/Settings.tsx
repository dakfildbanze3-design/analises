import React, { useState, useEffect } from 'react';
import { User, Mail, Bell, EyeOff, Shield, CreditCard, History, HelpCircle, FileText, LogOut, ChevronRight, Search, Verified, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

import PersonalInfo from '../components/settings/PersonalInfo';
import { EmailPhoneSettings, SecuritySettings, PaymentSettings, HelpSupportSettings } from '../components/settings/SettingsViews';

const sections = [
  {
    title: 'Conta',
    items: [
      { id: 'personalInfo', icon: User, label: 'Informações Pessoais', hasChevron: true },
      { id: 'emailPhone', icon: Mail, label: 'E-mail e Telefone', hasChevron: true },
      { id: 'pushNotifications', icon: Bell, label: 'Notificações Push', hasSwitch: true, defaultChecked: true },
    ]
  },
  {
    title: 'Privacidade',
    items: [
      { id: 'invisibleProfile', icon: EyeOff, label: 'Perfil Invisível', hasSwitch: true, defaultChecked: false },
      { id: 'security', icon: Shield, label: 'Segurança de Dados', hasChevron: true },
    ]
  },
  {
    title: 'Pagamentos',
    items: [
      { id: 'payments', icon: CreditCard, label: 'Métodos de Pagamento', hasChevron: true },
      { id: 'transactions', icon: History, label: 'Histórico de Transações', hasChevron: true },
    ]
  },
  {
    title: 'Ajuda',
    items: [
      { id: 'support', icon: HelpCircle, label: 'Central de Suporte', hasChevron: true },
      { id: 'terms', icon: FileText, label: 'Termos de Serviço', hasExternal: true },
    ]
  }
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;
      
      try {
        // Fetch User Profile for header
        const userPath = `users/${auth.currentUser.uid}`;
        try {
          const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userSnap.exists()) {
            const data = userSnap.data();
            setProfile(data);
            // Sync settings with profile data
            setSettings(prev => ({ ...prev, invisibleProfile: data.profile_hidden || false }));
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, userPath);
        }

        // Fetch User Settings (Notifications)
        const settingsPath = `notification_settings/${auth.currentUser.uid}`;
        try {
          const settingsSnap = await getDoc(doc(db, 'notification_settings', auth.currentUser.uid));
          if (settingsSnap.exists()) {
            const data = settingsSnap.data();
            setSettings(prev => ({ ...prev, pushNotifications: data.pushEnabled ?? true, ...data }));
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, settingsPath);
        }
      } catch (error) {
        console.error("Error fetching settings data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [activeView]); // Refetch when views close to catch updates

  const handleToggle = async (id: string, value: boolean) => {
    if (!auth.currentUser) return;
    
    // Optimistic UI update
    setSettings(prev => ({ ...prev, [id]: value }));

    try {
      if (id === 'invisibleProfile') {
        // According to user spec: users -> profile_hidden boolean
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          profile_hidden: value,
          updatedAt: serverTimestamp()
        });
      } else if (id === 'pushNotifications') {
        await setDoc(doc(db, 'notification_settings', auth.currentUser.uid), {
          user_id: auth.currentUser.uid,
          pushEnabled: value,
          likes: value,
          comments: value,
          followers: value,
          messages: value,
          promotions: value,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (err) {
      setSettings(prev => ({ ...prev, [id]: !value }));
      alert('Erro ao atualizar. Tente novamente.');
      console.error(err);
    }
  };

  const handleItemClick = (item: any) => {
    if (item.hasSwitch) {
      // Switches handle their own click via the onChange in the input
      return;
    }
    if (item.hasExternal) {
      alert("A abrir link externo...");
      return;
    }
    if (item.id) {
      setActiveView(item.id);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Erro ao terminar sessão:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-12 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-zinc-800" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-12 pb-20"
    >
      {/* Profile Header Summary */}
      <section className="px-0 mb-[5px]">
        <div className="bg-surface-container-low p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-[3px] overflow-hidden bg-surface-container-highest flex-shrink-0 relative">
            <img 
              className="w-full h-full object-cover" 
              src={profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.currentUser?.uid}`} 
              referrerPolicy="no-referrer"
              alt="Avatar"
            />
          </div>
          <div>
            <h2 className="font-bold text-sm text-on-surface uppercase tracking-tight">{profile?.displayName || 'Usuário'}</h2>
            <p className="text-[0.6875rem] text-on-surface-variant uppercase">Membro Boladas</p>
          </div>
        </div>
      </section>

      {/* Search Bar */}
      <section className="bg-surface-container px-4 py-2 mb-[5px]">
        <div className="bg-surface-container-low rounded-[3px] flex items-center px-3 py-1.5 focus-within:ring-1 focus-within:ring-primary/30 transition-all">
          <Search size={18} className="text-outline" />
          <input 
            className="bg-transparent border-none focus:ring-0 w-full text-[0.75rem] text-on-surface placeholder:text-outline-variant uppercase ml-2" 
            placeholder="BUSCAR CONFIGURAÇÕES" 
            type="text"
          />
        </div>
      </section>

      {/* Settings Sections */}
      {sections.map((section) => (
        <div key={section.title}>
          <div className="bg-surface-container-high py-1 px-4 mb-[5px]">
            <span className="text-[0.6875rem] font-bold text-on-surface-variant uppercase tracking-widest">{section.title}</span>
          </div>
          <section className="flex flex-col gap-[5px]">
            {section.items.map((item) => (
              <div 
                key={item.label}
                onClick={() => handleItemClick(item)}
                className="bg-surface-container px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-surface-container-high transition-colors"
              >
                <div className="flex items-center gap-3">
                  <item.icon size={20} className="text-on-surface-variant" />
                  <span className="text-[0.75rem] font-medium uppercase tracking-tight">{item.label}</span>
                </div>
                {item.hasChevron && <ChevronRight size={18} className="text-outline-variant" />}
                {item.hasExternal && <LogOut size={16} className="text-outline-variant rotate-[-45deg]" />}
                {item.hasSwitch && item.id && (
                  <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={settings[item.id] ?? item.defaultChecked} 
                      onChange={(e) => handleToggle(item.id!, e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-8 h-4 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-surface after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary-container"></div>
                  </label>
                )}
              </div>
            ))}
          </section>
        </div>
      ))}

      {/* Logout Action */}
      <section className="mt-8 px-4">
        <button 
          onClick={handleLogout}
          className="w-full bg-surface-container-highest text-error font-bold text-[0.75rem] py-2 uppercase tracking-tighter hover:bg-error/10 transition-colors border border-error/20"
        >
          Terminar Sessão
        </button>
        <p className="text-center text-[0.6rem] text-outline-variant mt-4 uppercase tracking-[0.2em] opacity-40">Boladas Digital Infrastructure © 2024</p>
      </section>

      <AnimatePresence>
        {activeView === 'personalInfo' && <PersonalInfo key="personalInfo" onClose={() => setActiveView(null)} />}
        {activeView === 'emailPhone' && <EmailPhoneSettings key="emailPhone" onClose={() => setActiveView(null)} />}
        {activeView === 'security' && <SecuritySettings key="security" onClose={() => setActiveView(null)} />}
        {activeView === 'payments' && <PaymentSettings key="payments" onClose={() => setActiveView(null)} />}
        {activeView === 'transactions' && <PaymentSettings key="transactions" onClose={() => setActiveView(null)} />}
        {activeView === 'support' && <HelpSupportSettings key="support" onClose={() => setActiveView(null)} />}
      </AnimatePresence>
    </motion.div>
  );
}
