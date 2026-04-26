'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ThumbsUp, MessageSquare, Share2, ShoppingBag, X, Send, MapPin, Phone, Tag, MoreVertical, Download, Trash2, Flag, ArrowLeft } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType, auth } from '@/src/lib/firebase';
import { doc, getDoc, collection, query, limit, getDocs, addDoc, serverTimestamp, onSnapshot, orderBy, updateDoc, arrayUnion, arrayRemove, increment, deleteDoc } from 'firebase/firestore';
import { checkIsFollowing, followUser, unfollowUser } from '@/src/services/followService';
import { notificationService } from '@/src/services/notificationService';
import { formatRelativeTime } from '@/src/lib/dateUtils';
import { shareContent } from '@/src/lib/shareUtils';
import { chatService } from '@/src/services/chatService';
import AdBanner from '@/src/components/AdBanner';
import ReportModal from '@/src/components/ReportModal';
import { PRODUCT_CATEGORIES } from '@/src/constants';

const CATEGORIES_ALL = ['TUDO', ...PRODUCT_CATEGORIES.map(c => c.toUpperCase())];

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

export default function ShortPlayer() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [relatedVideos, setRelatedVideos] = useState<any[]>([]);
  const [isTextExpanded, setIsTextExpanded] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('TUDO');
  
  // Comments logic
  const [comments, setComments] = useState<CommentType[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{id: string, username: string} | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    const commentsRef = collection(db, 'products', id, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
        const allCommentsPromises = snapshot.docs.map(async (docSnap) => {
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

    return () => unsubscribe();
  }, [id, auth.currentUser?.uid]);

  const toggleLike = async (commentId: string, parentId: string | null = null) => {
    if (!auth.currentUser) {
        alert("Faça login para curtir.");
        return;
    }
    if (!id) return;
    
    const uid = auth.currentUser.uid;
    let targetComment;
    if (parentId) {
        const p = comments.find(c => c.id === parentId);
        targetComment = p?.replies.find(r => r.id === commentId);
    } else {
        targetComment = comments.find(c => c.id === commentId);
    }
    if (!targetComment) return;

    const commentRef = doc(db, 'products', id, 'comments', commentId);
    if (targetComment.userLiked) {
        await updateDoc(commentRef, { likedBy: arrayRemove(uid) });
    } else {
        await updateDoc(commentRef, { likedBy: arrayUnion(uid), dislikedBy: arrayRemove(uid) });
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    if (!auth.currentUser) {
        alert("Faça login para comentar.");
        return;
    }
    if (!id) return;

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
            likedBy: [],
            dislikedBy: [],
            createdAt: serverTimestamp()
        });

        if (product?.sellerId) {
            notificationService.createNotification({
                type: 'comment',
                toUserId: product.sellerId,
                postId: id,
                text: `comentou no seu post: "${textToSave.substring(0, 30)}${textToSave.length > 30 ? '...' : ''}"`
            });
        }
    } catch (error) {
        console.error("Erro ao adicionar comentário:", error);
    }
  };

  useEffect(() => {
    const fetchVideoAndRelated = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const productData = docSnap.data();
          setProduct({ id: docSnap.id, ...productData });
          
          if (auth.currentUser) {
            setIsLiked((productData.likedBy || []).includes(auth.currentUser.uid));
          }
          await updateDoc(docRef, { views: increment(1) });
        }

        const q = query(collection(db, 'products'), limit(30));
        const relSnap = await getDocs(q);
        const related = relSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter((p: any) => p.id !== id && (p.videoUrl || p.productType === 'short'));
        setRelatedVideos(related);
        
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideoAndRelated();
  }, [id]);

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
        product.sellerName,
        product.sellerAvatar
      );
      router.push(`/chat/${chatId}`);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteProduct = async () => {
    if (!id || !auth.currentUser) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      router.push('/profile');
    } catch (e) {
      alert("Erro ao excluir.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-on-surface">
        <p className="mb-4 font-medium">Vídeo não encontrado.</p>
        <button onClick={() => router.back()} className="bg-primary text-on-primary px-4 py-2 rounded-[3px] font-bold">
            Voltar
        </button>
      </div>
    );
  }

  const isOwner = auth.currentUser?.uid === product.sellerId;

  return (
    <div className="min-h-screen bg-background pb-12 w-full max-w-md mx-auto">
      {/* Video Box */}
      <div className="w-full aspect-video bg-black sticky top-0 z-40 relative group">
        {product.videoUrl ? (
           (() => {
              const ytMatch = product.videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
              if (ytMatch && ytMatch[1]) {
                return (
                   <iframe
                     src={`https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&playsinline=1`}
                     className="w-full h-full object-contain border-0 pointer-events-auto"
                     allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                     allowFullScreen
                   />
                );
              }
              return (
                 <video 
                   src={product.videoUrl} 
                   className="w-full h-full object-contain"
                   controls={!product.trimEnd}
                   autoPlay
                   loop={!product.trimEnd}
                   playsInline
                   muted={product.videoMuted}
                 />
              );
           })()
        ) : (
            <div className="w-full h-full flex items-center justify-center">
                <img src={product.image || product.images?.[0]} className="w-full h-full object-cover opacity-80" />
            </div>
        )}
        
      <div className="absolute top-3 right-3 z-50 flex items-center gap-2">
        <button 
          onClick={() => router.back()}
          className="p-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full text-white transition-colors shadow-lg"
        >
          <ArrowLeft size={24} />
        </button>
        <button 
          onClick={() => setShowOptionsMenu(!showOptionsMenu)}
          className="p-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full text-white transition-colors shadow-lg"
        >
          <MoreVertical size={24} />
        </button>

          <AnimatePresence>
            {showOptionsMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                className="absolute top-12 right-0 w-48 bg-zinc-900 rounded-[8px] shadow-2xl flex flex-col overflow-hidden z-[60]"
              >
                <button 
                  onClick={() => {
                    const url = product.videoUrl || product.images?.[0];
                    if (url) window.open(url, '_blank');
                    setShowOptionsMenu(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                >
                  <Download size={18} className="text-white" />
                  <span className="text-[0.875rem] font-bold text-white">Salvar mídia</span>
                </button>

                {isOwner ? (
                  <button 
                    onClick={handleDeleteProduct}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <Trash2 size={18} className="text-white" />
                    <span className="text-[0.875rem] font-bold text-white">Excluir</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      setReportModalOpen(true);
                      setShowOptionsMenu(false);
                    }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <Flag size={18} className="text-error" />
                    <span className="text-[0.875rem] font-bold text-error">Denunciar</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Badges Row */}
      <div className="flex items-center gap-2 px-2 py-2 bg-zinc-900 overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-1.5 px-4 py-2 bg-blue-900 rounded-[3px] text-[0.875rem] text-white font-black whitespace-nowrap shrink-0 transition-colors active:bg-white active:text-black cursor-pointer">
             <ShoppingBag size={14} className="opacity-80" />
             <span>{product.price} MT</span>
          </div>
          
          {product.location && (
             <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 rounded-[3px] text-[0.75rem] text-white/90 font-bold whitespace-nowrap shrink-0 transition-colors active:bg-white active:text-black cursor-pointer">
                <MapPin size={14} className="opacity-70" />
                <span>{product.location}</span>
             </div>
          )}
          {product.category && (
             <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 rounded-[3px] text-[0.75rem] text-white/90 font-bold whitespace-nowrap shrink-0 transition-colors active:bg-white active:text-black cursor-pointer">
                <Tag size={14} className="opacity-70" />
                <span>{product.category}</span>
             </div>
          )}
          {product.sellerPhone && (
             <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 rounded-[3px] text-[0.75rem] text-white/90 font-bold whitespace-nowrap shrink-0 transition-colors active:bg-white active:text-black cursor-pointer">
                <Phone size={14} className="opacity-70" />
                <span>{product.sellerPhone}</span>
             </div>
          )}
      </div>

      {/* Info details */}
      <div className="px-4 py-2.5">
         <div className="flex items-center mb-3">
            <img 
               src={product.sellerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${product.sellerId}`} 
               className="w-[58px] h-[58px] rounded-full object-cover shrink-0 cursor-pointer shadow-md" 
               onClick={() => router.push(`/user/${product.sellerId}`)}
            />
            <div className="w-[10px] shrink-0" />
            <div className="flex-1 min-w-0 flex flex-col">
               <p 
                  onClick={() => setIsTextExpanded(!isTextExpanded)}
                  className={`text-[0.9375rem] leading-relaxed text-on-surface cursor-pointer ${isTextExpanded ? '' : 'line-clamp-2'}`}
               >
                 <span className="font-bold">{product.name}</span> - <span className="opacity-90">{product.description}</span>
               </p>
            </div>
         </div>

         <div className="flex items-center justify-between mt-3">
            <div className="flex flex-col flex-1 min-w-0">
               <div className="text-[0.75rem] text-on-surface-variant flex items-center gap-1.5 font-medium truncate">
                  <span 
                     onClick={() => router.push(`/user/${product.sellerId}`)}
                     className="font-bold text-on-surface/80 cursor-pointer hover:underline"
                  >
                     {product.sellerName || 'Vendedor'}
                  </span>
                  <span className="opacity-50">•</span>
                  <span>{product.views || 0} visualizações</span>
                  <span className="opacity-50">•</span>
                  <span>{product.createdAt ? formatRelativeTime(product.createdAt) : 'há pouco'}</span>
               </div>
            </div>
            
            <div className="flex items-center gap-1 pl-2">
                <button 
                  onClick={handleLikePost}
                  disabled={likeLoading}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-95 ${
                    isLiked ? 'text-blue-900' : 'text-on-surface hover:bg-surface-container'
                  }`}
                >
                   <ThumbsUp size={20} className={isLiked ? 'fill-blue-900' : ''} />
                </button>

                {(!auth.currentUser || product.sellerId !== auth.currentUser.uid) && (
                    <button 
                      onClick={handleFollowToggle}
                      disabled={followLoading}
                      className={`px-4 h-8 text-[0.8125rem] font-bold flex items-center justify-center rounded-full transition-all active:scale-95 ${
                        isFollowing 
                          ? 'text-on-surface-variant border border-outline-variant/30 bg-surface-container' 
                          : 'text-white bg-blue-900 shadow-md hover:brightness-110'
                      }`}
                    >
                      {isFollowing ? 'SEGUINDO' : 'SEGUIR'}
                    </button>
                )}
                <button 
                  onClick={() => {
                    if (product) {
                      shareContent(product.name, `Olha este vídeo no Bazar: ${product.name}`, `${window.location.origin}/short/${product.id}`);
                    }
                  }}
                  className="w-8 h-8 flex items-center justify-center text-on-surface hover:bg-surface-container rounded-full transition-colors active:scale-95"
                >
                   <Share2 size={20} />
                </button>
            </div>
         </div>

         <div className="h-[1px] w-full bg-outline-variant/10 mt-3" />

         <div 
            onClick={() => setIsCommentsOpen(true)}
            className="bg-zinc-900/40 rounded-[10px] p-3 mt-3 w-full cursor-pointer hover:bg-zinc-800 transition-colors"
         >
            <div className="flex items-center gap-2 mb-2">
                <span className="text-[0.875rem] font-bold text-white">Comentários</span>
                <span className="text-[0.75rem] text-white/40">{comments.reduce((acc, c) => acc + 1 + c.replies.length, 0)}</span>
            </div>
            <div className="flex gap-2 items-start">
               {comments.length > 0 ? (
                 <>
                   <img src={comments[0].avatar} className="w-6 h-6 rounded-full bg-zinc-800 shrink-0 object-cover" />
                   <p className="text-[0.8125rem] text-white/90 line-clamp-2 leading-snug">
                      <span className="font-bold mr-1.5 opacity-60 text-white">{comments[0].username}</span>
                      {comments[0].text}
                   </p>
                 </>
               ) : (
                 <p className="text-[0.8125rem] text-white/40 italic">Sê o primeiro a comentar...</p>
               )}
            </div>
         </div>

         {auth.currentUser?.uid !== product?.sellerId && (
           <div className="flex items-center gap-2 mt-6 pt-6">
            <button onClick={handleMessageClick} className="flex items-center gap-2 px-6 h-12 shiny-button rounded-full flex-1 justify-center shadow-2xl text-white font-black text-[0.875rem] tracking-[0.2em] uppercase">
               MENSAGEM AO VENDEDOR
            </button>
          </div>
         )}
         <AdBanner useImageBackground={true} className="mt-4 mx-4" />
      </div>

      {/* Related Videos */}
      <div className="bg-surface pt-2">
         <motion.div 
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="sticky top-0 z-30 py-4 px-3 overflow-x-auto hide-scrollbar flex gap-2 mb-2 bg-transparent"
         >
            {CATEGORIES_ALL.map((cat, idx) => (
               <motion.div 
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-shrink-0 px-5 py-2 rounded-[3px] text-[0.75rem] font-bold uppercase tracking-widest cursor-pointer transition-all duration-200 whitespace-nowrap
                  ${activeCategory === cat ? 'bg-white text-black shadow-lg scale-105' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
               >
                  {cat}
               </motion.div>
            ))}
         </motion.div>

         <div className="grid grid-cols-1 gap-0 pb-4">
            {relatedVideos.filter(item => activeCategory === 'TUDO' || item.category === activeCategory).map((item, index) => (
                <div key={`related-${item.id}-${index}`} className="flex flex-col bg-background mb-8">
                  <div className="relative w-full h-[250px] bg-black cursor-pointer overflow-hidden" onClick={() => { router.push(`/short/${item.id}`); window.scrollTo(0,0); }}>
                     {(() => {
                        const ytMatch = item.videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
                        if (ytMatch && ytMatch[1]) {
                           return <img src={`https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`} className="w-full h-full object-cover" />;
                        }
                        return <video src={item.videoUrl} className="w-full h-full object-cover" muted loop playsInline />;
                      })()}
                   </div>
                   <div className="p-3 flex gap-4 flex-1 items-start">
                      <img src={item.sellerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.sellerId}`} className="w-14 h-14 rounded-full object-cover shrink-0 bg-background" />
                      <div className="flex flex-col flex-1 min-w-0">
                         <h3 className="text-[1.05rem] leading-snug line-clamp-3">
                            <span className="font-bold text-white">{item.name}</span>
                            {item.description ? <span className="font-normal text-white/90 ml-1">- {item.description}</span> : ''}
                         </h3>
                         <div className="mt-1 flex items-center text-white/60 text-[0.8rem]">
                            <span>{item.views || 0} visualizações &bull; {formatRelativeTime(item.createdAt)}</span>
                         </div>
                      </div>
                   </div>
                </div>
             ))}
          </div>
       </div>

      {/* Comments List Modal */}
      <AnimatePresence>
      {isCommentsOpen && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed inset-0 z-50 glass-black flex flex-col pointer-events-auto h-screen w-full">
            <div className="flex items-center justify-between p-4 glass-black shrink-0">
              <h2 className="text-[1.125rem] font-bold text-white">Comentários</h2>
              <button onClick={() => setIsCommentsOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-white"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
               {comments.map((comment) => (
                  <div key={comment.id} className="flex flex-col gap-3">
                     <div className="flex gap-3">
                        <img src={comment.avatar} className="w-8 h-8 rounded-full shrink-0 object-cover" />
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-end mb-1">
                             <span className="text-[0.85rem] font-bold text-on-surface/90">{comment.username}</span>
                             <span className="text-[0.7rem] text-on-surface-variant font-medium">{comment.time}</span>
                           </div>
                           <p className="text-[0.875rem] text-on-surface leading-snug break-words">{comment.text}</p>
                           <div className="flex items-center gap-4 mt-2 text-on-surface-variant">
                              <button onClick={() => toggleLike(comment.id)} className={`flex items-center gap-1.5 ${comment.userLiked ? 'text-primary font-bold' : ''}`}>
                                 <ThumbsUp size={14} className={comment.userLiked ? 'fill-primary' : ''} />
                                 <span>{comment.likes}</span>
                              </button>
                           </div>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
            <div className="flex flex-col bg-[#1a1a1a] shrink-0 pb-10 pt-4 border-none">
              <div className="px-4 flex items-center gap-3">
                 <img src={auth.currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.currentUser?.uid || 'guest'}`} className="w-12 h-12 rounded-full shrink-0 object-cover" />
                 <div className="flex-1 bg-zinc-800 rounded-full flex items-center px-6 h-14 border-none">
                   <input 
                      ref={commentInputRef}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                      placeholder="Adicione um comentário..." 
                      className="bg-transparent outline-none w-full text-lg text-white placeholder:text-white/40 font-bold" 
                   />
                   <button onClick={handleSendComment} className={`ml-3 w-10 h-10 flex items-center justify-center rounded-full ${commentText.trim() ? 'bg-primary text-black' : 'opacity-20'}`}><Send size={18} fill="currentColor" /></button>
                 </div>
              </div>
            </div>
          </motion.div>
      )}
      </AnimatePresence>

      <ReportModal isOpen={reportModalOpen} onClose={() => { setReportModalOpen(false); setShowOptionsMenu(false); }} targetId={id} targetType="short" reportedUserId={product.sellerId} />
    </div>
  );
}
