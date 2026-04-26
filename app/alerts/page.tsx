'use client';

import React, { useState, useEffect } from 'react';
import { Heart, MessageSquare, UserPlus, Loader2, CheckCircle2, Tag, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { auth } from '@/src/lib/firebase';
import { notificationService, AppNotification } from '@/src/services/notificationService';
import { useRouter } from 'next/navigation';
import { formatRelativeTime } from '@/src/lib/dateUtils';

export default function AlertsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const filterChips = ['Todas', 'Não Lidas'];

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    const unsubscribe = notificationService.subscribeToNotifications(
      uid,
      (notifs) => {
        setNotifications(notifs);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleMarkAsRead = async (id: string, postId?: string) => {
    await notificationService.markAsRead(id);
    if (postId) {
      router.push(`/short/${postId}`);
    }
  };

  const handleMarkAllRead = async () => {
    if (auth.currentUser) {
      await notificationService.markAllAsRead(auth.currentUser.uid);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart size={18} className="text-red-500 fill-red-500" />;
      case 'comment': return <MessageSquare size={18} className="text-blue-500" />;
      case 'follow': return <UserPlus size={18} className="text-green-500" />;
      case 'post': return <Tag size={18} className="text-purple-500" />;
      default: return <Heart size={18} />;
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-20 min-h-screen bg-background pt-12">
      <div className="px-4 py-4 space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-lg font-black uppercase tracking-tight italic">Alertas</h2>
            <button onClick={handleMarkAllRead} className="text-white/60 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">Marcar tudo lido</button>
        </div>
        
        <div className="flex gap-2">
          {filterChips.map((chip) => (
            <button key={chip} onClick={() => setActiveFilter(chip)} className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${activeFilter === chip ? 'bg-primary text-black' : 'bg-surface-container text-white/70'}`}>
              {chip}
            </button>
          ))}
        </div>

        <div className="relative">
          <input className="w-full bg-surface-container rounded-full py-2 pl-9 pr-4 text-xs font-bold" placeholder="Buscar alertas..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
        </div>
      </div>

      <div className="flex flex-col">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 size={32} className="animate-spin text-primary" /></div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center opacity-50">Sem notificações.</div>
        ) : (
          (activeFilter === 'Não Lidas' ? notifications.filter(n => !n.read) : notifications)
          .filter(n => {
            const userName = (n as any).fromUserName || 'Alguém';
            return userName.toLowerCase().includes(searchQuery.toLowerCase()) || n.text.toLowerCase().includes(searchQuery.toLowerCase());
          })
          .map((notif) => (
            <div key={notif.id} onClick={() => handleMarkAsRead(notif.id, notif.postId)} className={`p-4 flex gap-3 items-center cursor-pointer mb-1 rounded-[12px] mx-4 ${notif.read ? 'bg-transparent opacity-60' : 'bg-surface-container border-l-4 border-primary'}`}>
              <div className="relative flex-shrink-0">
                <img src={(notif as any).fromUserAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${notif.fromUserId}`} className="w-12 h-12 rounded-full object-cover" />
                <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border border-white/10">{getIcon(notif.type)}</div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[0.875rem] leading-snug"><span className="font-black">{(notif as any).fromUserName || 'Alguém'}</span> {notif.text}</p>
                <div className="text-[0.625rem] opacity-50 mt-1 uppercase font-bold">{formatRelativeTime(notif.createdAt)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
