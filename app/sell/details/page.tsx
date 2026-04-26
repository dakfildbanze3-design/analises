'use client';

import React, { useState, useEffect } from 'react';
import { Video, X, Loader2, AlignLeft, MapPin, Tag as CategoryIcon, Phone, Coins, ChevronRight, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, supabase, STORAGE_BUCKETS } from '@/src/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { PRODUCT_CATEGORIES } from '@/src/constants';

export default function SellDetails() {
  const router = useRouter();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [type, setType] = useState<'video' | 'image' | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [activeEditKey, setActiveEditKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('sell_media');
    if (saved) {
      const { type, urls } = JSON.parse(saved);
      setType(type);
      if (type === 'video') setVideoUrl(urls[0]);
      else setImages(urls);
    }
  }, []);

  useEffect(() => {
    async function fetchUserData() {
      if (auth.currentUser) {
        const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserData(data);
          setPhone(data.phone || '');
        }
      }
    }
    fetchUserData();
  }, []);

  const handleSubmit = async () => {
    if (!auth.currentUser) { router.push('/login'); return; }
    setIsSubmitting(true);
    try {
      if (!supabase) throw new Error('Supabase not configured');
      let finalVideoUrl = videoUrl;
      let finalImages = [...images];

      // Upload if blob
      if (videoUrl?.startsWith('blob:')) {
        const res = await fetch(videoUrl);
        const blob = await res.blob();
        const name = `vid-${Date.now()}.webm`;
        await supabase.storage.from(STORAGE_BUCKETS.PRODUCTS).upload(name, blob);
        finalVideoUrl = supabase.storage.from(STORAGE_BUCKETS.PRODUCTS).getPublicUrl(name).data.publicUrl;
      }

      const uploadedImages = [];
      for (const img of finalImages) {
        if (img.startsWith('blob:')) {
          const res = await fetch(img);
          const blob = await res.blob();
          const name = `img-${Date.now()}.jpg`;
          await supabase.storage.from(STORAGE_BUCKETS.PRODUCTS).upload(name, blob);
          uploadedImages.push(supabase.storage.from(STORAGE_BUCKETS.PRODUCTS).getPublicUrl(name).data.publicUrl);
        } else uploadedImages.push(img);
      }

      const productRef = await addDoc(collection(db, 'products'), {
        name,
        description,
        price: parseFloat(price) || 0,
        category,
        sellerPhone: phone,
        location: location || 'Maputo',
        videoUrl: finalVideoUrl,
        images: uploadedImages,
        productType: finalVideoUrl ? 'short' : 'physical',
        sellerId: auth.currentUser.uid,
        sellerName: userData?.displayName || 'Usuário',
        sellerAvatar: userData?.avatarUrl || '',
        createdAt: serverTimestamp(),
        views: 0
      });

      localStorage.removeItem('sell_media');
      router.push('/');
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const menuItems = [
    { icon: AlignLeft, label: 'Descrição', value: description, key: 'description' },
    { icon: MapPin, label: 'Localização', value: location, key: 'location' },
    { icon: Phone, label: 'Telefone', value: phone, key: 'phone' },
    { icon: CategoryIcon, label: 'Categorias', value: category, key: 'category' },
    { icon: Coins, label: 'Preço (MT)', value: price, key: 'price' },
  ];

  return (
    <div className="bg-background min-h-screen pt-12 pb-32">
      <section className="px-4 flex gap-4 mb-8">
        <div className="w-[120px] h-[160px] rounded-[12px] bg-surface-container overflow-hidden relative">
          {videoUrl ? <video src={videoUrl} className="w-full h-full object-cover" muted autoPlay loop /> : <img src={images[0]} className="w-full h-full object-cover" />}
          <button onClick={() => router.back()} className="absolute top-2 left-2 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center"><Pencil size={14} /></button>
        </div>
        <div className="flex-1">
          <label className="text-[0.6rem] font-bold uppercase opacity-50 block mb-1">Título</label>
          <textarea placeholder="Título do anúncio..." value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent border-none p-0 text-lg font-bold outline-none resize-none" rows={2} />
        </div>
      </section>

      <section className="flex flex-col">
        {menuItems.map((item) => (
          <div key={item.key} className="border-b border-white/5">
            <button onClick={() => setActiveEditKey(activeEditKey === item.key ? null : item.key)} className="w-full flex items-center gap-4 px-4 py-4">
              <item.icon size={20} className="opacity-50" />
              <div className="flex-1 text-left">
                <span className="text-sm font-bold block">{item.label}</span>
                {item.value && <span className="text-sm text-primary">{item.value}</span>}
              </div>
              <ChevronRight size={20} className={activeEditKey === item.key ? 'rotate-90' : ''} />
            </button>
            <AnimatePresence>
              {activeEditKey === item.key && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="px-14 pb-4 overflow-hidden">
                  {item.key === 'category' ? (
                    <div className="flex flex-wrap gap-2">
                       {PRODUCT_CATEGORIES.map(cat => (
                         <button key={cat} onClick={() => { setCategory(cat); setActiveEditKey(null); }} className={`px-4 py-1.5 rounded-full text-xs font-bold ${category === cat ? 'bg-primary text-black' : 'bg-surface-container'}`}>{cat}</button>
                       ))}
                    </div>
                  ) : (
                    <input autoFocus value={item.value} onChange={(e) => {
                      const v = e.target.value;
                      if (item.key === 'description') setDescription(v);
                      else if (item.key === 'location') setLocation(v);
                      else if (item.key === 'price') setPrice(v);
                      else if (item.key === 'phone') setPhone(v);
                    }} className="w-full bg-surface-container rounded-lg p-3 text-sm" />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </section>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background">
        <button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-primary text-black font-black py-4 rounded-full uppercase shadow-lg disabled:opacity-50">
          {isSubmitting ? <Loader2 className="animate-spin inline mr-2" /> : (videoUrl ? 'Enviar Shorts' : 'Publicar Anúncio')}
        </button>
      </div>
    </div>
  );
}
