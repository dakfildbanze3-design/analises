import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Camera, Check, Loader2 } from 'lucide-react';
import { auth, db, supabase, STORAGE_BUCKETS } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingInit, setIsFetchingInit] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setName(data.displayName || auth.currentUser.displayName || '');
          setBio(data.bio || '');
          setAvatar(data.avatarUrl || auth.currentUser.photoURL || null);
        } else {
          setName(auth.currentUser.displayName || '');
          setAvatar(auth.currentUser.photoURL || null);
        }
      } catch (e) {
        console.error("Error fetching user data", e);
      } finally {
        setIsFetchingInit(false);
      }
    };

    fetchUserData();
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      // Simplify filename to avoid folder structure issues with RLS
      const fileName = `avatar-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.AVATARS)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKETS.AVATARS)
        .getPublicUrl(fileName);

      setAvatar(publicUrl);
    } catch (error: any) {
      alert('Erro no upload: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setIsSaving(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: name,
        photoURL: avatar
      });

      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        displayName: name,
        bio: bio,
        avatarUrl: avatar,
      }, { merge: true });
      navigate('/');
    } catch (error: any) {
      alert('Erro ao salvar perfil: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isFetchingInit) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-white" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen bg-black px-6 py-12 flex flex-col justify-center"
    >
      <div className="max-w-sm mx-auto w-full">
        <div className="text-center mb-10">
          <h1 className="text-[2rem] font-black uppercase tracking-tighter mb-4 text-white">Quase lá!</h1>
          <p className="text-white/70 text-[0.9375rem] leading-relaxed">
            Faça o upload do seu avatar, escolha um nome e adicione uma biografia para a comunidade conhecer você.
          </p>
        </div>

        <form onSubmit={handleComplete} className="space-y-6">
          
          {/* Avatar and Name on the same line */}
          <div className="flex items-center gap-5 bg-zinc-900 p-4 rounded-[8px] border border-white/5">
            <div className="flex-shrink-0">
              <label className="cursor-pointer block">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                />
                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center relative overflow-hidden border-2 border-dashed border-white/20 hover:border-blue-500 transition-colors group">
                  {isUploading ? (
                    <Loader2 size={24} className="animate-spin text-blue-500" />
                  ) : avatar ? (
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={24} className="text-white/50 group-hover:text-blue-500 transition-colors" />
                  )}
                  
                  {avatar && !isUploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={20} className="text-white" />
                    </div>
                  )}
                </div>
              </label>
            </div>

            <div className="flex-1">
              <label className="text-[0.6875rem] font-bold uppercase tracking-widest text-white/50 mb-1.5 block">
                Nome de exibição
              </label>
              <input 
                type="text" 
                placeholder="O teu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border-b-2 border-white/10 focus:border-blue-500 px-0 py-2 text-[1rem] font-medium text-white outline-none transition-colors placeholder:text-white/20"
                required
              />
            </div>
          </div>

          <div className="bg-zinc-900 p-4 rounded-[8px] border border-white/5">
            <label className="text-[0.6875rem] font-bold uppercase tracking-widest text-white/50 mb-2 block">
              Biografia
            </label>
            <textarea 
              rows={3}
              placeholder="Fale um pouco sobre você..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-transparent border-none focus:ring-0 px-0 py-2 text-[0.875rem] text-white outline-none resize-none placeholder:text-white/20"
            />
          </div>

          <button 
            type="submit"
            disabled={isSaving || isUploading}
            className="w-full bg-blue-900 text-white py-4 rounded-[8px] font-black uppercase tracking-widest text-[0.875rem] shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:brightness-110"
          >
            {isSaving ? 'Salvando...' : 'Concluir Perfil'}
            {!isSaving && <Check size={20} strokeWidth={3} />}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
