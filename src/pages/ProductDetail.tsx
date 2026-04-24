import React, { useState, useEffect } from 'react';
import { Heart, Share2, ShoppingBag, Loader2, ArrowLeft, X, Send, MoreVertical, Download, Trash2, Flag } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { doc, getDoc, updateDoc, increment, arrayUnion, arrayRemove, onSnapshot, collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp, deleteDoc, where } from 'firebase/firestore';
import { checkIsFollowing, followUser, unfollowUser } from '../services/followService';
import { formatRelativeTime } from '../lib/dateUtils';
import { shareContent } from '../lib/shareUtils';
import { notificationService } from '../services/notificationService';
import { chatService } from '../services/chatService';
import AdBanner from '../components/AdBanner';
import ReportModal from '../components/ReportModal';
import { useRef } from 'react';

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
  const navigate = useNavigate();
  const { id } = useParams();
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
    if (!product) return;

    const schemaData = {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": product.name,
      "image": product.image || product.images?.[0],
      "description": product.description || "Produto disponível no Boladas",
      "offers": {
        "@type": "Offer",
        "url": window.location.href,
        "priceCurrency": "AOA",
        "price": product.price,
        "availability": "https://schema.org/InStock",
        "seller": {
          "@type": "Person",
          "name": seller?.displayName || "Vendedor do Boladas"
        }
      }
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.innerHTML = JSON.stringify(schemaData);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [product, seller]);

  useEffect(() => {
    if (!id) return;
    const path = `products/${id}`;
    
    // Initial view increment
    const docRef = doc(db, 'products', id);
    updateDoc(docRef, { views: increment(1) }).catch(e => console.error("Error updating views:", e));

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const productData = docSnap.data();
        setProduct({ id: docSnap.id, ...productData });
        
        if (auth.currentUser) {
          setIsLiked((productData.likedBy || []).includes(auth.currentUser.uid));
        }

        // Fetch seller info
        if (productData.sellerId) {
          getDoc(doc(db, 'users', productData.sellerId)).then(sellerDoc => {
            if (sellerDoc.exists()) {
              setSeller(sellerDoc.data());
            }
          }).catch(err => console.warn("Could not fetch seller info:", err));
        }
      } else {
        setProduct(null);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setLoading(false);
    });

    // Fetch comments
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
        const q = query(
          collection(db, 'products'),
          where('category', '==', product.category),
          limit(10)
        );
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
      navigate('/login');
      return;
    }
    if (product.sellerId === auth.currentUser.uid) {
       return;
    }

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
      console.error("Erro ao seguir", error);
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
        seller?.displayName,
        seller?.avatarUrl
      );
      navigate(`/chat/${chatId}`);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleReplyClick = (commentId: string, username: string) => {
    setReplyingTo({ id: commentId, username });
    setTimeout(() => {
        commentInputRef.current?.focus();
    }, 100);
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
      console.error("Error sending comment:", e);
    } finally {
      setCommentLoading(false);
    }
  };

  const toggleCommentLike = async (commentId: string, parentId: string | null = null) => {
    if (!auth.currentUser || !id) return;
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
    try {
      if (targetComment.userLiked) {
        await updateDoc(commentRef, { likedBy: arrayRemove(uid) });
      } else {
        await updateDoc(commentRef, { 
          likedBy: arrayUnion(uid),
          dislikedBy: arrayRemove(uid)
        });
      }
    } catch (e) {
      console.error("Error toggling like:", e);
    }
  };

  const toggleCommentDislike = async (commentId: string, parentId: string | null = null) => {
    if (!auth.currentUser || !id) return;
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
    try {
      if (targetComment.userDisliked) {
        await updateDoc(commentRef, { dislikedBy: arrayRemove(uid) });
      } else {
        await updateDoc(commentRef, { 
          dislikedBy: arrayUnion(uid),
          likedBy: arrayRemove(uid)
        });
      }
    } catch (e) {
      console.error("Error toggling dislike:", e);
    }
  };

  const renderImageGrid = () => {
    const images = product?.images || [];
    if (images.length === 0) return (
      <img 
        className="w-full h-full object-cover" 
        src='https://picsum.photos/seed/placeholder/800/800'
        alt="Placeholder"
      />
    );

    if (images.length === 1) {
      return (
        <img 
          src={images[0]} 
          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" 
          alt="Product"
          onClick={() => setSelectedFullImage(images[0])}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/placeholder/800/800';
          }}
        />
      );
    }

    const gridClass = images.length === 2 ? 'grid-cols-1 grid-rows-2' : images.length === 3 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-2 grid-rows-2';

    return (
      <div className={`grid w-full h-full gap-0.5 ${gridClass}`}>
        {images.slice(0, 4).map((img : string, idx : number) => (
          <div 
            key={idx} 
            className={`relative overflow-hidden cursor-pointer hover:opacity-90 transition-opacity ${images.length === 3 && idx === 0 ? 'col-span-2' : ''}`}
            onClick={() => setSelectedFullImage(img)}
          >
            <img 
              src={img} 
              className="w-full h-full object-cover" 
              alt={`Product image ${idx}`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/placeholder/800/800';
              }}
            />
            {idx === 3 && images.length > 4 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-[1.25rem]">
                +{images.length - 3}
              </div>
            )}
          </div>
        ))}
      </div>
    );
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
      <div className="min-h-screen pt-12 flex items-center justify-center font-sans">
        <Loader2 size={32} className="animate-spin text-zinc-800" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen pt-12 flex flex-col items-center justify-center font-sans">
        <p className="text-on-surface-variant mb-4 font-black uppercase text-[0.875rem]">Produto não encontrado.</p>
        <button onClick={() => navigate('/')} className="text-blue-900 font-bold uppercase text-[0.75rem] tracking-widest">Voltar ao início</button>
      </div>
    );
  }

  const isOwner = auth.currentUser?.uid === product.sellerId;

  return (
    <div className="bg-background min-h-screen font-sans">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="pb-8 space-y-[3px]"
      >
        <section className="relative w-full h-[530px] overflow-hidden">
          {renderImageGrid()}
        </section>

        {/* Sticky Label Bar */}
        <div className="glass-black sticky top-12 z-40 py-3 px-4 -mt-[3px]">
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
            <div className="bg-zinc-800/50 px-2 py-1 rounded-[3px] border border-zinc-800/30 flex flex-col items-center min-w-[80px]">
              <span className="text-[0.625rem] text-on-surface-variant/60 uppercase font-black leading-none mb-1 tracking-tight">Preço</span>
              <span className="text-[0.875rem] font-black text-on-surface leading-none">{product.price} MT</span>
            </div>
            <div className="bg-surface-container-highest px-3 py-1 rounded-[3px] flex flex-col min-w-[90px]">
              <span className="text-[0.625rem] text-on-surface-variant/60 uppercase font-black leading-none mb-1 tracking-tight">Telefone</span>
              <span className="text-[0.75rem] font-bold text-on-surface leading-none truncate">{product.sellerPhone || 'Indisp.'}</span>
            </div>
            <div className="bg-surface-container-highest px-3 py-1 rounded-[3px] flex flex-col min-w-[90px]">
              <span className="text-[0.625rem] text-on-surface-variant/60 uppercase font-black leading-none mb-1 tracking-tight">Localização</span>
              <span className="text-[0.75rem] font-bold text-on-surface leading-none truncate">{product.location || 'Maputo'}</span>
            </div>
            <div className="bg-surface-container-highest px-3 py-1 rounded-[3px] flex flex-col min-w-[90px]">
              <span className="text-[0.625rem] text-on-surface-variant/60 uppercase font-black leading-none mb-1 tracking-tight">Categoria</span>
              <span className="text-[0.75rem] font-bold text-on-surface leading-none truncate">{product.category || 'Geral'}</span>
            </div>
          </div>
        </div>

        <section className="px-0 relative z-10">
          <div className="bg-surface p-4 flex flex-col gap-[3px]">

            <div 
              onClick={() => setIsDescExpanded(!isDescExpanded)}
              className="mb-4 cursor-pointer"
            >
              <p className={`text-[0.9375rem] text-on-surface leading-snug ${isDescExpanded ? '' : 'line-clamp-3'}`}>
                <span className="font-bold uppercase italic">{product.name}</span>
                {" - "}
                <span className="text-on-surface-variant/90 font-medium">{product.description}</span>
              </p>
              {!isDescExpanded && product.description?.length > 100 && (
                 <span className="text-[0.75rem] font-bold text-on-surface-variant mt-1 block uppercase tracking-widest">Ler mais...</span>
              )}
            </div>

            {seller && (
               <div className="flex flex-col gap-4">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <img 
                       src={seller.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${product.sellerId}`} 
                       alt="Seller Avatar" 
                       className="w-10 h-10 rounded-full object-cover border border-outline-variant/20 shadow-sm"
                     />
                     <div className="flex flex-col">
                       <h3 className="text-[0.875rem] font-bold text-on-surface leading-none mb-1 tracking-tight">
                         {seller.displayName || 'Usuário'}
                         <span className="text-[0.6875rem] text-on-surface-variant font-medium ml-1.5 opacity-60"> • {formatRelativeTime(product.createdAt)}</span>
                       </h3>
                       <div className="flex items-center gap-1.5 text-[0.6875rem] text-on-surface-variant font-medium whitespace-nowrap overflow-x-auto hide-scrollbar max-w-full">
                         <span>{product.views || 0} visualizações</span>
                          <span className="opacity-30">•</span>
                          <span className="flex items-center gap-0.5"><Heart size={10} className="fill-on-surface-variant" /> {product.likedBy?.length || 0} curtidas</span>
                       </div>
                     </div>
                   </div>
                   
                   <div className="flex items-center gap-1">
                     <button 
                       onClick={handleLikePost}
                       disabled={likeLoading}
                       className={`w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-95 ${isLiked ? 'text-blue-900' : 'text-on-surface-variant'}`}
                     >
                       <Heart size={20} className={isLiked ? 'fill-blue-900' : ''} />
                     </button>
                     <button 
                       onClick={() => shareContent(product.name, `Veja este post no Bazar: ${product.name}`, window.location.href)}
                       className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant active:scale-95 transition-transform"
                     >
                       <Share2 size={20} />
                     </button>
                     {(!auth.currentUser || product?.sellerId !== auth.currentUser.uid) && (
                       <button 
                         onClick={handleFollowToggle}
                         disabled={followLoading}
                         className={`${isFollowing ? 'bg-surface-container-highest text-on-surface' : 'bg-blue-900 text-white'} h-[28px] flex items-center justify-center text-[0.6875rem] px-4 font-bold rounded-[3px] whitespace-nowrap active:scale-95 transition-all shadow-md ml-1`}
                       >
                         {isFollowing ? 'SEGUINDO' : 'SEGUIR'}
                       </button>
                     )}
                   </div>
                 </div>

                 <div className="pt-[3px]"></div>

                 {/* Comments Preview */}
                 <div 
                   onClick={() => setShowComments(true)}
                   className="bg-surface-container-low p-3 rounded-[3px] border border-outline-variant/10 cursor-pointer active:opacity-80 transition-all my-2 group"
                 >
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-[0.75rem] font-bold text-on-surface uppercase tracking-tight group-hover:text-on-surface-variant transition-colors">Comentários</span>
                     <span className="text-[0.625rem] font-bold text-on-surface-variant tracking-widest uppercase">VER TUDO ({comments.length})</span>
                   </div>
                   {comments.length > 0 ? (
                     <div className="flex gap-2 items-start">
                       <img 
                         src={comments[0].avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comments[0].userId}`} 
                         className="w-6 h-6 rounded-full bg-zinc-800 flex-shrink-0 object-cover border border-outline-variant/10"
                         referrerPolicy="no-referrer"
                       />
                       <p className="text-[0.8125rem] text-on-surface line-clamp-2 leading-snug">
                         <span className="font-bold opacity-80 text-on-surface">{comments[0].username || 'Usuário'}</span>
                         <span className="opacity-40 text-on-surface-variant text-[0.75rem] mx-1">• {formatRelativeTime(comments[0].createdAt)}</span>
                         <span className="text-on-surface-variant/90">{comments[0].text}</span>
                       </p>
                     </div>
                   ) : (
                     <p className="text-[0.8125rem] text-on-surface-variant/40 italic">Sê o primeiro a comentar...</p>
                   )}
                 </div>

                 {auth.currentUser?.uid !== product.sellerId && (
                   <div className="flex gap-2 mt-2">
                     <button 
                       onClick={() => window.open(`https://wa.me/${product.sellerPhone?.replace(/\D/g, '')}`, '_blank')}
                       className="flex-1 shiny-button h-[42px] flex items-center justify-center text-[0.75rem] font-black tracking-[0.2em] rounded-full text-white shadow-xl uppercase"
                     >
                       CONTACTAR VENDEDOR
                     </button>
                   </div>
                 )}
               </div>
            )}

            {/* Map and Suggestions container */}
            <div className="mt-2 flex flex-col pt-2">
              <h2 className="text-[0.75rem] font-bold text-on-surface uppercase tracking-widest mb-3">Localização</h2>
              <div className="w-full h-[130px] bg-zinc-800 relative z-0 mb-6 rounded-[10px] overflow-hidden shadow-md">
                <iframe 
                  title="Google Maps Location"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(product.location || 'Maputo')}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                  className="w-full h-full border-0"
                  loading="lazy"
                  allowFullScreen
                ></iframe>
              </div>

               {suggestions.length > 0 && (
                <div className="-mx-4 mt-8 pb-8">
                  <div className="flex items-center justify-between px-4 mb-4">
                    <h2 className="text-[0.875rem] font-black text-on-surface uppercase tracking-[0.2em]">Podes Gostar Também</h2>
                    <div className="h-px flex-1 bg-outline-variant/10 ml-4"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-[4px] bg-background">
                    {suggestions.map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          navigate(`/product/${item.id}`);
                        }}
                        className="w-full bg-surface-container-low flex flex-col rounded-[10px] overflow-hidden cursor-pointer active:scale-[0.98] transition-all group"
                      >
                        <div className="w-full aspect-[4/5] relative overflow-hidden bg-surface-container">
                          <img 
                            src={item.image || item.images?.[0] || 'https://picsum.photos/seed/placeholder/800/800'} 
                            alt={item.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/placeholder/800/800';
                            }}
                          />
                        </div>
                        <div className="pt-3 px-3 pb-4">
                           <h3 className="text-[0.75rem] leading-snug line-clamp-2 min-h-[2.5em]">
                             <span className="font-bold text-on-surface uppercase tracking-tight">{item.name}</span>
                             {item.description ? <span className="text-on-surface-variant/70 font-medium lowercase"> - {item.description}</span> : ''}
                           </h3>
                           <div className="mt-2 flex items-center justify-between">
                             <p className="text-[0.9375rem] font-black text-blue-900">{item.price} <span className="text-[0.625rem] font-bold">MT</span></p>
                             <div className="w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center">
                               <ShoppingBag size={12} className="text-on-surface-variant" />
                             </div>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </motion.div>

      {/* Comments Drawer */}
      <AnimatePresence>
        {showComments && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] glass-black flex flex-col h-screen overflow-hidden font-sans"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10 glass-black">
              <h2 className="text-[1.125rem] font-black tracking-tight text-on-surface uppercase leading-none">Comentários ({comments.length})</h2>
              <button 
                onClick={() => setShowComments(false)} 
                className="p-2 hover:bg-surface-container-highest rounded-full text-on-surface transition-colors active:scale-95"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0 flex flex-col hide-scrollbar">
              {comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30 text-center py-10">
                  <p className="text-[0.875rem] font-black uppercase tracking-widest leading-none mb-1">Nenhum comentário</p>
                  <p className="text-[0.75rem]">Inicia a conversa!</p>
                </div>
              ) : (
                comments.map((comment, index) => (
                  <div key={comment.id} className={`${index % 2 === 0 ? 'bg-surface-container-low' : 'bg-surface-container'} px-4 py-3 flex flex-col gap-3`}>
                    <div className="flex gap-3">
                      <img 
                        src={comment.avatar} 
                        className="w-10 h-10 rounded-full border border-[#353535]/10 shrink-0 object-cover" 
                        alt="Avatar"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`;
                        }}
                      />
                      <div className="flex-1">
                        <div className="mb-1 flex justify-between items-end">
                          <span className="text-on-surface font-bold text-[0.8rem]">{comment.username}</span>
                          <span className="text-on-surface-variant font-medium text-[0.6875rem]">{comment.time}</span>
                        </div>
                        <p className="text-on-surface text-[0.75rem] leading-relaxed mb-3">{comment.text}</p>
                        
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => handleReplyClick(comment.id, comment.username)} 
                            className="text-on-surface font-bold uppercase tracking-tight active:opacity-70 transition-opacity text-[0.6875rem]"
                          >
                            Responder
                          </button>
                          <button 
                            onClick={() => toggleCommentLike(comment.id)} 
                            className={`flex items-center gap-1 cursor-pointer group transition-colors ${comment.userLiked ? 'text-primary' : 'text-on-surface-variant'}`}
                          >
                             <Heart size={16} className={comment.userLiked ? 'fill-primary' : ''} />
                             <span className="text-[0.625rem]">{comment.likes || 0}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Replies */}
                    {comment.replies.map(reply => (
                      <div key={reply.id} className="flex gap-3 ml-12 relative mt-2">
                         <div className="absolute -left-6 top-0 w-4 h-6 border-l-2 border-b-2 border-outline-variant/20 rounded-bl-[8px]"></div>
                         
                         <img 
                            src={reply.avatar} 
                            className="w-8 h-8 rounded-full border border-[#353535]/10 shrink-0 object-cover" 
                            alt="Avatar"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.userId}`;
                            }}
                         />
                         <div className="flex-1">
                            <div className="mb-1 flex justify-between items-end">
                              <span className="text-on-surface font-bold text-[0.8rem]">{reply.username}</span>
                              <span className="text-on-surface-variant font-medium text-[0.6875rem]">{reply.time}</span>
                            </div>
                            <p className="text-on-surface text-[0.75rem] leading-relaxed mb-3">{reply.text}</p>
                            
                            <div className="flex items-center gap-4">
                              <button 
                                onClick={() => handleReplyClick(comment.id, reply.username)} 
                                className="text-on-surface font-bold uppercase tracking-tight active:opacity-70 transition-opacity text-[0.6875rem]"
                              >
                                Responder
                              </button>
                              <button 
                                onClick={() => toggleCommentLike(reply.id, comment.id)} 
                                className={`flex items-center gap-1 cursor-pointer group transition-colors ${reply.userLiked ? 'text-primary' : 'text-on-surface-variant'}`}
                              >
                                 <Heart size={16} className={reply.userLiked ? 'fill-primary' : ''} />
                                 <span className="text-[0.625rem]">{reply.likes || 0}</span>
                              </button>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-col bg-surface-container shrink-0 border-t border-outline-variant/10">
               {replyingTo && (
                  <div className="px-4 py-2 bg-on-surface/5 flex items-center justify-between">
                     <span className="text-[0.6875rem] text-on-surface-variant">
                        A responder a <span className="font-bold text-on-surface">{replyingTo.username}</span>
                     </span>
                     <button onClick={() => setReplyingTo(null)} className="text-on-surface-variant hover:text-on-surface p-1">
                        <X size={14} />
                     </button>
                  </div>
               )}
               <div className="p-3 bg-[#131313]/95 backdrop-blur-2xl flex items-center gap-3">
                  <img 
                    src={auth.currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.currentUser?.uid || 'guest'}`} 
                    className="w-8 h-8 rounded-full border border-[#353535]/10 shrink-0 object-cover" 
                    alt="My Avatar"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.currentUser?.uid || 'guest'}`;
                    }}
                  />
                  <div className="flex-1 relative bg-surface-container-low rounded-sm">
                    <input 
                      ref={commentInputRef}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                      type="text" 
                      placeholder="Escreva um comentário..." 
                      className="w-full bg-transparent text-on-surface placeholder:text-on-surface-variant/50 text-[0.75rem] px-3 py-2 border-none focus:ring-1 focus:ring-primary/30 transition-all outline-none" 
                    />
                  </div>
                  <button 
                    onClick={handleSendComment}
                    disabled={!commentText.trim() || commentLoading}
                    className="bg-primary-container text-on-primary-container h-8 px-4 rounded-sm text-[0.6875rem] font-bold uppercase tracking-widest active:scale-95 transition-transform"
                  >
                    {commentLoading ? <Loader2 size={16} className="animate-spin" /> : 'Enviar'}
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Full Screen Image Viewer */}
      <AnimatePresence>
        {selectedFullImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4"
            onClick={() => setSelectedFullImage(null)}
          >
            <button className="absolute top-6 right-6 text-white p-2 bg-white/10 rounded-full backdrop-blur-md">
              <X size={24} />
            </button>
            <img 
              src={selectedFullImage} 
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" 
              alt="Full view"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/placeholder/800/800';
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        targetId={product?.id || ''}
        targetType={product?.productType === 'short' ? 'short' : 'product'}
        reportedUserId={product?.sellerId}
      />
    </div>
  );
}
