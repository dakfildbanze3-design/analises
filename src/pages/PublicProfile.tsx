import React, { useState, useEffect } from 'react';
import { ArrowLeft, Share2, MoreVertical, Heart, Star, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { chatService } from '../services/chatService';
import { checkIsFollowing, followUser, unfollowUser } from '../services/followService';

export default function PublicProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [user, setUser] = useState<any>(null);
  const [userProducts, setUserProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    // Listen to user updates in real-time
    const unsubscribe = onSnapshot(doc(db, 'users', id), (docSnap) => {
      if (docSnap.exists()) {
        setUser(docSnap.data());
      } else {
        setUser(null);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${id}`);
      setLoading(false);
    });

    const fetchProducts = async () => {
      try {
        const q = query(collection(db, 'products'), where('sellerId', '==', id));
        const pSnap = await getDocs(q);
        setUserProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };
    
    fetchProducts();

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    const fetchFollowStatus = async () => {
      if (id && auth.currentUser) {
        try {
          const status = await checkIsFollowing(auth.currentUser.uid, id);
          setIsFollowing(status);
        } catch (e) {
          console.error(e);
        }
      }
    };
    fetchFollowStatus();
  }, [id]);

  const handleMessageClick = async () => {
    if (!auth.currentUser) {
      alert("Faça login para enviar mensagens");
      navigate('/login');
      return;
    }
    if (!id) return;

    try {
      const chatId = await chatService.getOrCreateChat(
        id,
        user?.displayName || 'Vendedor',
        user?.avatarUrl
      );
      navigate(`/chat/${chatId}`);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleFollowToggle = async () => {
    if (!auth.currentUser) {
      alert("Faça login para seguir usuários");
      navigate('/login');
      return;
    }
    if (id === auth.currentUser.uid) {
       return;
    }

    setFollowLoading(true);
    const previousState = isFollowing;
    setIsFollowing(!isFollowing);

    try {
      if (previousState) {
        await unfollowUser(id);
      } else {
        await followUser(id);
      }
    } catch (error) {
      setIsFollowing(previousState);
      console.error("Erro ao seguir", error);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-12 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-zinc-800" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-12 flex flex-col items-center justify-center">
        <p className="text-on-surface-variant font-bold mb-4 uppercase tracking-widest text-[0.875rem]">Usuário não encontrado.</p>
        <button onClick={() => navigate(-1)} className="text-on-surface font-black uppercase tracking-widest text-[0.75rem]">Voltar</button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-20 bg-background min-h-screen"
    >
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between p-4 pointer-events-none">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center bg-black/30 backdrop-blur-md rounded-full text-white pointer-events-auto active:scale-95 transition-transform"
        >
          <ArrowLeft size={24} />
        </button>
        <button 
          className="w-10 h-10 flex items-center justify-center bg-black/30 backdrop-blur-md rounded-full text-white pointer-events-auto active:scale-95 transition-transform"
        >
          <Share2 size={24} />
        </button>
      </header>

      {/* Profile Header Section */}
      <section className="relative w-full">
        <div className="h-48 w-full overflow-hidden bg-zinc-800">
          <img 
            className="w-full h-full object-cover opacity-60" 
            src={user.coverUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${id}&backgroundColor=0a0a0a`} 
            alt="Cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="px-4 -mt-12 relative z-10">
          <div className="flex justify-between items-end">
            <div className="p-[2px] bg-background rounded-[3px]">
              <img 
                className="w-24 h-24 object-cover rounded-[3px] border-2 border-surface-container-highest bg-zinc-900" 
                src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`} 
                alt="Profile"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex gap-1 pb-1">
              {auth.currentUser?.uid !== id && (
                <>
                  <button 
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    className={`font-medium text-[0.75rem] px-4 h-8 rounded-[3px] active:scale-95 transition-all shadow-sm ${isFollowing ? 'bg-surface-container-highest text-on-surface' : 'bg-blue-900 text-white'}`}
                  >
                    {isFollowing ? 'SEGUINDO' : 'SEGUIR'}
                  </button>
                  <button 
                    onClick={handleMessageClick}
                    className="bg-zinc-600 text-white font-medium text-[0.75rem] px-4 h-8 rounded-[3px] active:scale-95 transition-all shadow-sm hover:bg-zinc-700"
                  >
                    MENSAGEM
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="mt-2">
            <h1 className="text-[1.25rem] font-black tracking-tight text-on-surface">{user.displayName || 'Usuário'}</h1>
            <p className="text-on-surface-variant text-[0.6875rem] font-medium uppercase tracking-widest mt-[-2px]">
              @{user.displayName?.toLowerCase().replace(/\s+/g, '') || 'usuario'}
            </p>
            <p className="text-on-surface-variant text-[0.8125rem] font-medium mt-2 max-w-md leading-tight">
              {user.bio || 'Membro do Bazar.'}
            </p>
          </div>
          <div className="flex gap-4 mt-4 py-2 border-y border-outline-variant/10">
            <div className="flex flex-col">
              <span className="text-on-surface font-bold text-[0.875rem]">{user.followersCount || 0}</span>
              <span className="text-on-surface-variant text-[0.625rem] uppercase font-medium tracking-tight">Seguidores</span>
            </div>
            <div className="flex flex-col">
              <span className="text-on-surface font-bold text-[0.875rem]">{user.followingCount || 0}</span>
              <span className="text-on-surface-variant text-[0.625rem] uppercase font-medium tracking-tight">Seguindo</span>
            </div>
          </div>
        </div>
      </section>

      {/* Product Grid Tabs */}
      <nav className="flex px-4 mt-4 gap-4 border-b border-outline-variant/10">
        <button className="text-on-surface border-b border-white pb-2 text-[0.6875rem] uppercase font-black tracking-widest">Produtos à Venda</button>
      </nav>

      {/* Bento Style Grid */}
      <section className="grid grid-cols-2 gap-3 mt-4 px-4">
        {userProducts.length === 0 ? (
          <p className="col-span-2 text-center text-on-surface-variant/60 font-medium py-10 uppercase tracking-widest text-[0.75rem]">Este usuário ainda não tem produtos à venda.</p>
        ) : (
          userProducts.map((product) => (
            <div 
              key={product.id}
              onClick={() => navigate(`/product/${product.id}`)}
              className="bg-surface-container-low border border-outline-variant/10 cursor-pointer rounded-[3px] overflow-hidden"
            >
              <div className="aspect-square w-full overflow-hidden bg-surface-container-highest">
                <img src={product.images?.[0] || 'https://picsum.photos/seed/placeholder/400/400'} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="p-3">
                <span className="text-[0.55rem] uppercase font-black text-blue-900 tracking-widest">{product.category || 'Geral'}</span>
                <h3 className="text-on-surface text-[0.75rem] font-bold line-clamp-1 mt-0.5">{product.name}</h3>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-on-surface text-[0.8125rem] font-black">{product.price} MT</span>
                  <div className="flex items-center gap-1 opacity-60">
                    <Heart size={10} className="fill-on-surface-variant text-on-surface-variant" />
                    <span className="text-[0.625rem] font-bold">{product.likedBy?.length || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </motion.div>
  );
}
