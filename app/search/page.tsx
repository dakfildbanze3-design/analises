'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, X, History, TrendingUp, ShoppingBag, Loader2, Video } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '@/src/lib/firebase';
import { collection, query, getDocs, limit } from 'firebase/firestore';
import { searchService, SearchHistory } from '@/src/services/searchService';
import AdBanner from '@/src/components/AdBanner';

export default function SearchPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
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
    
    await searchService.saveSearchQuery(q);

    try {
      const searchTerm = q.toLowerCase();
      const productsSnap = await getDocs(query(collection(db, 'products'), limit(60)));
      const filteredProducts = productsSnap.docs
        .map(doc => ({ id: doc.id, dataType: 'product', ...doc.data() }))
        .filter((p: any) => p.name?.toLowerCase().includes(searchTerm) || p.description?.toLowerCase().includes(searchTerm) || p.category?.toLowerCase().includes(searchTerm));

      const usersSnap = await getDocs(query(collection(db, 'users'), limit(60)));
      const filteredUsers = usersSnap.docs
        .map(doc => ({ id: doc.id, dataType: 'user', ...doc.data() }))
        .filter((u: any) => u.displayName?.toLowerCase().includes(searchTerm) || u.location?.toLowerCase().includes(searchTerm));
      
      setResults([...filteredUsers, ...filteredProducts]);
    } catch (error) {
      console.error(error);
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
    <div className="min-h-screen bg-background flex flex-col pt-12">
      <div className="bg-surface px-4 py-3 sticky top-0 z-40 border-b border-white/5">
        <form onSubmit={handleSearch} className="bg-surface-container rounded-full flex items-center px-4 py-2">
          <SearchIcon size={16} className="text-zinc-500" />
          <input ref={inputRef} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Procurar boladas..." className="flex-1 bg-transparent border-none outline-none text-sm ml-2" />
          {searchQuery && <button onClick={() => { setSearchQuery(''); setHasSearched(false); setResults([]); }}><X size={18} /></button>}
        </form>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-20">
        <AnimatePresence mode="wait">
          {!hasSearched ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-6 space-y-8">
              {history.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center"><h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><History size={16} /> Recentes</h3><button onClick={() => searchService.clearAllHistory()} className="text-xs font-bold text-primary">Limpar</button></div>
                  <div className="space-y-1">
                    {history.map((item) => (
                      <div key={item.id} onClick={() => handleHistoryClick(item.query)} className="flex items-center justify-between py-3 hover:bg-white/5 px-2 rounded-lg cursor-pointer">
                        <div className="flex items-center gap-3"><History size={16} /><span className="text-sm">{item.query}</span></div>
                        <button onClick={(e) => handleClearHistoryItem(e, item.id)}><X size={16} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <AdBanner />
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest"><TrendingUp size={16} className="inline mr-2" /> Sugestões</h3>
                <div className="flex flex-wrap gap-2">
                  {['Nike', 'iPhone', 'Jordan', 'Samsung'].map(tag => (
                    <button key={tag} onClick={() => handleHistoryClick(tag)} className="px-4 py-2 bg-zinc-900 border border-white/5 rounded-full text-xs font-bold">{tag}</button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-6">
              {isSearching ? <div className="py-20 flex justify-center"><Loader2 size={40} className="animate-spin" /></div> : 
               results.length > 0 ? (
                 <div className="grid grid-cols-2 gap-4">
                   {results.map(r => (
                     <div key={r.id} onClick={() => router.push(r.dataType === 'user' ? `/user/${r.id}` : (r.productType === 'short' ? `/short/${r.id}` : `/product/${r.id}`))} className="bg-surface rounded-[10px] overflow-hidden border border-white/5">
                        <img src={r.dataType === 'user' ? r.avatarUrl : r.images?.[0]} className="aspect-square object-cover w-full" />
                        <div className="p-2"><h4 className="text-sm font-bold truncate">{r.dataType === 'user' ? r.displayName : r.name}</h4><p className="text-xs opacity-50">{r.dataType === 'user' ? r.location : `${r.price} MT`}</p></div>
                     </div>
                   ))}
                 </div>
               ) : <div className="py-20 text-center opacity-50">Nada encontrado.</div>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
