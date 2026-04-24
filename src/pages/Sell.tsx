import React, { useState } from 'react';
import { Camera, X, Plus, ChevronRight, Info, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { auth, db, supabase, STORAGE_BUCKETS, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

export default function Sell() {
  const navigate = useNavigate();
  const [images, setImages] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    if (images.length >= 5) {
      alert('Máximo de 5 fotos atingido.');
      return;
    }

    setIsUploading(true);
    if (!supabase) {
      alert('Serviço de upload não configurado. Por favor, adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
      setIsUploading(false);
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      // Simplify filename to avoid folder structure issues with RLS
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.PRODUCTS)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from(STORAGE_BUCKETS.PRODUCTS)
        .getPublicUrl(fileName);

      if (data?.publicUrl) {
        setImages(prev => [...prev, data.publicUrl]);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      alert('Erro no upload: ' + error.message);
    } finally {
      setIsUploading(false);
      // Reset input value to allow uploading the same file again if needed
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      alert('Deves estar logado para publicar.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Get seller details
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data() as any;

      const path = 'products';
      try {
        await addDoc(collection(db, path), {
          name,
          description,
          price: parseFloat(price),
          category,
          sellerPhone: phone,
          location,
          images,
          sellerId: auth.currentUser.uid,
          sellerName: userData?.displayName || 'Usuário',
          sellerAvatar: userData?.avatarUrl || null,
          createdAt: serverTimestamp()
        });
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="pt-12 pb-24 px-4"
    >
      <form id="sell-form" onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* 1. Nome do produto */}
        <div>
          <label className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
            Nome do produto
          </label>
          <input 
            type="text" 
            placeholder="Ex: Air Jordan 1 Retro High"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-surface-container-low border-none rounded-[3px] px-4 py-3 text-[0.875rem] focus:ring-2 focus:ring-primary outline-none transition-all"
            required
          />
        </div>

        {/* 2. Descrição */}
        <div>
          <label className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
            Descrição
          </label>
          <textarea 
            placeholder="Descreve o teu produto (estado, tamanho, cor...)"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-surface-container-low border-none rounded-[3px] px-4 py-3 text-[0.875rem] focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
            required
          />
        </div>

        {/* 3. Upload de imagem */}
        <div>
          <label className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant mb-3 block">
            Fotos <span className="text-[0.625rem] font-medium normal-case opacity-60">(Até 5 fotos)</span>
          </label>
          
          <label className="cursor-pointer inline-block">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleAddImage}
              disabled={isUploading || images.length >= 5}
            />
            <div className={`flex items-center gap-2 shiny-button text-white px-6 py-3 rounded-full font-black text-[0.75rem] uppercase tracking-[0.2em] shadow-xl ${(isUploading || images.length >= 5) ? 'opacity-50' : ''}`}>
              {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} strokeWidth={3} />}
              {isUploading ? 'A carregar...' : 'Adicionar Fotos'}
            </div>
          </label>

          {images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
              {images.map((img, index) => (
                <div key={index} className="relative flex-shrink-0 w-24 h-24 bg-surface-container-low rounded-[3px] overflow-hidden group">
                  <img src={img} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Número e Localização */}
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
              Número de Telefone
            </label>
            <input 
              type="tel" 
              placeholder="+258 ..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-[3px] px-4 py-3 text-[0.875rem] focus:ring-2 focus:ring-primary outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
              Localização
            </label>
            <input 
              type="text" 
              placeholder="Ex: Maputo, Matola..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-[3px] px-4 py-3 text-[0.875rem] focus:ring-2 focus:ring-primary outline-none transition-all"
              required
            />
          </div>
        </div>

        {/* 5. Preço e Categoria */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
              Preço (MT)
            </label>
            <input 
              type="number" 
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-[3px] px-4 py-3 text-[0.875rem] focus:ring-2 focus:ring-primary outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
              Categoria
            </label>
            <div className="relative">
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-[3px] px-4 py-3 text-[0.875rem] focus:ring-2 focus:ring-primary outline-none transition-all appearance-none"
                required
              >
                <option value="">Selecionar</option>
                <option value="Sapatilhas">Sapatilhas</option>
                <option value="Acessórios">Acessórios</option>
                <option value="Roupas">Roupas</option>
                <option value="Serviços">Serviços</option>
                <option value="Eletrônicos">Eletrônicos</option>
              </select>
              <ChevronRight size={18} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-on-surface-variant pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="bg-surface-container-low p-4 rounded-[3px] flex gap-3 items-start">
          <Info size={18} className="text-primary flex-shrink-0 mt-0.5" />
          <p className="text-[0.75rem] text-on-surface-variant leading-relaxed">
            Anúncios com boas fotos e descrições detalhadas vendem até 3x mais rápido em Moçambique.
          </p>
        </div>

        <button 
          type="submit"
          disabled={isSubmitting || images.length === 0}
          className="w-full shiny-button text-white font-black py-4 rounded-full text-[0.875rem] uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span>A PUBLICAR...</span>
            </>
          ) : (
            'PUBLICAR ANÚNCIO'
          )}
        </button>
      </form>
    </motion.div>
  );
}
