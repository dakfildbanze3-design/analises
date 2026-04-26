'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Heart, Share2, ShoppingBag, Loader2, X, Send, MoreVertical, Download, Trash2, Flag } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType, auth } from '@/src/lib/firebase';
import { doc, getDoc, updateDoc, increment, arrayUnion, arrayRemove, onSnapshot, collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp, deleteDoc, where } from 'firebase/firestore';
import { checkIsFollowing, followUser, unfollowUser } from '@/src/services/followService';
import { formatRelativeTime } from '@/src/lib/dateUtils';
import { shareContent } from '@/src/lib/shareUtils';
import { notificationService } from '@/src/services/notificationService';
import { chatService } from '@/src/services/chatService';
import AdBanner from '@/src/components/AdBanner';
import ReportModal from '@/src/components/ReportModal';

type CommentType = {
  id: string;
  username: string;
  avatar: string;
  time: string;
  text: string;
  likes: number;
  userLiked: boolean;
  userDisliked: boolean;
  replies: CommentType[];
};

export default function ProductDetail() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [product, setProduct] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{id: string, username: string} | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const [selectedFullImage, setSelectedFullImage] = useState<string | null>(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    
    const docRef = doc(db, 'products', id);
    updateDoc(docRef, { views: increment(1) }).catch(e => console.error(e));

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const productData = docSnap.data();
        setProduct({ id: docSnap.id, ...productData });
        
        if (auth.currentUser) {
          setIsLiked((productData.likedBy || []).includes(auth.currentUser.uid));
        }

        if (productData.sellerId) {
          getDoc(doc(db, 'users', productData.sellerId)).then(sellerDoc => {
            if (sellerDoc.exists()) {
              setSeller(sellerDoc.data());
            }
          }).catch(err => console.warn(err));
        }
      } else {
        setProduct(null);
      }
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    const qComments = query(collection(db, 'products', id, 'comments'), orderBy('createdAt', 'desc'));
    const unsubscribeComments = onSnapshot(qComments, async (snap) => {
      const allCommentsPromises = snap.docs.map(async (docSnap) => {
          const cData = docSnap.data() as any;
          let realName = cData.username;
          let realAvatar = cData.avatar;

          if (cData.userId) {
            try {
              const userSnap = await getDoc(doc(db, 'users', cData.userId));
              if (userSnap.exists()) {
                const uData = userSnap.data();
                if (uData.displayName) realName = uData.displayName;
                if (uData.avatarUrl) realAvatar = uData.avatarUrl;
              }
            } catch (err) {
              console.warn("Erro a carregar avatar de comentário:", err);
            }
          }

          return { id: docSnap.id, ...cData, username: realName, avatar: realAvatar };
      });
      
      const allComments = await Promise.all(allCommentsPromises);

      const topLevel = allComments.filter(c => !c.parentId);
      const rawReplies = allComments.filter(c => c.parentId).sort((a,b) => (a.createdAt?.toDate?.()?.getTime() || 0) - (b.createdAt?.toDate?.()?.getTime() || 0));

      const formatted: CommentType[] = topLevel.map(c => {
          const cReplies = rawReplies.filter(r => r.parentId === c.id);
          return {
              id: c.id,
              username: c.username,
              avatar: c.avatar,
              time: formatRelativeTime(c.createdAt),
              text: c.text,
              likes: c.likedBy?.length || 0,
              userLiked: auth.currentUser ? (c.likedBy || []).includes(auth.currentUser.uid) : false,
              userDisliked: auth.currentUser ? (c.dislikedBy || []).includes(auth.currentUser.uid) : false,
              replies: cReplies.map(r => ({
                  id: r.id,
                  username: r.username,
                  avatar: r.avatar,
                  time: formatRelativeTime(r.createdAt),
                  text: r.text,
                  likes: r.likedBy?.length || 0,
                  userLiked: auth.currentUser ? (r.likedBy || []).includes(auth.currentUser.uid) : false,
                  userDisliked: auth.currentUser ? (r.dislikedBy || []).includes(auth.currentUser.uid) : false,
                  replies: []
              }))
          };
      });
      setComments(formatted);
    });

    return () => {
      unsubscribe();
      unsubscribeComments();
    };
  }, [id]);

  useEffect(() => {
    if (!product?.category) return;
    const fetchSuggestions = async () => {
      try {
        const q = query(collection(db, 'products'), where('category', '==', product.category), limit(10));
        const snap = await getDocs(q);
        const results = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((p: any) => p.id !== product.id && !p.videoUrl && p.productType !== 'short');
        setSuggestions(results);
      } catch (err) {
        console.warn('Erro a carregar sugestões:', err);
      }
    };
    fetchSuggestions();
  }, [product?.category, product?.id]);

  useEffect(() => {
    const fetchFollowStatus = async () => {
      if (product?.sellerId && auth.currentUser) {
        try {
          const status = await checkIsFollowing(auth.currentUser.uid, product.sellerId);
          setIsFollowing(status);
        } catch (e) {
          console.error(e);
        }
      }
    };
    fetchFollowStatus();
  }, [product?.sellerId]);

  const handleFollowToggle = async () => {
    if (!auth.currentUser) {
      alert("Faça login para seguir usuários");
      router.push('/login');
      return;
    }
    if (product.sellerId === auth.currentUser.uid) return;

    setFollowLoading(true);
    const previousState = isFollowing;
    setIsFollowing(!isFollowing);

    try {
      if (previousState) {
        await unfollowUser(product.sellerId);
      } else {
        await followUser(product.sellerId);
      }
    } catch (error) {
      setIsFollowing(previousState);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleLikePost = async () => {
    if (!auth.currentUser || !id || !product) {
      if (!auth.currentUser) alert("Faça login para curtir.");
      return;
    }

    setLikeLoading(true);
    const previousState = isLiked;
    const uid = auth.currentUser.uid;
    setIsLiked(!isLiked);

    try {
      const docRef = doc(db, 'products', id);
      if (previousState) {
        await updateDoc(docRef, { likedBy: arrayRemove(uid) });
      } else {
        await updateDoc(docRef, { likedBy: arrayUnion(uid) });
        notificationService.createNotification({
          type: 'like',
          toUserId: product.sellerId,
          postId: id,
          text: 'curtiu seu post'
        });
      }
    } catch (error) {
      setIsLiked(previousState);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleMessageClick = async () => {
    if (!auth.currentUser) {
      alert("Faça login para enviar mensagens");
      router.push('/login');
      return;
    }
    if (!product?.sellerId) return;

    try {
      const chatId = await chatService.getOrCreateChat(
        product.sellerId,
        seller?.displayName,
        seller?.avatarUrl
      );
      router.push(`/chat/${chatId}`);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || !id || !auth.currentUser) return;
    setCommentLoading(true);
    
    const textToSave = commentText.trim();
    setCommentText('');
    setReplyingTo(null);

    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const userData = userDoc.data() || {};
      const usernameStr = userData.displayName || auth.currentUser.displayName;
      const finalUsername = usernameStr ? `@${usernameStr.toLowerCase().replace(/\s+/g, '')}` : '@usuario';
      const finalAvatar = userData.avatarUrl || auth.currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.currentUser.uid}`;

      await addDoc(collection(db, 'products', id, 'comments'), {
        text: textToSave,
        userId: auth.currentUser.uid,
        username: finalUsername,
        avatar: finalAvatar,
        parentId: replyingTo ? replyingTo.id : null,
        createdAt: serverTimestamp(),
        likedBy: [],
        dislikedBy: []
      });
      
      if (product?.sellerId) {
        notificationService.createNotification({
          type: 'comment',
          toUserId: product.sellerId,
          postId: id,
          text: `comentou no seu anúncio: "${textToSave.substring(0, 30)}${textToSave.length > 30 ? '...' : ''}"`
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCommentLoading(false);
    }
  };

  const renderImageGrid = () => {
    const images = product?.images || [];
    if (images.length === 0) return (
      <img className="w-full h-full object-contain" src='https://picsum.photos/seed/placeholder/800/800' />
    );

    if (images.length === 1) {
      return (
        <img 
          src={images[0]} 
          className="w-full h-full object-contain cursor-pointer" 
          onClick={() => setSelectedFullImage(images[0])}
        />
      );
    }

    return (
      <div className={`grid w-full h-full gap-0.5 ${images.length === 2 ? 'grid-cols-1 grid-rows-2' : 'grid-cols-2 grid-rows-2'}`}>
        {images.slice(0, 4).map((img : string, idx : number) => (
          <div key={idx} className={`relative overflow-hidden cursor-pointer ${images.length === 3 && idx === 0 ? 'col-span-2' : ''}`} onClick={() => setSelectedFullImage(img)}>
            <img src={img} className="w-full h-full object-cover" />
            {idx === 3 && images.length > 4 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold">+{images.length - 3}</div>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 size={32} className="animate-spin" /></div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center"><p>Produto não encontrado.</p></div>;

  return (
    <div className="bg-background min-h-screen pb-20">
      <section className="relative w-full h-[530px] bg-black">
        {renderImageGrid()}
      </section>

      <div className="glass-black sticky top-12 z-40 py-3 px-4 border-b border-white/10">
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          <div className="bg-blue-900 px-4 py-2 rounded-[3px] flex flex-col items-center">
            <span className="text-[0.625rem] text-white/60 uppercase font-black">Preço</span>
            <span className="text-[1rem] font-black text-white">{product.price} MT</span>
          </div>
          <div className="bg-zinc-800 px-3 py-1.5 rounded-[3px] flex flex-col text-white">
            <span className="text-[0.625rem] opacity-60 uppercase font-black truncate">Local</span>
            <span className="text-[0.875rem] font-bold truncate">{product.location || 'Maputo'}</span>
          </div>
          <div className="bg-zinc-800 px-3 py-1.5 rounded-[3px] flex flex-col text-white">
            <span className="text-[0.625rem] opacity-60 uppercase font-black truncate">Categoria</span>
            <span className="text-[0.875rem] font-bold truncate">{product.category || 'Geral'}</span>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div onClick={() => setIsDescExpanded(!isDescExpanded)} className="mb-6 cursor-pointer">
          <p className={`text-[1.125rem] text-on-surface leading-tight ${isDescExpanded ? '' : 'line-clamp-3'}`}>
            <span className="font-bold uppercase italic">{product.name}</span>{" - "}<span className="text-on-surface-variant/90">{product.description}</span>
          </p>
        </div>

        {seller && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={seller.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${product.sellerId}`} className="w-14 h-14 rounded-full object-cover shadow-lg" />
                <div>
                  <h3 className="text-[1rem] font-bold text-on-surface">{seller.displayName || 'Usuário'}</h3>
                  <p className="text-[0.75rem] text-on-surface-variant">{product.views || 0} visualizações &bull; {formatRelativeTime(product.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleLikePost} className={`p-2 transition-all ${isLiked ? 'text-blue-900' : 'text-on-surface-variant'}`}><Heart size={24} className={isLiked ? 'fill-blue-900' : ''} /></button>
                <button onClick={() => shareContent(product.name, `Veja este post no Bazar: ${product.name}`, window.location.href)} className="p-2 text-on-surface-variant"><Share2 size={24} /></button>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleFollowToggle} className={`flex-1 h-12 rounded-full font-bold uppercase tracking-widest text-[0.75rem] shadow-lg transition-all ${isFollowing ? 'bg-zinc-800 text-white' : 'bg-white text-black'}`}>
                {isFollowing ? 'SEGUINDO' : 'SEGUIR'}
              </button>
              <button onClick={handleMessageClick} className="flex-1 shiny-button h-12 rounded-full font-bold uppercase tracking-widest text-[0.75rem] text-white shadow-xl">
                MENSAGEM
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 border-t border-outline-variant/10 pt-8">
           <h2 className="text-[1.25rem] font-black uppercase italic mb-4">Comentários ({comments.length})</h2>
           <div className="space-y-4">
             {comments.slice(0, 3).map(c => (
               <div key={c.id} className="flex gap-3">
                 <img src={c.avatar} className="w-8 h-8 rounded-full" />
                 <div>
                   <p className="text-[0.875rem]"><span className="font-bold">{c.username}</span> {c.text}</p>
                 </div>
               </div>
             ))}
             {comments.length > 3 && <button onClick={() => setShowComments(true)} className="text-blue-900 font-bold uppercase text-[0.75rem]">Ver todos os comentários</button>}
             {comments.length === 0 && <p className="opacity-40 italic">Sem comentários ainda...</p>}
           </div>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-12">
            <h2 className="text-[0.75rem] font-black uppercase tracking-[0.2em] mb-6">Podes Gostar Também</h2>
            <div className="grid grid-cols-2 gap-2">
              {suggestions.map(item => (
                <div key={item.id} onClick={() => router.push(`/product/${item.id}`)} className="bg-surface-container rounded-lg overflow-hidden cursor-pointer">
                  <div className="aspect-square">
                    <img src={item.image || item.images?.[0]} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3">
                    <h3 className="text-[0.75rem] font-bold line-clamp-1">{item.name}</h3>
                    <p className="text-[0.875rem] font-black text-blue-900">{item.price} MT</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedFullImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedFullImage(null)} className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4">
            <img src={selectedFullImage} className="max-w-full max-h-full object-contain" />
            <button className="absolute top-8 right-8 text-white"><X size={32} /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
