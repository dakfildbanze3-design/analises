import React, { useState, useEffect } from 'react';
import { Search, Loader2, ArrowLeft, Pin } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, getDoc, doc } from 'firebase/firestore';
import { formatRelativeTime } from '../lib/dateUtils';

const filterChips = ['Todas', 'Não Lidas'];

export default function ChatPage() {
  const navigate = useNavigate();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    const path = 'chats';
    try {
      const q = query(
        collection(db, path),
        where('participants', 'array-contains', uid),
        orderBy('updatedAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const chatsPromises = snapshot.docs.map(async (chatDoc) => {
          const data = chatDoc.data();
          
          // Skip chats deleted for current user
          if (data[`deleted_for_${uid}`]) return null;

          const otherUserId = data.participants.find((p: string) => p !== uid);
          
          let realName = data[`userName_${otherUserId}`] || 'Usuário';
          let realAvatar = data[`userAvatar_${otherUserId}`] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUserId}`;

          // Obter settings do chat (pinned)
          let pinned = false;
          try {
            const settingSnap = await getDoc(doc(db, 'chat_settings', `${chatDoc.id}_${uid}`));
            if (settingSnap.exists()) {
              pinned = !!settingSnap.data().pinned;
            }
          } catch(e) {}

          // Obter dados atualizados do utilizador
          if (otherUserId) {
            try {
              const userSnap = await getDoc(doc(db, 'users', otherUserId));
              if (userSnap.exists()) {
                const userData = userSnap.data();
                if (userData.displayName) realName = userData.displayName;
                if (userData.avatarUrl) realAvatar = userData.avatarUrl;
              }
            } catch (err) {
              console.warn("Erro ao carregar dados do user:", err);
            }
          }

          return {
            id: chatDoc.id,
            user: realName,
            lastMessage: data.lastMessage || 'Nova mensagem...',
            time: formatRelativeTime(data.updatedAt),
            lastSenderId: data.lastSenderId, // Captured to detect who sent last
            unread: (data[`unreadCount_${uid}`] || 0) > 0,
            unreadCount: data[`unreadCount_${uid}`] || 0,
            online: !!data.online,
            avatar: realAvatar,
            pinned: pinned,
            updatedAt: data.updatedAt?.toMillis() || 0
          };
        });
        
        const resolvedChats = (await Promise.all(chatsPromises)).filter(c => c !== null);
        
        // Custom sort: Pinned first, then by date
        const sortedChats = resolvedChats.sort((a: any, b: any) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return b.updatedAt - a.updatedAt;
        });

        setChats(sortedChats);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, path);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.warn("Firestore index error:", error);
      setLoading(false);
    }
  }, [auth.currentUser?.uid]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-20"
    >
      {/* Filter Chips (Header title and back button removed to rely on TopBar) */}
      <div className="p-4 pt-2 space-y-4">
        <div className="relative">
          <input 
            className="w-full bg-white/10 border-none rounded-[3px] py-1.5 pl-3 pr-8 text-xs focus:outline-none transition-all font-medium placeholder:text-white/20" 
            placeholder="Procurar conversas..." 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search size={16} strokeWidth={3} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60" />
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {filterChips.map((chip) => (
            <button 
              key={chip}
              onClick={() => setActiveFilter(chip)}
              className={`px-4 py-1.5 rounded-[3px] text-[0.6875rem] font-medium uppercase tracking-wider whitespace-nowrap transition-colors
                ${activeFilter === chip ? 'bg-white text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'}
              `}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Chat List */}
      <section className="flex flex-col px-4 pb-4">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : chats.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant flex flex-col items-center gap-2">
            <p className="text-[0.875rem] font-medium">Nenhuma mensagem encontrada.</p>
            <p className="text-[0.75rem]">As suas conversas ativas aparecerão aqui.</p>
          </div>
        ) : (
          (activeFilter === 'Não Lidas' ? chats.filter(c => c.unread) : chats)
          .filter(c => c.user.toLowerCase().includes(searchQuery.toLowerCase()) || (c.lastMessage && c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())))
          .map((chat) => (
            <div key={chat.id}>
              <div 
                onClick={() => navigate(`/chat/${chat.id}`)}
                className={`px-4 py-4 flex items-center gap-3 cursor-pointer transition-colors active:opacity-80
                ${chat.unread ? 'bg-surface-container-high' : 'bg-surface-container hover:bg-surface-container-high'}
              `}>
              <div className="relative flex-shrink-0">
                <img 
                  src={chat.avatar} 
                  alt={chat.user} 
                  className="w-14 h-14 rounded-full object-cover border border-white/5"
                  referrerPolicy="no-referrer"
                />
                {chat.online && (
                  <div className="absolute top-1 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-surface-container-high rounded-full"></div>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex justify-between items-baseline mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="text-[1rem] font-bold text-on-surface truncate">{chat.user}</h3>
                    {chat.pinned && <Pin size={12} className="text-blue-400 rotate-45 shrink-0" fill="currentColor" />}
                  </div>
                  <span className={`text-[0.65rem] uppercase ${chat.unread ? 'text-blue-400 font-bold' : 'text-on-surface-variant'}`}>{chat.time}</span>
                </div>
                <p className={`text-[0.85rem] truncate ${chat.unread ? 'text-on-surface font-medium' : 'text-on-surface-variant'}`}>
                  {chat.lastSenderId === auth.currentUser?.uid && <span className="font-bold opacity-70">Você: </span>}
                  {chat.lastMessage}
                </p>
              </div>
              
              {chat.unreadCount > 0 && (
                <div className="bg-blue-600 text-white text-[0.65rem] font-black min-w-[20px] h-[20px] px-1.5 flex items-center justify-center rounded-full">
                  {chat.unreadCount}
                </div>
              )}
            </div>
            <div className="h-[5px] bg-background"></div>
          </div>
          ))
        )}
      </section>
    </motion.div>
  );
}
