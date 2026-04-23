import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, SlidersHorizontal, MoreVertical, Flag, Share2, Star, Link, X, Loader2, ShoppingBag, MessageSquare, Check, Video, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { collection, getDocs, query, orderBy, limit, startAfter, QueryDocumentSnapshot, where } from 'firebase/firestore';
import { formatRelativeTime } from '../lib/dateUtils';
import { shareContent } from '../lib/shareUtils';
import { chatService } from '../services/chatService';
import AdBanner from '../components/AdBanner';
import ReportModal from '../components/ReportModal';

const categories = ['TUDO', 'SAPATILHAS', 'ACESSÓRIOS', 'ROUPAS', 'SERVIÇOS', 'ELETRÔNICOS'];

type SortOptionId = 'recent' | 'old' | 'cheap' | 'expensive' | 'popular' | 'discussed';

const sortOptions = [
  { id: 'recent', label: 'Mais recentes', field: 'createdAt', dir: 'desc' },
  { id: 'old', label: 'Mais antigos', field: 'createdAt', dir: 'asc' },
  { id: 'cheap', label: 'Mais baratos (Preço Crescente)', field: 'price', dir: 'asc' },
  { id: 'expensive', label: 'Mais caros (Preço Decrescente)', field: 'price', dir: 'desc' },
  { id: 'popular', label: 'Mais populares', field: 'likesCount', dir: 'desc' },
  { id: 'discussed', label: 'Mais comentados', field: 'commentsCount', dir: 'desc' },
];

export default function Home() {
  const navigate = useNavigate();
  
  // UI States
  const [activeOptionsId, setActiveOptionsId] = useState<string | null>(null);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  
  // Data States
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Filter & Pagination States
  const [activeCategory, setActiveCategory] = useState<string>('TUDO');
  const [activeSort, setActiveSort] = useState<SortOptionId>('recent');
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Infinite Scroll Observer setup
  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchProducts(true);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  const fetchProducts = async (isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const orderOption = sortOptions.find(opt => opt.id === activeSort) || sortOptions[0];
      const constraints: any[] = [];

      // If filtering by category, note that combining 'where' with 'orderBy' on a different field 
      // WILL require a composite index in Firestore!
      if (activeCategory !== 'TUDO') {
        // We match exactly what the user selected (Sapatilhas, etc.). We ensure case-sensitivity match.
        // It's possible we might need activeCategory matching the actual database string.
        constraints.push(where('category', '==', activeCategory));
      }

      // Order By
      constraints.push(orderBy(orderOption.field, orderOption.dir as any));

      // Pagination
      if (isLoadMore && lastVisible) {
        constraints.push(startAfter(lastVisible));
      }
      
      constraints.push(limit(40));

      const q = query(collection(db, 'products'), ...constraints);
      const querySnapshot = await getDocs(q);
      
      let newProducts = querySnapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          ...data,
          author: data.sellerName || 'Usuário',
          avatar: data.sellerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.sellerId}`,
          time: data.createdAt ? formatRelativeTime(data.createdAt) : 'Agora',
          views: data.views || 0,
          likesCount: data.likesCount || (data.likedBy?.length || 0),
          commentsCount: data.commentsCount || 0,
          image: data.images && data.images.length > 0 ? data.images[0] : 'https://picsum.photos/seed/placeholder/800/800'
        };
      });

      // Randomize the incoming batch of products
      for (let i = newProducts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newProducts[i], newProducts[j]] = [newProducts[j], newProducts[i]];
      }

      if (isLoadMore) {
        setProducts(prev => [...prev, ...newProducts]);
      } else {
        setProducts(newProducts);
      }

      // Setup for next page (based on original order to ensure pagination works)
      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
      setHasMore(querySnapshot.docs.length === 40);

    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'products');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Re-fetch automatically when filters change
  useEffect(() => {
    fetchProducts(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, activeSort]);

  const closeOptions = () => setActiveOptionsId(null);

  const handleMessageClick = async () => {
    if (!auth.currentUser) {
      alert("Faça login para enviar mensagens");
      navigate('/login');
      return;
    }
    const product = products.find(p => p.id === activeOptionsId);
    if (!product || !product.sellerId) return;

    try {
      const chatId = await chatService.getOrCreateChat(
        product.sellerId,
        product.sellerName || product.author,
        product.sellerAvatar || product.avatar
      );
      navigate(`/chat/${chatId}`);
      closeOptions();
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-12 pb-16"
    >
      {/* Categories Horizontal Menu */}
      <section className="bg-surface pt-2 pb-1 overflow-x-auto hide-scrollbar flex gap-1.5 pl-2 z-30 sticky top-12 w-full border-b border-outline-variant/10">
        {categories.map((cat) => (
          <div 
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-[3px] text-[0.6875rem] font-bold uppercase tracking-widest cursor-pointer transition-colors
              ${activeCategory === cat ? 'bg-white text-zinc-950' : 'bg-surface-container text-on-surface-variant'}
            `}
          >
            {cat}
          </div>
        ))}
      </section>

      {/* Shorts Header (Top) */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2 bg-surface">
        <Play size={16} fill="currentColor" className="text-blue-500" />
        <span className="text-[0.875rem] font-bold text-white tracking-widest lowercase">
          anúncios em shorts
        </span>
      </div>

      {/* Destaques / Featured Cards (Top) */}
      {!loading && products.length > 0 && products.some(p => p.productType === 'short' || p.videoUrl) && (
        <section className="px-2 pt-2 pb-4 bg-surface">
          <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-2">
            {products.filter((p: any) => p.productType === 'short' || p.videoUrl).map((product: any) => (
              <div 
                key={`featured-${product.id}`}
                onClick={() => navigate(`/short/${product.id}`)}
                className="relative flex-shrink-0 w-[calc(50%-6px)] h-[340px] rounded-2xl overflow-hidden cursor-pointer group bg-surface-container shadow-sm"
              >
                {product.videoUrl ? (
                  <video 
                    src={product.videoUrl} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img 
                    src={product.image || product.images?.[0]} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/placeholder/800/800';
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-full p-4 text-left">
                  <h3 className="text-white text-[0.875rem] leading-tight line-clamp-2 mb-1">
                    <span className="font-bold">{product.name}</span>
                    {product.description && <span className="opacity-80 font-normal"> - {product.description}</span>}
                  </h3>
                  <p className="text-white/80 text-[0.625rem] font-bold uppercase tracking-wider">{product.views || '0'} visualizações</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveOptionsId(product.id); }}
                  className="absolute top-3 right-3 bg-black/40 backdrop-blur-md text-white p-1.5 rounded-full active:scale-95 transition-transform z-10"
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Product Feed */}
      <div className="flex flex-col gap-[3px] bg-background mt-2">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 size={32} className="animate-spin text-zinc-800" />
          </div>
        ) : products.filter((p: any) => !p.videoUrl && p.productType !== 'short').length === 0 ? (
          <div className="py-12 px-6 flex flex-col items-center text-center text-on-surface-variant">
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4">
              <ShoppingBag size={24} className="text-on-surface-variant/50" />
            </div>
            <h3 className="font-bold text-on-surface uppercase tracking-widest text-[0.875rem] mb-2">Nada por aqui!</h3>
            <p className="text-[0.75rem] max-w-[200px] leading-relaxed opacity-80">
              Não encontramos produtos para apresentar com estes filtros agora. Tente limpar ou procurar outra categoria.
            </p>
          </div>
        ) : (
          <>
            {(() => {
              const normalProducts = products.filter((p: any) => !p.videoUrl && p.productType !== 'short');
              const videoProducts = products.filter((p: any) => p.productType === 'short' || p.videoUrl);

              return normalProducts.map((product, index) => {
                // Show video carousel before the 3rd item, then every 8 items (3, 11, 19, 27...)
                const showVideosHere = index === 2 || (index > 2 && (index - 2) % 8 === 0);
                const blockNumber = index === 2 ? 0 : Math.floor((index - 2) / 8);
                const videosSlice = videoProducts.slice(blockNumber * 5, (blockNumber + 1) * 5);

                return (
                  <React.Fragment key={product.id}>
                    {/* Interleaved Shorts Carousel */}
                    {showVideosHere && videosSlice.length > 0 && (
                      <section className="px-2 pt-4 pb-6 bg-surface mt-[3px]">
                        <div className="px-2 mb-3 flex items-center gap-2">
                          <Play size={16} fill="currentColor" className="text-blue-500" />
                          <span className="text-[0.875rem] font-bold text-white tracking-widest lowercase">
                            anúncios em shorts
                          </span>
                        </div>
                        <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-2">
                          {videosSlice.map((videoProduct: any) => (
                            <div 
                              key={`interleaved-short-${videoProduct.id}`}
                              onClick={() => navigate(`/short/${videoProduct.id}`)}
                              className="relative flex-shrink-0 w-[calc(50%-6px)] h-[340px] rounded-2xl overflow-hidden cursor-pointer group bg-surface-container shadow-sm"
                            >
                              {videoProduct.videoUrl ? (
                                <video 
                                  src={videoProduct.videoUrl} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  muted
                                  loop
                                  playsInline
                                />
                              ) : (
                                <img 
                                  src={videoProduct.image || videoProduct.images?.[0]} 
                                  alt={videoProduct.name} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/placeholder/800/800';
                                  }}
                                />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                              <div className="absolute bottom-0 left-0 w-full p-4 text-left">
                                <h3 className="text-white text-[0.875rem] leading-tight line-clamp-2 mb-1">
                                  <span className="font-bold">{videoProduct.name}</span>
                                  {videoProduct.description && <span className="opacity-80 font-normal"> - {videoProduct.description}</span>}
                                </h3>
                                <p className="text-white/80 text-[0.625rem] font-bold uppercase tracking-wider">{videoProduct.views || '0'} visualizações</p>
                              </div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setActiveOptionsId(videoProduct.id); }}
                                className="absolute top-3 right-3 bg-black/40 backdrop-blur-md text-white p-1.5 rounded-full active:scale-95 transition-transform z-10"
                              >
                                <MoreVertical size={18} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    <article 
                      onClick={() => navigate(`/product/${product.id}`)}
                      className={`bg-surface pb-4 cursor-pointer ${showVideosHere && videosSlice.length > 0 ? 'mt-[3px]' : ''}`}
                    >
                      {/* Image */}
                      <div className="w-full aspect-square bg-surface-container-low relative">
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/placeholder/800/800';
                          }}
                        />
                        {product.discount && (
                          <div className="absolute top-3 left-3 bg-error text-on-error text-[0.625rem] font-black px-2 py-1 rounded-[2px]">{product.discount}</div>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="px-4 mt-3 flex gap-3">
                        
                        {/* Text Content */}
                        <div className="flex-1">
                          {/* Name and Description (inline, max 2 lines) */}
                          <p className="text-[0.9375rem] text-on-surface line-clamp-2 leading-snug mb-1">
                            <span className="font-bold">{product.name}</span>
                            <span className="text-on-surface-variant/80"> - {product.description}</span>
                          </p>
                          
                          {/* Avatar, Author, and Stats in one line */}
                          <div className="flex items-center gap-2 mt-2">
                            <img 
                              src={product.avatar} 
                              alt="Avatar" 
                              className="w-5 h-5 rounded-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${product.sellerId}`;
                              }}
                            />
                            <div className="flex items-center gap-1.5 text-[0.75rem] font-bold text-on-surface-variant/70 uppercase">
                              <span>{product.author}</span>
                              <span className="opacity-40">•</span>
                              <span>{product.views || 0} visualizações</span>
                              <span className="opacity-40">•</span>
                              <span className="font-medium normal-case">{product.time}</span>
                            </div>
                          </div>
                        </div>

                        {/* Options */}
                        <div 
                          className="flex-shrink-0 text-on-surface-variant p-1 -mr-1 cursor-pointer hover:bg-surface-container-highest rounded-full transition-colors active:scale-95 self-start"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveOptionsId(product.id);
                          }}
                        >
                          <MoreVertical size={18} />
                        </div>
                      </div>
                    </article>

                    {/* Show Ad after every 4th product */}
                    {(index + 1) % 4 === 0 && (index + 1) % 8 !== 0 && (
                      <div className="px-2 py-1 mt-[3px] bg-background">
                        <AdBanner />
                      </div>
                    )}
                  </React.Fragment>
                );
              });
            })()}
            
            {/* Infinite Scroll Loader Target */}
            <div ref={lastElementRef} className="py-8 flex justify-center bg-background">
              {loadingMore ? (
                <Loader2 size={24} className="animate-spin text-zinc-800" />
              ) : !hasMore && products.length > 0 ? (
                <p className="text-[0.625rem] text-on-surface-variant uppercase font-bold tracking-widest">
                  FIM DA LISTA
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>

      {/* Filter / Sort Bottom Sheet */}
      <AnimatePresence>
        {isSortOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSortOpen(false)}
              className="fixed inset-0 bg-black/60 z-[80] backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 w-full bg-surface-container-high rounded-t-xl z-[90] pb-safe flex flex-col overflow-hidden"
            >
              <div className="p-4 flex justify-between items-center border-b border-outline-variant/10">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={18} className="text-zinc-800" />
                  <h3 className="text-[0.875rem] font-bold text-on-surface uppercase tracking-tight">Ordenar Por</h3>
                </div>
                <button onClick={() => setIsSortOpen(false)} className="p-1 text-on-surface-variant hover:text-zinc-800 transition-colors rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="flex flex-col py-2 max-h-[60vh] overflow-y-auto">
                {sortOptions.map(option => (
                  <button 
                    key={option.id}
                    onClick={() => {
                      setActiveSort(option.id as SortOptionId);
                      setIsSortOpen(false);
                    }}
                    className="flex justify-between items-center px-6 py-4 hover:bg-surface-container-highest transition-colors text-left w-full border-b border-outline-variant/5 last:border-0"
                  >
                    <span className={`text-[0.875rem] font-medium transition-colors ${activeSort === option.id ? 'text-zinc-800 font-bold' : 'text-on-surface'}`}>
                      {option.label}
                    </span>
                    {activeSort === option.id && (
                      <Check size={18} className="text-zinc-800" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Options Small Modal for Products */}
      <AnimatePresence>
        {activeOptionsId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeOptions}
            className="fixed inset-0 bg-black/40 z-[80] backdrop-blur-[2px] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[260px] bg-surface-container-high rounded-xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="flex flex-col py-1">
                <button 
                  onClick={handleMessageClick}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-container-highest transition-colors text-left w-full active:bg-outline-variant/10"
                >
                  <MessageSquare size={18} className="text-on-surface-variant" />
                  <span className="text-[0.875rem] font-medium text-on-surface">Enviar Mensagem</span>
                </button>
                
                <button 
                  onClick={() => { 
                    const p = products.find(prod => prod.id === activeOptionsId);
                    if (p) {
                      const url = p.videoUrl || p.productType === 'short' 
                        ? `${window.location.origin}/short/${p.id}` 
                        : `${window.location.origin}/product/${p.id}`;
                      shareContent(
                        p.name,
                        `Olha este anúncio no Bazar: ${p.name} - ${p.price || 0} MT`,
                        url
                      );
                    }
                    closeOptions(); 
                  }}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-container-highest transition-colors text-left w-full active:bg-outline-variant/10"
                >
                  <Share2 size={18} className="text-on-surface-variant" />
                  <span className="text-[0.875rem] font-medium text-on-surface">Compartilhar</span>
                </button>

                <div className="h-[1px] bg-outline-variant/10 my-1 mx-4" />

                <button 
                  onClick={() => setReportModalOpen(true)}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-container-highest transition-colors text-left w-full active:bg-error/10"
                >
                  <Flag size={18} className="text-error" />
                  <span className="text-[0.875rem] font-medium text-error">Denunciar</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => {
          setReportModalOpen(false);
          closeOptions();
        }}
        targetId={activeOptionsId || ''}
        targetType={products.find(p => p.id === activeOptionsId)?.productType === 'short' ? 'short' : 'product'}
        reportedUserId={products.find(p => p.id === activeOptionsId)?.sellerId}
      />
    </motion.div>
  );
}
