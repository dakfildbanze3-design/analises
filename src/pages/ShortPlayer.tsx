import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Loader2, ThumbsUp, ThumbsDown, MessageSquare, Share2, Bookmark, ShoppingBag, X, Send, MapPin, Phone, Tag, MoreVertical, Download, Trash2, Flag } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { doc, getDoc, collection, query, limit, getDocs, addDoc, serverTimestamp, onSnapshot, orderBy, updateDoc, arrayUnion, arrayRemove, increment, deleteDoc } from 'firebase/firestore';
import { checkIsFollowing, followUser, unfollowUser } from '../services/followService';
import { notificationService } from '../services/notificationService';
import { formatRelativeTime } from '../lib/dateUtils';
import { shareContent } from '../lib/shareUtils';
import { chatService } from '../services/chatService';
import AdBanner from '../components/AdBanner';
import ReportModal from '../components/ReportModal';

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
  const navigate = useNavigate();
  const { id } = useParams();
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

  const toggleDislike = async (commentId: string, parentId: string | null = null) => {
    if (!auth.currentUser) {
        alert("Faça login para não curtir.");
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
    if (targetComment.userDisliked) {
        await updateDoc(commentRef, { dislikedBy: arrayRemove(uid) });
    } else {
        await updateDoc(commentRef, { dislikedBy: arrayUnion(uid), likedBy: arrayRemove(uid) });
    }
  };

  const handleReplyClick = (commentId: string, username: string) => {
    setReplyingTo({ id: commentId, username });
    setTimeout(() => {
        commentInputRef.current?.focus();
    }, 100);
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

        const docRef = await addDoc(collection(db, 'products', id, 'comments'), {
            text: textToSave,
            userId: auth.currentUser.uid,
            username: finalUsername,
            avatar: finalAvatar,
            parentId: replyingTo ? replyingTo.id : null,
            likedBy: [],
            dislikedBy: [],
            createdAt: serverTimestamp()
        });

        // Trigger Notification
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
        alert("Erro ao adicionar comentário.");
    }
  };

  useEffect(() => {
    const incrementView = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'products', id);
        await updateDoc(docRef, {
          views: increment(1)
        });
      } catch (e) {
        console.error("Erro ao incrementar visualizações:", e);
      }
    };
    
    const fetchVideoAndRelated = async () => {
      if (!id) return;
      try {
        // Fetch current video
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const productData = docSnap.data();
          setProduct({ id: docSnap.id, ...productData });
          
          if (auth.currentUser) {
            setIsLiked((productData.likedBy || []).includes(auth.currentUser.uid));
          }
          
          // Increment view count
          incrementView();
        }

        // Fetch related videos
        const q = query(collection(db, 'products'), limit(30));
        const relSnap = await getDocs(q);
        const related = relSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter((p: any) => p.id !== id && (p.videoUrl || p.productType === 'short'));
        setRelatedVideos(related);
        
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `products/${id}`);
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
      navigate('/login');
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
      console.error("Erro", error);
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
        // Trigger Notification
        notificationService.createNotification({
          type: 'like',
          toUserId: product.sellerId,
          postId: id,
          text: 'curtiu seu post'
        });
      }
    } catch (error) {
      setIsLiked(previousState);
      console.error("Erro ao curtir:", error);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleMessageClick = async () => {
    if (!auth.currentUser) {
      alert("Faça login para enviar mensagens");
      navigate('/login');
      return;
    }
    if (!product?.sellerId) return;

    try {
      const chatId = await chatService.getOrCreateChat(
        product.sellerId,
        product.sellerName,
        product.sellerAvatar
      );
      navigate(`/chat/${chatId}`);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteProduct = async () => {
    if (!id || !auth.currentUser) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      navigate('/profile');
    } catch (e) {
      alert("Erro ao excluir. Tente novamente.");
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
        <button onClick={() => navigate(-1)} className="bg-primary text-on-primary px-4 py-2 rounded-[3px] font-bold">
            Voltar
        </button>
      </div>
    );
  }

  const isOwner = auth.currentUser?.uid === product.sellerId;

  return (
    <div className="min-h-screen bg-background pb-12 w-full max-w-md mx-auto">
      {/* Video Box (16:9 Standard Player) */}
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
                   controls
                   autoPlay
                   loop={!product.trimEnd}
                   playsInline
                   muted={product.videoMuted}
                   onTimeUpdate={(e) => {
                      if (product.trimEnd && product.trimEnd > 0) {
                          if (e.currentTarget.currentTime >= product.trimEnd) {
                              e.currentTarget.currentTime = product.trimStart || 0;
                              e.currentTarget.play();
                          }
                      }
                   }}
                 />
              );
           })()
        ) : (
            <div className="w-full h-full flex items-center justify-center">
                <img src={product.image || product.images?.[0]} className="w-full h-full object-cover opacity-80" />
            </div>
        )}
        
      {/* Options Menu (Back button removed to rely on TopBar) */}
      <div className="absolute top-3 right-3 z-50">
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
                {/* Available for everyone */}
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
                  <>
                    <button 
                      onClick={handleDeleteProduct}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                    >
                      <Trash2 size={18} className="text-white" />
                      <span className="text-[0.875rem] font-bold text-white">Excluir</span>
                    </button>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Badges Row (Price, Location, Phone, Category) - STICKY exactly below the sticky video */}
      <div className="flex items-center gap-[4px] px-1 py-3 glass-black sticky top-[56.25vw] md:top-[252px] z-30 overflow-x-auto hide-scrollbar shadow-xl">
          {/* Price Badge - High Visibility */}
          <div className="flex items-center gap-1.5 px-4 py-2 bg-blue-900 border border-blue-800 rounded-[3px] text-[0.875rem] text-white font-black shadow-lg shadow-black whitespace-nowrap shrink-0 transition-transform active:scale-95">
             <ShoppingBag size={14} className="opacity-80" />
             <span>{product.price} MT</span>
          </div>
          
          {product.location && (
             <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 rounded-[3px] text-[0.75rem] text-white/90 font-bold shadow-sm border border-white/5 whitespace-nowrap shrink-0">
                <MapPin size={14} className="opacity-70" />
                <span>{product.location}</span>
             </div>
          )}
          {product.category && (
             <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/80 rounded-[3px] text-[0.75rem] text-primary font-black shadow-sm border border-primary/20 whitespace-nowrap shrink-0">
                <Tag size={14} className="opacity-70" />
                <span>{product.category}</span>
             </div>
          )}
          {product.sellerPhone && (
             <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 rounded-[3px] text-[0.75rem] text-white/90 font-bold shadow-sm border border-white/5 whitespace-nowrap shrink-0">
                <Phone size={14} className="opacity-70" />
                <span>{product.sellerPhone}</span>
             </div>
          )}
      </div>

      {/* Info details */}
      <div className="px-4 py-2.5">

         {/* Product Info Block: Avatar | Divider | Name - Description */}
         <div className="flex items-center mb-3">
            <img 
               src={product.sellerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${product.sellerId}`} 
               className="w-[52px] h-[52px] rounded-full object-cover border-2 border-primary/20 shrink-0 cursor-pointer shadow-md" 
               onClick={() => navigate(`/user/${product.sellerId}`)}
               onError={(e) => {
                 (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${product.sellerId}`;
               }}
            />
            
            {/* Space instead of vertical separator */}
            <div className="w-[10px] shrink-0" />

            <div className="flex-1 min-w-0 flex flex-col">
               {/* Product Details: Name - Description */}
               <p 
                  onClick={() => setIsTextExpanded(!isTextExpanded)}
                  className={`text-[0.9375rem] leading-relaxed text-on-surface cursor-pointer transition-all ${isTextExpanded ? '' : 'line-clamp-2'}`}
               >
                 <span className="font-bold">{product.name}</span> - <span className="opacity-90">{product.description}</span>
               </p>
            </div>
         </div>

         {/* Stats and Actions Row */}
         <div className="flex items-center justify-between mt-3">
            <div className="flex flex-col flex-1 min-w-0">
               <div className="text-[0.75rem] text-on-surface-variant flex items-center gap-1.5 font-medium truncate">
                  <span 
                     onClick={() => navigate(`/user/${product.sellerId}`)}
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
            
            {/* Right: Follow, Like & Share */}
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
                      shareContent(
                        product.name,
                        `Olha este vídeo no Bazar: ${product.name}`,
                        `${window.location.origin}/short/${product.id}`
                      );
                    }
                  }}
                  className="w-8 h-8 flex items-center justify-center text-on-surface hover:bg-surface-container rounded-full transition-colors flex-shrink-0 active:scale-95"
                >
                   <Share2 size={20} />
                </button>
            </div>
         </div>

         <div className="h-[1px] w-full bg-outline-variant/10 mt-3" />

         {/* Youtube Style Comments Box immediately under the info row */}
         <div 
            onClick={() => setIsCommentsOpen(true)}
            className="bg-zinc-900/40 rounded-[10px] p-3 mt-3 w-full cursor-pointer hover:bg-zinc-800 transition-colors border border-white/5"
         >
            <div className="flex items-center gap-2 mb-2">
                <span className="text-[0.875rem] font-bold text-white">Comentários</span>
                <span className="text-[0.75rem] text-white/40">{comments.reduce((acc, c) => acc + 1 + c.replies.length, 0)}</span>
            </div>
            <div className="flex gap-2 items-start">
               {comments.length > 0 ? (
                 <>
                   <img 
                     src={comments[0].avatar} 
                     alt="Avatar Comentário" 
                     loading="lazy"
                     decoding="async"
                     className="w-6 h-6 rounded-full bg-zinc-800 flex-shrink-0 object-cover border border-white/10"
                     referrerPolicy="no-referrer"
                   />
                   <p className="text-[0.8125rem] text-white/90 line-clamp-2 leading-snug">
                      <span className="font-bold mr-1.5 opacity-60 text-white">{comments[0].username}</span>
                      {comments[0].text}
                   </p>
                 </>
               ) : (
                 <p className="text-[0.8125rem] text-white/40 italic">
                    Sê o primeiro a comentar...
                 </p>
               )}
            </div>
         </div>

         {/* Extra Actions for the Product (WhatsApp) - Hidden if own post */}
         {auth.currentUser?.uid !== product?.sellerId && (
           <div className="flex items-center gap-2 mt-6 pt-6 border-t border-white/10">
            <button 
                onClick={() => {
                   const phoneStr = product?.sellerPhone || '';
                   const cleanPhone = phoneStr.replace(/\D/g, '');
                   if (cleanPhone) {
                       window.open(`https://wa.me/${cleanPhone}`, '_blank');
                   } else {
                       alert('O vendedor não disponibilizou número de WhatsApp.');
                   }
                }}
                className="flex items-center gap-2 px-6 h-12 shiny-button rounded-full flex-1 justify-center shadow-2xl text-white font-black text-[0.875rem] tracking-[0.2em] uppercase"
            >
               CONTACTAR VENDEDOR
            </button>
         </div>
         )}

         <AdBanner useImageBackground={true} className="mt-4 mx-4" />
      </div>

      {/* Up Next List (Grid of 2 horizontal video cards) */}
      <div className="border-t border-outline-variant/10 bg-surface px-1.5 py-4">
         <div className="grid grid-cols-2 gap-[6px]">
            {relatedVideos.map((item, index) => (
                <div 
                  key={`related-${item.id}-${index}`}
                  className="flex flex-col bg-background rounded-[10px] overflow-hidden shadow-sm border border-outline-variant/5 h-full"
                >
                  {/* Video Content FIRST */}
                  <div 
                     className="relative w-full aspect-video bg-black cursor-pointer overflow-hidden"
                     onClick={() => {
                        navigate(`/short/${item.id}`);
                        window.scrollTo(0,0);
                     }}
                  >
                     {(() => {
                        const ytMatch = item.videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
                        if (ytMatch && ytMatch[1]) {
                           return (
                             <img 
                               src={`https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`} 
                               className="w-full h-full object-cover" 
                               alt={item.name} 
                             />
                           );
                        }
                        return (
                           <video 
                              src={item.videoUrl} 
                              className="w-full h-full object-cover"
                              muted
                              loop
                              playsInline
                           />
                         );
                      })()}
                      {/* Overlay Stats/Video Tag */}
                      <div className="absolute top-1.5 right-1.5 bg-black/60 text-white text-[0.5rem] font-black px-1.5 py-0.5 rounded-[2px] tracking-widest uppercase">
                         VÍDEO
                      </div>
                   </div>
 
                   {/* Title & Price BELOW Video - Optimized for 2-column grid */}
                   <div className="p-2 flex flex-col flex-1">
                      <h3 className="text-[0.75rem] leading-snug font-bold text-on-surface line-clamp-2 min-h-[2.4em]">
                         {item.name}
                      </h3>
                      
                      <div className="mt-2 flex items-center justify-between">
                         <span className="text-[0.6875rem] font-black text-blue-800">
                            {item.price} MT
                         </span>
                         <span className="text-[0.625rem] text-on-surface-variant font-medium opacity-60">
                            {item.views || 0} v
                         </span>
                      </div>
                   </div>
                </div>
             ))}
          </div>
       </div>

      {/* Comments Full Screen (Preta Brilhante) */}
      <AnimatePresence>
      {isCommentsOpen && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 glass-black flex flex-col pointer-events-auto h-screen w-full"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 glass-black shrink-0">
              <h2 className="text-[1.125rem] font-bold text-white">Comentários</h2>
              <button 
                 onClick={() => setIsCommentsOpen(false)} 
                 className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"
                 aria-label="Gravar e Sair"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
               {comments.map((comment) => (
                  <div key={comment.id} className="flex flex-col gap-3">
                     <div className="flex gap-3">
                        <img src={comment.avatar} className="w-8 h-8 rounded-full border border-white/20 shrink-0 object-cover" />
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-end mb-1">
                             <span className="text-[0.85rem] font-bold text-on-surface/90">{comment.username}</span>
                             <span className="text-[0.7rem] text-on-surface-variant font-medium">{comment.time}</span>
                           </div>
                           <p className="text-[0.875rem] text-on-surface leading-snug break-words">{comment.text}</p>
                           {/* Action Line */}
                           <div className="flex items-center gap-4 mt-2 text-on-surface-variant">
                              <button onClick={() => toggleLike(comment.id)} className={`flex items-center gap-1.5 transition-colors ${comment.userLiked ? 'text-primary font-bold' : 'hover:text-on-surface'}`}>
                                 <ThumbsUp size={14} className={comment.userLiked ? 'fill-primary text-primary' : ''} />
                                 <span className="text-[0.75rem]">{comment.likes > 0 ? comment.likes : ''}</span>
                              </button>
                              <button onClick={() => toggleDislike(comment.id)} className={`flex items-center gap-1.5 transition-colors ${comment.userDisliked ? 'text-error font-bold' : 'hover:text-on-surface'}`}>
                                 <ThumbsDown size={14} className={comment.userDisliked ? 'fill-error text-error' : ''} />
                              </button>
                              <button onClick={() => handleReplyClick(comment.id, comment.username)} className="text-[0.75rem] font-bold hover:text-on-surface transition-colors">Responder</button>
                           </div>
                        </div>
                     </div>
                     
                     {/* Replies */}
                     {comment.replies.map(reply => (
                        <div key={reply.id} className="flex gap-3 ml-11 relative">
                           {/* Connecting Line */}
                           <div className="absolute -left-7 top-0 w-6 h-6 border-l-2 border-b-2 border-white/20 rounded-bl-[12px]"></div>
                           
                           <img src={reply.avatar} className="w-7 h-7 rounded-full border border-white/20 shrink-0 object-cover" />
                           <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-[0.85rem] font-bold text-on-surface/90">{reply.username}</span>
                                <span className="text-[0.7rem] text-on-surface-variant font-medium">{reply.time}</span>
                              </div>
                              <p className="text-[0.875rem] text-on-surface leading-snug break-words">{reply.text}</p>
                              {/* Action Line */}
                              <div className="flex items-center gap-4 mt-2 text-on-surface-variant">
                                 <button onClick={() => toggleLike(reply.id, comment.id)} className={`flex items-center gap-1.5 transition-colors ${reply.userLiked ? 'text-primary font-bold' : 'hover:text-on-surface'}`}>
                                    <ThumbsUp size={14} className={reply.userLiked ? 'fill-primary text-primary' : ''} />
                                    <span className="text-[0.75rem]">{reply.likes > 0 ? reply.likes : ''}</span>
                                 </button>
                                 <button onClick={() => toggleDislike(reply.id, comment.id)} className={`flex items-center gap-1.5 transition-colors ${reply.userDisliked ? 'text-error font-bold' : 'hover:text-on-surface'}`}>
                                    <ThumbsDown size={14} className={reply.userDisliked ? 'fill-error text-error' : ''} />
                                 </button>
                                 {/* Only single level nesting for replies */}
                                 <button onClick={() => handleReplyClick(comment.id, reply.username)} className="text-[0.75rem] font-bold hover:text-on-surface transition-colors">Responder</button>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               ))}
            </div>

            {/* Input area Footer */}
            <div className="flex flex-col bg-black shrink-0 border-t border-white/5">
               {replyingTo && (
                  <div className="px-4 py-2 bg-white/5 flex items-center justify-between">
                     <span className="text-[0.75rem] text-white/50">
                        A responder a <span className="font-bold text-white/80">{replyingTo.username}</span>
                     </span>
                     <button onClick={() => setReplyingTo(null)} className="text-white/40 hover:text-white p-1">
                        <X size={14} />
                     </button>
                  </div>
               )}
               <div className="p-3 flex items-center gap-3">
                 <img src={auth.currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.currentUser?.uid || 'guest'}`} className="w-8 h-8 rounded-full bg-zinc-800 shrink-0 object-cover border border-white/10" />
                 <div className="flex-1 bg-zinc-900 rounded-full flex items-center px-4 h-10 border border-white/10">
                   <input 
                      ref={commentInputRef}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                      type="text" 
                      placeholder="Adicione um comentário..." 
                      className="bg-transparent border-none outline-none w-full text-[0.875rem] text-white placeholder:text-white/30" 
                   />
                   <button 
                      onClick={handleSendComment}
                      disabled={!commentText.trim()}
                      className={`ml-2 w-7 h-7 flex items-center justify-center shrink-0 rounded-full transition-all ${commentText.trim() ? 'bg-blue-900 text-white' : 'opacity-20 text-white'}`}
                   >
                      <Send size={14} fill="currentColor" />
                   </button>
                 </div>
               </div>
               <div className="h-6" /> {/* Spacer for bottom area */}
            </div>
          </motion.div>
      )}
      </AnimatePresence>

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        targetId={product.id}
        targetType={product.productType === 'short' ? 'short' : 'product'}
        reportedUserId={product.sellerId}
      />
    </div>
  );
}
