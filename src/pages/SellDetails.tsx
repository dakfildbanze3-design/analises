import React, { useState, useEffect } from 'react';
import { Video, X, Loader2, AlignLeft, MapPin, Tag as CategoryIcon, Phone, Coins, ChevronRight, Pencil } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, supabase, STORAGE_BUCKETS, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, getDocs, query, where } from 'firebase/firestore';

import { PRODUCT_CATEGORIES } from '../constants';

export default function SellDetails() {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const capturedVideoUrl = routeLocation.state?.capturedVideoUrl;
  const capturedImages = routeLocation.state?.capturedImages || [];
  
  const [videoUrl, setVideoUrl] = useState<string | null>(capturedVideoUrl || null);
  const [images, setImages] = useState<string[]>(capturedImages);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  
  const [activeEditKey, setActiveEditKey] = useState<string | null>(null);
  const [selectedFullImage, setSelectedFullImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    async function fetchUserData() {
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
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
    if (!auth.currentUser) {
      alert('Deves estar logado para publicar.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (!supabase) {
        throw new Error('Serviço de armazenamento (Supabase) não configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas configurações.');
      }

      let finalVideoUrl = videoUrl;
      let finalImages = [...images];
      
      // Upload captured video if any
      if (videoUrl && (videoUrl.startsWith('blob:') || videoUrl.startsWith('data:'))) {
        const response = await fetch(videoUrl);
        const blob = await response.blob();
        const fileExt = 'webm';
        const fileName = `captured-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKETS.PRODUCTS)
          .upload(fileName, blob, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from(STORAGE_BUCKETS.PRODUCTS)
          .getPublicUrl(fileName);

        if (data?.publicUrl) {
          finalVideoUrl = data.publicUrl;
        }
      }

      // Upload captured images if any
      const uploadedImages: string[] = [];
      for (const img of finalImages) {
        if (img.startsWith('blob:') || img.startsWith('data:')) {
          const response = await fetch(img);
          const blob = await response.blob();
          const fileExt = 'jpg';
          const fileName = `img-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKETS.PRODUCTS)
            .upload(fileName, blob, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) throw uploadError;

          const { data } = supabase.storage
            .from(STORAGE_BUCKETS.PRODUCTS)
            .getPublicUrl(fileName);

          if (data?.publicUrl) {
            uploadedImages.push(data.publicUrl);
          }
        } else {
          uploadedImages.push(img);
        }
      }

      const path = 'products';
      try {
        const productRef = await addDoc(collection(db, path), {
          name,
          description,
          price: parseFloat(price) || 0,
          category,
          sellerPhone: phone,
          location: location || 'Maputo',
          videoUrl: finalVideoUrl || null,
          images: uploadedImages,
          productType: finalVideoUrl ? 'short' : 'physical',
          sellerId: auth.currentUser.uid,
          sellerName: userData?.displayName || 'Usuário',
          sellerAvatar: userData?.avatarUrl || null,
          createdAt: serverTimestamp()
        });

        // Notificar seguidores
        try {
          const { notificationService } = await import('../services/notificationService');
          const followersQuery = query(collection(db, 'follows'), where('followingId', '==', auth.currentUser.uid));
          const followersSnap = await getDocs(followersQuery);
          
          const notifPromises = followersSnap.docs.map(docSnap => 
            notificationService.createNotification({
              type: 'post',
              toUserId: docSnap.data().followerId,
              text: `publicou um novo item: ${name}`,
              postId: productRef.id
            })
          );
          await Promise.all(notifPromises);
        } catch (notifErr) {
          console.warn('Falha ao notificar seguidores:', notifErr);
        }

      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
      
      navigate('/');
    } catch (error: any) {
      console.error('Submit error:', error);
      alert('Erro ao publicar: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const menuItems = [
    { icon: AlignLeft, label: 'Adicionar descrição', value: description, key: 'description', placeholder: 'Ex: Estado impecável...' },
    { icon: MapPin, label: 'Localização', value: location, key: 'location', placeholder: 'Ex: Maputo...' },
    { icon: Phone, label: 'Telefone', value: phone, key: 'phone', placeholder: 'Ex: +258...' },
    { icon: CategoryIcon, label: 'Categorias', value: category, key: 'category' },
    { icon: Coins, label: 'Adicionar preço (MT)', value: price, key: 'price', placeholder: '0.00' },
  ];

  const handleInputKeyDown = (e: React.KeyboardEvent, key: string) => {
    if (e.key === 'Enter') {
      setActiveEditKey(null);
    }
  };

  // Helper to render the image grid based on count
  const renderImageGrid = () => {
    if (images.length === 0) return null;

    if (images.length === 1) {
      return (
        <img 
          src={images[0]} 
          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" 
          alt="Preview"
          referrerPolicy="no-referrer"
          onClick={(e) => { e.stopPropagation(); setSelectedFullImage(images[0]); }}
        />
      );
    }

    const gridClass = images.length === 2 ? 'grid-cols-1 grid-rows-2' : images.length === 3 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-2 grid-rows-2';

    return (
      <div className={`grid w-full h-full gap-0.5 ${gridClass}`}>
        {images.slice(0, 4).map((img, idx) => (
          <div 
            key={idx} 
            className={`relative overflow-hidden cursor-pointer hover:opacity-90 transition-opacity ${images.length === 3 && idx === 0 ? 'col-span-2' : ''}`}
            onClick={(e) => { e.stopPropagation(); setSelectedFullImage(img); }}
          >
            <img 
              src={img} 
              className="w-full h-full object-cover" 
              alt={`Preview ${idx}`}
              referrerPolicy="no-referrer"
            />
            {idx === 3 && images.length > 4 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-[0.75rem]">
                +{images.length - 3}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <form id="sell-details-form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="bg-black min-h-screen text-white pt-16 pb-36">
      {/* Media Preview and Title Section */}
      <section className="px-4 flex gap-4 mb-8">
        <div 
          onClick={() => navigate(-1)}
          className="relative w-[120px] h-[160px] rounded-[12px] overflow-hidden bg-zinc-900 flex-shrink-0 shadow-lg border border-white/10 group cursor-pointer"
        >
          {videoUrl ? (
            <video 
              src={videoUrl} 
              className="w-full h-full object-cover"
              muted
              autoPlay
              loop
              playsInline
            />
          ) : images.length > 0 ? (
            renderImageGrid()
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Video className="text-white/20" size={32} />
            </div>
          )}
          <div className="absolute top-2 left-2 w-8 h-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
            <Pencil size={14} />
          </div>
          {videoUrl && (
            <div className="absolute bottom-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[0.625rem] font-medium border border-white/10">
              0:15
            </div>
          )}
          {!videoUrl && images.length > 1 && (
            <div className="absolute bottom-2 right-1 bg-black/60 px-1.5 py-0.5 rounded text-[0.625rem] font-bold border border-white/10 z-10">
              {images.length} fotos
            </div>
          )}
        </div>

        <div className="flex-1 pt-2">
          <div className="text-[0.625rem] font-medium text-zinc-500 uppercase tracking-widest mb-1">Título</div>
          <textarea 
            placeholder="Legende seu Shorts"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-transparent border-none p-0 text-[1rem] placeholder-zinc-600 focus:ring-0 resize-none font-medium leading-tight text-white mb-2"
            rows={2}
          />
        </div>
      </section>

      {/* User Info */}
      <section className="px-4 flex items-center gap-3 mb-8">
        <img 
          src={userData?.avatarUrl || "https://picsum.photos/seed/user/100/100"} 
          alt={userData?.displayName}
          className="w-10 h-10 rounded-full object-cover border border-white/10 shadow-sm"
          referrerPolicy="no-referrer"
        />
        <div className="flex flex-col">
          <span className="text-[0.875rem] font-bold">{userData?.displayName || 'Usuário'}</span>
          <span className="text-[0.75rem] text-zinc-500">@{userData?.handle || 'usuario-short'}</span>
        </div>
      </section>

      {/* Feature Menu with Inline Inputs */}
      <section className="flex flex-col">
        {menuItems.map((item, idx) => (
          <div key={idx} className="flex flex-col border-b border-white/5">
            <button 
              onClick={() => setActiveEditKey(activeEditKey === item.key ? null : item.key)}
              className="flex items-center gap-4 px-4 py-4 active:bg-zinc-900 transition-colors"
            >
              <div className="w-10 flex justify-center">
                <item.icon size={22} className="text-white" />
              </div>
              <div className="flex-1 flex flex-col items-start min-w-0">
                 <span className="text-[0.9375rem] font-medium text-zinc-200 truncate">{item.label}</span>
                 {!activeEditKey && item.value && (
                    <span className="text-[0.875rem] text-primary truncate max-w-full">
                        {item.key === 'price' ? `${item.value} MT` : item.value}
                    </span>
                 )}
              </div>
              <ChevronRight size={20} className={`text-zinc-500 transition-transform ${activeEditKey === item.key ? 'rotate-90' : ''}`} />
            </button>

            {/* Inline Input Field */}
            <AnimatePresence>
                {activeEditKey === item.key && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden px-14 pb-4"
                    >
                        {item.key === 'category' ? (
                            <div className="flex flex-wrap gap-2 pt-2">
                                {PRODUCT_CATEGORIES.map(cat => (
                                    <button 
                                        key={cat}
                                        onClick={() => { setCategory(cat); setActiveEditKey(null); }}
                                        className={`px-3 py-1.5 rounded-full border text-[0.75rem] font-bold uppercase transition-colors ${category === cat ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-500'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="relative mt-1">
                                {item.key === 'description' ? (
                                    <textarea
                                        autoFocus
                                        value={description}
                                        onChange={(e) => {
                                            setDescription(e.target.value);
                                            // Auto-expand height
                                            e.target.style.height = 'inherit';
                                            e.target.style.height = `${e.target.scrollHeight}px`;
                                        }}
                                        onKeyDown={(e) => handleInputKeyDown(e, item.key)}
                                        placeholder={item.placeholder}
                                        className="w-full bg-zinc-900 border-none rounded-[6px] px-3 py-3 text-[0.875rem] focus:ring-1 focus:ring-primary outline-none transition-all resize-none min-h-[100px]"
                                    />
                                ) : (
                                    <input 
                                        autoFocus
                                        type={item.key === 'price' ? 'number' : 'text'}
                                        value={item.value}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (item.key === 'location') setLocation(val);
                                            else if (item.key === 'price') setPrice(val);
                                            else if (item.key === 'phone') setPhone(val);
                                        }}
                                        onKeyDown={(e) => handleInputKeyDown(e, item.key)}
                                        placeholder={item.placeholder}
                                        className="w-full bg-zinc-900 border-none rounded-[6px] px-3 py-3 text-[0.875rem] focus:ring-1 focus:ring-primary outline-none transition-all"
                                    />
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
          </div>
        ))}
      </section>

      {/* Bottom Button */}
      <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black to-transparent z-50">
        <button 
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-white text-black py-4 rounded-full font-bold text-[0.9375rem] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(255,255,255,0.2)] disabled:opacity-80"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={24} />
              <span>A Publicar...</span>
            </>
          ) : videoUrl ? 'Enviar Shorts' : 'Publicar Anúncio'}
        </button>
      </div>

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
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

