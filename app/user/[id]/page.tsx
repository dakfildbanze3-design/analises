'use client';

import React, { useState, useEffect } from 'react';
import { Share2, Heart, Star, Loader2, ArrowLeft } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'motion/react';
import { db, auth } from '@/src/lib/firebase';
import { doc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { chatService } from '@/src/services/chatService';
import { checkIsFollowing, followUser, unfollowUser } from '@/src/services/followService';

export default function PublicProfile() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [user, setUser] = useState<any>(null);
  const [userProducts, setUserProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'users', id), (docSnap) => {
      if (docSnap.exists()) setUser(docSnap.data());
      setLoading(false);
    });
    const fetchProducts = async () => {
      try {
        const q = query(collection(db, 'products'), where('sellerId', '==', id));
        const pSnap = await getDocs(q);
        setUserProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) { console.error(error); }
    };
    fetchProducts();
    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (id && auth.currentUser) {
      checkIsFollowing(auth.currentUser.uid, id).then(setIsFollowing);
    }
  }, [id]);

  const handleMessageClick = async () => {
    if (!auth.currentUser) { router.push('/login'); return; }
    try {
      const chatId = await chatService.getOrCreateChat(id, user?.displayName || 'Vendedor', user?.avatarUrl);
      router.push(`/chat/${chatId}`);
    } catch (error: any) { alert(error.message); }
  };

  const handleFollowToggle = async () => {
    if (!auth.currentUser) { router.push('/login'); return; }
    if (id === auth.currentUser.uid) return;
    setFollowLoading(true);
    const prev = isFollowing;
    setIsFollowing(!isFollowing);
    try {
      if (prev) await unfollowUser(id);
      else await followUser(id);
    } catch (error) { setIsFollowing(prev); }
    finally { setFollowLoading(false); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center pt-12"><Loader2 className="animate-spin" /></div>;
  if (!user) return <div className="h-screen flex flex-col items-center justify-center pt-12">Usuário não encontrado.</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-20 bg-background min-h-screen pt-12">
      <section className="relative w-full">
        <div className="h-32 w-full bg-zinc-800"><img src={user.coverUrl} className="w-full h-full object-cover opacity-50" /></div>
        <div className="px-4 -mt-12 relative z-10 flex justify-between items-end">
          <img src={user.avatarUrl} className="w-24 h-24 object-cover rounded-[12px] border-4 border-background" />
          <div className="flex gap-2">
            {auth.currentUser?.uid !== id && (
              <>
                <button onClick={handleFollowToggle} disabled={followLoading} className={`px-4 py-1.5 rounded-full text-xs font-black uppercase ${isFollowing ? 'bg-zinc-700' : 'bg-primary text-black'}`}>{isFollowing ? 'Seguindo' : 'Seguir'}</button>
                <button onClick={handleMessageClick} className="bg-surface-container px-4 py-1.5 rounded-full text-xs font-black uppercase">Mensagem</button>
              </>
            )}
          </div>
        </div>
        <div className="px-4 mt-2">
          <h1 className="text-xl font-black uppercase">{user.displayName}</h1>
          <p className="text-xs opacity-50 font-bold uppercase">@{user.displayName?.toLowerCase().replace(/\s+/g, '')}</p>
          <p className="text-sm mt-2 opacity-80">{user.bio || 'Sem biografia.'}</p>
        </div>
      </section>

      <section className="px-4 mt-6">
        <h3 className="text-xs font-black uppercase border-b border-white pb-1 w-fit mb-4">Produtos</h3>
        <div className="grid grid-cols-2 gap-4">
          {userProducts.map((p) => (
            <div key={p.id} onClick={() => router.push(`/product/${p.id}`)} className="bg-surface-container rounded-[12px] overflow-hidden">
               <img src={p.images?.[0]} className="aspect-square object-cover" />
               <div className="p-3">
                <h4 className="text-sm font-bold truncate">{p.name}</h4>
                <p className="text-sm font-black">{p.price} MT</p>
               </div>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
