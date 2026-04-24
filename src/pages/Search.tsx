import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search as SearchIcon, X, History, TrendingUp, ShoppingBag, Loader2, MessageSquare, Heart, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { searchService, SearchHistory } from '../services/searchService';
import { formatRelativeTime } from '../lib/dateUtils';
import AdBanner from '../components/AdBanner';

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();

    // Subscribe to history
    const unsubscribe = searchService.subscribeToHistory(setHistory);
    return () => unsubscribe();
  }, []);

  const handleSearch = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const q = overrideQuery || searchQuery;
    if (!q.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setResults([]);
    
    // Save to history
    await searchService.saveSearchQuery(q);

    try {
      const searchTerm = q.toLowerCase();
      
      // 1. Search Products
      const productsRef = collection(db, 'products');
      const productsSnap = await getDocs(query(productsRef, limit(60)));
      const filteredProducts = productsSnap.docs
        .map(doc => ({ id: doc.id, dataType: 'product', ...doc.data() }))
        .filter((p: any) => 
          p.name?.toLowerCase().includes(searchTerm) || 
          p.description?.toLowerCase().includes(searchTerm) ||
          p.category?.toLowerCase().includes(searchTerm)
        );

      // 2. Search Users (People)
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(query(usersRef, limit(60)));
      const filteredUsers = usersSnap.docs
        .map(doc => ({ id: doc.id, dataType: 'user', ...doc.data() }))
        .filter((u: any) => 
          u.displayName?.toLowerCase().includes(searchTerm) ||
          u.location?.toLowerCase().includes(searchTerm)
        );
      
      // Combine results
      setResults([...filteredUsers, ...filteredProducts]);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    searchService.deleteHistoryItem(id);
  };

  const handleHistoryClick = (q: string) => {
    setSearchQuery(q);
    handleSearch(undefined, q);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col pt-safe">
      {/* Search Bar sticky (Back button removed to rely on TopBar) */}
      <div className="bg-zinc-900/50 backdrop-blur-md px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
        <form 
          onSubmit={handleSearch}
          className="flex-1 bg-zinc-800 rounded-[3px] flex items-center px-4 py-1.5 relative"
        >
          <SearchIcon size={14} className="text-zinc-500 shrink-0" />
          <input 
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="O que procuras hoje?"
            className="w-full bg-transparent border-none outline-none text-white text-xs ml-3 placeholder:text-zinc-500"
          />
          {searchQuery && (
            <button 
              type="button"
              onClick={() => {
                setSearchQuery('');
                setHasSearched(false);
                setResults([]);
              }}
              className="text-zinc-500 hover:text-white"
            >
              <X size={18} />
            </button>
          )}
        </form>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-20">
        <AnimatePresence mode="wait">
          {!hasSearched ? (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-6 space-y-8"
            >
              {/* Recent History */}
              {history.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[0.75rem] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                      <History size={16} /> Pesquisas Recentes
                    </h3>
                    <button 
                      onClick={() => searchService.clearAllHistory()}
                      className="text-[0.625rem] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-widest"
                    >
                      Limpar Tudo
                    </button>
                  </div>
                  
                  <div className="space-y-1">
                    {history.map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => handleHistoryClick(item.query)}
                        className="flex items-center justify-between py-3 px-2 hover:bg-white/5 rounded-xl transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <History size={16} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                          <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">{item.query}</span>
                        </div>
                        <button 
                          onClick={(e) => handleClearHistoryItem(e, item.id)}
                          className="text-zinc-700 hover:text-red-500 p-1"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <AdBanner />

              {/* Suggestions / Trending */}
              <div className="space-y-4">
                <h3 className="text-[0.75rem] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp size={16} /> Sugestões para ti
                </h3>
                <div className="flex flex-wrap gap-2">
                  {['Sapatilhas Nike', 'iPhone 15', 'Relógios', 'Jordan', 'MacBook', 'Acessórios'].map((tag) => (
                    <button 
                      key={tag}
                      onClick={() => handleHistoryClick(tag)}
                      className="px-4 py-2 bg-zinc-900 border border-white/5 rounded-[3px] text-xs font-bold text-white hover:bg-zinc-800 transition-colors active:scale-95"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-6 space-y-6"
            >
              <div className="flex items-center justify-between pb-4">
                <h2 className="text-sm font-black text-white uppercase tracking-tight italic">Resultados para "{searchQuery}"</h2>
                <span className="text-xs text-zinc-500 font-bold">{results.length} itens</span>
              </div>

              {isSearching ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                  <Loader2 size={40} className="text-blue-600 animate-spin" />
                  <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest animate-pulse">Procurando as melhores boladas...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="flex flex-col gap-6">
                  {/* People Section if any */}
                  {results.some(r => r.dataType === 'user') && (
                    <div className="space-y-4">
                      <h3 className="text-[0.625rem] font-black text-zinc-500 uppercase tracking-[0.2em]">Pessoas</h3>
                      <div className="flex flex-col gap-3">
                        {results.filter(r => r.dataType === 'user').map(user => (
                          <motion.div 
                            key={user.id} 
                            onClick={() => navigate(`/user/${user.id}`)}
                            className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-[10px] border border-white/5 active:scale-[0.98] transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 border border-white/10">
                                <img 
                                  src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;
                                  }}
                                />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-white uppercase tracking-tight">{user.displayName || 'Usuário'}</span>
                                <span className="text-[0.625rem] text-zinc-500 font-medium uppercase tracking-widest">{user.location || 'Moçambique'}</span>
                              </div>
                            </div>
                            <div className="px-4 py-1.5 bg-blue-600 rounded-full">
                               <span className="text-[0.625rem] font-black text-white uppercase italic">Ver Perfil</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Products Section */}
                  {results.some(r => r.dataType === 'product') && (
                    <div className="space-y-4">
                      <h3 className="text-[0.625rem] font-black text-zinc-500 uppercase tracking-[0.2em]">Produtos & Boladas</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {results.filter(r => r.dataType === 'product').map((product) => (
                          <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key={product.id}
                            onClick={() => navigate(product.productType === 'short' ? `/short/${product.id}` : `/product/${product.id}`)}
                            className="group cursor-pointer"
                          >
                            <div className="aspect-square bg-zinc-900 rounded-[10px] overflow-hidden relative border border-white/5">
                              <img 
                                src={product.image || product.images?.[0]} 
                                alt={product.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/placeholder/800/800';
                                }}
                              />
                              {product.productType === 'short' && (
                                <div className="absolute top-2 right-2 w-8 h-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center">
                                  <Video size={14} className="text-white" />
                                </div>
                              )}
                              <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                                <div className="bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                                  <span className="text-[0.625rem] font-black text-white italic">{product.price || 0} MT</span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-col gap-0.5">
                              <h3 className="text-[0.8125rem] font-bold text-white uppercase truncate tracking-tight">{product.name}</h3>
                              <div className="flex items-center gap-2 text-zinc-500 text-[0.625rem] font-medium uppercase tracking-widest">
                                <span>{product.category}</span>
                                <span>•</span>
                                <span>{product.views || 0} Vistas</span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 space-y-8">
                  <div className="flex flex-col items-center justify-center text-center px-6 py-10">
                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-white/5">
                      <ShoppingBag size={24} className="text-zinc-600" />
                    </div>
                    <h3 className="text-sm font-black text-white uppercase italic">Nenhuma bolada encontrada</h3>
                    <p className="text-zinc-500 text-[0.75rem] mt-2">Não encontrámos nada para "{searchQuery}". Tenta pesquisar com os termos sugeridos abaixo:</p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[0.75rem] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp size={16} /> Sugestões para ti
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {['Sapatilhas Nike', 'iPhone 15', 'Relógios', 'Jordan', 'MacBook', 'Acessórios', 'Serviços'].map((tag) => (
                        <button 
                          key={tag}
                          onClick={() => handleHistoryClick(tag)}
                          className="px-4 py-2 bg-zinc-900 border border-white/5 rounded-[3px] text-xs font-bold text-white hover:bg-zinc-800 transition-colors active:scale-95"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  function setQuerySuggests() {
    setSearchQuery('');
    setResults([]);
  }
}
