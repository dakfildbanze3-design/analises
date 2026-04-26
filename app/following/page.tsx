'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '@/src/lib/firebase';
import { Product } from '@/src/types';
import { Users, Loader2 } from 'lucide-react';

export default function FollowingPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchFollowingData = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const followingSnap = await getDocs(query(collection(db, 'follows'), where('followerId', '==', user.uid)));
        const ids = followingSnap.docs.map(doc => doc.data().followingId);
        setFollowingIds(ids);

        if (ids.length > 0) {
          const productSnap = await getDocs(query(collection(db, 'products'), where('sellerId', 'in', ids.slice(0, 10)), orderBy('createdAt', 'desc'), limit(20)));
          const productList = productSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
          setProducts(productList);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchFollowingData();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center pt-12"><Loader2 className="animate-spin" /></div>;

  if (!auth.currentUser) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center pt-12">
        <Users size={48} className="mb-4 opacity-20" />
        <h2 className="text-xl font-bold mb-2">Inicie sessão</h2>
        <p className="text-sm opacity-60 mb-6">Entre para ver publicações das pessoas que segue.</p>
        <button onClick={() => router.push('/login')} className="shiny-button px-8 py-3 rounded-full font-black uppercase">Entrar</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 pb-20 px-1">
      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5">
          {products.map((p) => (
            <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => router.push(`/product/${p.id}`)} className="aspect-square relative rounded-[10px] overflow-hidden bg-surface group">
               <img src={p.image || p.images?.[0]} className="w-full h-full object-cover" />
               <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end">
                <span className="text-[0.7rem] font-bold truncate uppercase">{p.name}</span>
                <span className="text-[0.8rem] font-black">{p.price} MT</span>
               </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-center mt-10">
          <h2 className="text-lg font-bold mb-2">Ainda sem publicações</h2>
          <button onClick={() => router.push('/discover')} className="mt-6 shiny-button px-8 py-3 rounded-full font-black uppercase text-xs">Encontrar Pessoas</button>
        </div>
      )}
    </div>
  );
}
