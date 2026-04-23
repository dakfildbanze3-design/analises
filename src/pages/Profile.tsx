import React, { useState, useEffect } from 'react';
import { Verified, Grid, PlusCircle, Loader2, LogOut, Video, ShoppingBag, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'photos' | 'videos'>('photos');

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!auth.currentUser) {
        navigate('/login');
        return;
      }

      try {
        // Fetch user profile
        const userPath = `users/${auth.currentUser.uid}`;
        try {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, userPath);
        }

        // Fetch user's products
        const productsPath = 'products';
        try {
          const q = query(collection(db, 'products'), where('sellerId', '==', auth.currentUser.uid));
          const querySnapshot = await getDocs(q);
          const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
          setMyProducts(productsData);
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, productsPath);
        }

        // Fetch real follower/following counts
        try {
          const followersQ = query(collection(db, 'follows'), where('followingId', '==', auth.currentUser.uid));
          const followersSnapshot = await getDocs(followersQ);
          setFollowerCount(followersSnapshot.size);

          const followingQ = query(collection(db, 'follows'), where('followerId', '==', auth.currentUser.uid));
          const followingSnapshot = await getDocs(followingQ);
          setFollowingCount(followingSnapshot.size);
        } catch (err) {
          console.error("Error fetching follows:", err);
        }
      } catch (error) {
        console.error("Erro no ProfilePage:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const handleDelete = async (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    if (!window.confirm("Tens a certeza que queres eliminar este post?")) return;

    try {
      await deleteDoc(doc(db, 'products', productId));
      setMyProducts(prev => prev.filter(p => p.id !== productId));
    } catch (error) {
      console.error("Erro a eliminar post:", error);
      alert("Houve um erro ao eliminar. Tenta novamente.");
    }
  };

  const videoProducts = myProducts.filter(p => p.videoUrl || p.productType === 'short');
  const photoProducts = myProducts.filter(p => !p.videoUrl && p.productType !== 'short');

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
      {/* Profile Header */}
      <section className="bg-surface-container-low pt-8 pb-6 px-4 relative border-b border-outline-variant/10">
        <button 
          onClick={handleLogout}
          className="absolute top-4 right-4 p-2 text-on-surface-variant hover:text-error transition-colors"
        >
          <LogOut size={20} />
        </button>

        <div className="flex gap-6 items-start mb-6">
          {/* Avatar Left */}
          <div className="relative flex-shrink-0">
            <img 
              className="w-24 h-24 rounded-[3px] object-cover border-2 border-primary-container" 
              src={userProfile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.currentUser?.uid}`} 
              alt="Avatar"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.currentUser?.uid}`;
              }}
            />
            <div className="absolute bottom-0 right-0 bg-primary-container p-1 rounded-[3px] translate-x-1 translate-y-1">
              <Verified size={16} className="text-white" fill="currentColor" />
            </div>
          </div>

          {/* Name & Content Right */}
          <div className="flex-1 flex flex-col pt-2">
            <div className="flex justify-between items-start mb-1">
              <div>
                <h2 className="text-[1.375rem] font-black tracking-tight text-on-surface leading-tight">{userProfile?.displayName || 'Usuário'}</h2>
                <p className="text-[0.625rem] text-on-surface-variant uppercase font-bold tracking-widest">{userProfile?.location || 'Moçambique'}</p>
              </div>
              <button 
                onClick={() => navigate('/profile-setup')}
                className="p-2 bg-on-surface/5 rounded-full text-on-surface-variant active:scale-90 transition-all"
              >
                <Grid size={18} />
              </button>
            </div>

            {/* Stats directly below name */}
            <div className="flex gap-6 mt-4">
              <div className="flex flex-col">
                <span className="text-[1.125rem] font-black text-on-surface leading-none">{myProducts.length}</span>
                <span className="text-[0.5625rem] uppercase font-bold text-on-surface-variant mt-1">Anúncios</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[1.125rem] font-black text-on-surface leading-none">{followerCount}</span>
                <span className="text-[0.5625rem] uppercase font-bold text-on-surface-variant mt-1">Seguidores</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[1.125rem] font-black text-on-surface leading-none">{followingCount}</span>
                <span className="text-[0.5625rem] uppercase font-bold text-on-surface-variant mt-1">Seguindo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/10">
        <button 
          onClick={() => setActiveTab('photos')}
          className={`flex-1 py-4 text-[0.75rem] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${activeTab === 'photos' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant'}`}
        >
          <ShoppingBag size={18} />
          Fotos <span className="text-[0.6rem] ml-1 bg-surface-container py-0.5 px-1.5 rounded-[2px]">{photoProducts.length}</span>
        </button>
        <button 
          onClick={() => setActiveTab('videos')}
          className={`flex-1 py-4 text-[0.75rem] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${activeTab === 'videos' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant'}`}
        >
          <Video size={18} />
          Vídeos <span className="text-[0.6rem] ml-1 bg-surface-container py-0.5 px-1.5 rounded-[2px]">{videoProducts.length}</span>
        </button>
      </div>

      {/* Tab Content */}
      <section className="grid grid-cols-2 gap-[1px] bg-outline-variant/10">
        
        {activeTab === 'photos' && (
          <>
            {photoProducts.map((product) => (
              <div 
                key={product.id}
                onClick={() => navigate(`/product/${product.id}`)}
                className="bg-surface aspect-square relative group cursor-pointer"
              >
                <img 
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                  src={product.images?.[0] || 'https://picsum.photos/seed/placeholder/800/800'} 
                  alt={product.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/placeholder/800/800';
                  }}
                />

                <div className="absolute bottom-0 left-0 w-full p-3 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="text-[0.625rem] uppercase text-white font-bold mb-1">{product.price} MT</div>
                  <div className="text-[0.75rem] font-medium text-white truncate">{product.name}</div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, product.id)}
                  className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-sm transition-colors z-10"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {/* Add New Product Card */}
            <div 
              onClick={() => navigate('/sell')}
              className="bg-surface aspect-square relative group cursor-pointer"
            >
              <div className="w-full h-full bg-surface-container flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/30 hover:bg-surface-container-high transition-colors">
                <PlusCircle size={32} className="text-primary" />
                <span className="text-[0.625rem] uppercase text-on-surface-variant mt-2 font-bold">Novo Item</span>
              </div>
            </div>
          </>
        )}

        {activeTab === 'videos' && (
          <>
            {videoProducts.map((product) => (
              <div 
                key={product.id}
                onClick={() => navigate(`/short/${product.id}`)}
                className="bg-surface h-[280px] relative group cursor-pointer overflow-hidden"
              >
                <video 
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                  src={product.videoUrl} 
                  muted
                  loop
                  playsInline
                />

                <div className="absolute bottom-0 left-0 w-full p-3 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="text-[0.625rem] uppercase text-white font-bold mb-1">
                    <Video size={10} className="inline mr-1" />{product.views || 0} views
                  </div>
                  <div className="text-[0.75rem] font-medium text-white truncate">{product.name}</div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, product.id)}
                  className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-sm transition-colors z-10"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {videoProducts.length === 0 && (
              <div className="col-span-2 py-12 text-center text-on-surface-variant text-[0.875rem]">
                Ainda não tens nenhum vídeo publicado.
              </div>
            )}
          </>
        )}
      </section>
    </motion.div>
  );
}
