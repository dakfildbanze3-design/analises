'use client';

import React, { useState, useEffect } from 'react';
import { Verified, Grid, PlusCircle, Loader2, LogOut, Video, ShoppingBag, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { auth, db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { signOut, onAuthStateChanged } from 'firebase/auth';

export default function ProfilePage() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'photos' | 'videos'>('photos');

  useEffect(() => {
    const fetchProfileData = async (user: any) => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }

        const q = query(collection(db, 'products'), where('sellerId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        setMyProducts(productsData);

        const followersQ = query(collection(db, 'follows'), where('followingId', '==', user.uid));
        const followersSnapshot = await getDocs(followersQ);
        setFollowerCount(followersSnapshot.size);

        const followingQ = query(collection(db, 'follows'), where('followerId', '==', user.uid));
        const followingSnapshot = await getDocs(followingQ);
        setFollowingCount(followingSnapshot.size);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchProfileData(user);
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    if (!window.confirm("Tens a certeza que queres eliminar este post?")) return;

    try {
      await deleteDoc(doc(db, 'products', productId));
      setMyProducts(prev => prev.filter(p => p.id !== productId));
    } catch (error) {
      console.error(error);
    }
  };

  const videoProducts = myProducts.filter(p => p.videoUrl || p.productType === 'short');
  const photoProducts = myProducts.filter(p => !p.videoUrl && p.productType !== 'short');

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 size={32} className="animate-spin" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-12 pb-20">
      <section className="bg-surface-container-low pt-8 pb-6 px-4 relative border-b border-outline-variant/10">
        <button onClick={handleLogout} className="absolute top-4 right-4 p-2 text-on-surface-variant"><LogOut size={20} /></button>
        <div className="flex gap-6 items-start mb-6">
          <div className="relative flex-shrink-0">
            <img className="w-24 h-24 rounded-[3px] object-cover border-2 border-primary-container" src={userProfile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.currentUser?.uid}`} />
            <div className="absolute bottom-0 right-0 bg-primary-container p-1 rounded-[3px] shadow-sm"><Verified size={16} className="text-white" fill="currentColor" /></div>
          </div>
          <div className="flex-1 flex flex-col pt-2">
            <div className="flex justify-between items-start mb-1">
              <div>
                <h2 className="text-[1.375rem] font-black tracking-tight text-on-surface leading-tight">{userProfile?.displayName || 'Usuário'}</h2>
                <p className="text-[0.625rem] text-on-surface-variant uppercase font-bold tracking-widest">{userProfile?.location || 'Moçambique'}</p>
              </div>
              <button onClick={() => router.push('/profile-setup')} className="p-2 bg-on-surface/5 rounded-full"><Grid size={18} /></button>
            </div>
            <div className="flex gap-6 mt-4">
              <div className="flex flex-col"><span className="text-[1.125rem] font-black text-on-surface">{myProducts.length}</span><span className="text-[0.5625rem] uppercase font-bold text-on-surface-variant">Anúncios</span></div>
              <div className="flex flex-col"><span className="text-[1.125rem] font-black text-on-surface">{followerCount}</span><span className="text-[0.5625rem] uppercase font-bold text-on-surface-variant">Seguidores</span></div>
              <div className="flex flex-col"><span className="text-[1.125rem] font-black text-on-surface">{followingCount}</span><span className="text-[0.5625rem] uppercase font-bold text-on-surface-variant">Seguindo</span></div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex border-b border-outline-variant/10">
        <button onClick={() => setActiveTab('photos')} className={`flex-1 py-4 text-[0.75rem] font-bold uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'photos' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant'}`}><ShoppingBag size={18} /> Fotos <span className="text-[0.6rem] ml-1 bg-surface-container py-0.5 px-1.5 rounded-[2px]">{photoProducts.length}</span></button>
        <button onClick={() => setActiveTab('videos')} className={`flex-1 py-4 text-[0.75rem] font-bold uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'videos' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant'}`}><Video size={18} /> Vídeos <span className="text-[0.6rem] ml-1 bg-surface-container py-0.5 px-1.5 rounded-[2px]">{videoProducts.length}</span></button>
      </div>

      <section className="grid grid-cols-2 gap-1 bg-background font-sans">
        {activeTab === 'photos' && (
          <>
            {photoProducts.map((p) => (
              <div key={p.id} onClick={() => router.push(`/product/${p.id}`)} className="aspect-square relative group bg-surface cursor-pointer">
                <img src={p.images?.[0]} className="w-full h-full object-cover" />
                <button onClick={(e) => handleDelete(e, p.id)} className="absolute top-2 right-2 p-1.5 bg-black/40 rounded-full text-white"><Trash2 size={16} /></button>
              </div>
            ))}
            <div onClick={() => router.push('/sell')} className="aspect-square relative flex flex-col items-center justify-center bg-surface-container border border-dashed border-white/20 cursor-pointer">
                <PlusCircle size={32} className="text-primary" />
                <span className="text-[0.625rem] uppercase mt-2 font-bold">Novo Item</span>
            </div>
          </>
        )}
        {activeTab === 'videos' && (
          videoProducts.map((p) => (
            <div key={p.id} onClick={() => router.push(`/short/${p.id}`)} className="h-[280px] relative bg-black cursor-pointer overflow-hidden rounded-[16px]">
               <video src={p.videoUrl} className="w-full h-full object-cover" />
               <button onClick={(e) => handleDelete(e, p.id)} className="absolute top-2 right-2 p-1.5 bg-black/40 rounded-full text-white"><Trash2 size={16} /></button>
            </div>
          ))
        )}
      </section>
    </motion.div>
  );
}
