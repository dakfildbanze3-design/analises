'use client';

import React, { useState, useEffect } from 'react';
import { User, Mail, Bell, EyeOff, Shield, CreditCard, History, HelpCircle, FileText, LogOut, ChevronRight, Search, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '@/src/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

import PersonalInfo from '@/src/components/settings/PersonalInfo';
import { EmailPhoneSettings, SecuritySettings, PaymentSettings, HelpSupportSettings } from '@/src/components/settings/SettingsViews';

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
  const router = useRouter();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) return;
      
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          setProfile(data);
          setSettings(prev => ({ ...prev, invisibleProfile: data.profile_hidden || false }));
        }

        const settingsSnap = await getDoc(doc(db, 'notification_settings', user.uid));
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setSettings(prev => ({ ...prev, pushNotifications: data.pushEnabled ?? true, ...data }));
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [activeView]);

  const handleToggle = async (id: string, value: boolean) => {
    if (!auth.currentUser) return;
    setSettings(prev => ({ ...prev, [id]: value }));
    try {
      if (id === 'invisibleProfile') {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          profile_hidden: value,
          updatedAt: serverTimestamp()
        });
      } else if (id === 'pushNotifications') {
        await setDoc(doc(db, 'notification_settings', auth.currentUser.uid), {
          user_id: auth.currentUser.uid,
          pushEnabled: value,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div className="min-h-screen pt-12 flex items-center justify-center"><Loader2 size={32} className="animate-spin" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-12 pb-20 bg-background min-h-screen">
      <section className="px-0 mb-[5px]">
        <div className="bg-surface-container p-4 flex items-center gap-4">
          <img className="w-12 h-12 rounded-[3px] object-cover" src={profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.currentUser?.uid}`} />
          <div>
            <h2 className="font-bold text-sm uppercase">{profile?.displayName || 'Usuário'}</h2>
            <p className="text-[0.6875rem] opacity-50 uppercase">Membro Boladas</p>
          </div>
        </div>
      </section>

      {sections.map((section) => (
        <div key={section.title}>
          <div className="bg-surface-container-high py-1 px-4 mb-[1px]">
            <span className="text-[0.6875rem] font-bold text-on-surface-variant uppercase tracking-widest">{section.title}</span>
          </div>
          <section className="flex flex-col gap-[1px]">
            {section.items.map((item) => (
              <div key={item.label} onClick={() => {
                if (item.hasSwitch) return;
                if (item.id === 'terms') {
                   router.push('/terms');
                   return;
                }
                setActiveView(item.id);
              }} className="bg-surface-container px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <item.icon size={20} />
                  <span className="text-[0.75rem] font-medium uppercase">{item.label}</span>
                </div>
                {item.hasChevron && <ChevronRight size={18} />}
                {item.hasSwitch && (
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settings[item.id] ?? item.defaultChecked} onChange={(e) => handleToggle(item.id!, e.target.checked)} className="sr-only peer" />
                    <div className="w-8 h-4 bg-zinc-700 rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-full"></div>
                  </label>
                )}
              </div>
            ))}
          </section>
        </div>
      ))}

      <div className="px-4 mt-8">
        <button onClick={handleLogout} className="w-full bg-surface-container text-red-500 font-black py-3 rounded-full uppercase text-xs">Terminar Sessão</button>
      </div>

      <AnimatePresence>
        {activeView === 'personalInfo' && <PersonalInfo onClose={() => setActiveView(null)} />}
        {activeView === 'emailPhone' && <EmailPhoneSettings onClose={() => setActiveView(null)} />}
        {activeView === 'security' && <SecuritySettings onClose={() => setActiveView(null)} />}
        {activeView === 'payments' && <PaymentSettings onClose={() => setActiveView(null)} />}
        {activeView === 'transactions' && <PaymentSettings onClose={() => setActiveView(null)} />}
        {activeView === 'support' && <HelpSupportSettings onClose={() => setActiveView(null)} />}
      </AnimatePresence>
    </motion.div>
  );
}
