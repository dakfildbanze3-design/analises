import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Product } from '../types';
import TopBar from '../components/TopBar';
import { Users, Loader2 } from 'lucide-react';

const Following: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchFollowingData = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        // 1. Get following list
        const followingRef = collection(db, 'follows');
        const qFollowing = query(followingRef, where('followerId', '==', auth.currentUser.uid));
        const followingSnap = await getDocs(qFollowing);
        const ids = followingSnap.docs.map(doc => doc.data().followingId);
        setFollowingIds(ids);

        if (ids.length > 0) {
          // 2. Get products from following users
          const productsRef = collection(db, 'products');
          // Firestore 'in' query supports up to 10-30 items usually, for simplicity we do this:
          const q = query(
            productsRef, 
            where('sellerId', 'in', ids.slice(0, 10)), 
            orderBy('createdAt', 'desc'),
            limit(20)
          );
          const productSnap = await getDocs(q);
          const productList = productSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
          setProducts(productList);
        }
      } catch (error) {
        console.error("Error fetching following feed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowingData();
  }, []);

  if (!auth.currentUser) {
    return (
      <div className="min-h-screen pt-12 flex flex-col items-center justify-center p-6 text-center">
        <Users size={48} className="mb-4 text-white/20" />
        <h2 className="text-xl font-bold mb-2">Inicie sessão</h2>
        <p className="text-sm text-white/60 mb-6">Entre para ver publicações das pessoas que você segue.</p>
        <button 
          onClick={() => navigate('/login')}
          className="shiny-button px-8 py-3 rounded-full font-black uppercase tracking-widest"
        >
          Entrar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-4 pb-20">
      
      {loading ? (
        <div className="flex items-center justify-center p-20">
          <Loader2 className="animate-spin text-white" size={32} />
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 gap-[4px] p-1">
          {products.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => navigate(`/product/${product.id}`)}
              className="aspect-square relative overflow-hidden rounded-[10px] group active:brightness-75 transition-all"
            >
              <img 
                src={product.image} 
                alt={product.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                <span className="text-[0.7rem] font-bold truncate">{product.name}</span>
                <span className="text-[0.8rem] font-black">{product.price} MT</span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-center mt-10">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
            <Users size={32} className="text-white/40" />
          </div>
          <h2 className="text-lg font-bold mb-2">Ainda sem publicações</h2>
          <p className="text-sm text-white/50 leading-relaxed max-w-[240px]">
            {followingIds.length === 0 
              ? "Siga vendedores para ver as suas publicações aqui no seu feed personalizado."
              : "As pessoas que você segue ainda não publicaram nada recentemente."}
          </p>
          {followingIds.length === 0 && (
            <button 
              onClick={() => navigate('/discover')}
              className="mt-6 shiny-button px-8 py-3 rounded-full font-black uppercase tracking-widest text-[0.75rem]"
            >
              Encontrar Pessoas
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Following;
