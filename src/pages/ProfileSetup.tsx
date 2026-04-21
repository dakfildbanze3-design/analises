import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Camera, Check, Loader2 } from 'lucide-react';
import { auth, db, supabase, STORAGE_BUCKETS } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
        avatarUrl: avatar,
      }, { merge: true });
      navigate('/');
    } catch (error: any) {
      alert('Erro ao salvar perfil: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen bg-background px-6 py-12 flex flex-col justify-center"
    >
      <div className="max-w-sm mx-auto w-full">
        <div className="text-center mb-10">
          <h1 className="text-[2rem] font-black uppercase tracking-tighter mb-4">Quase lá!</h1>
          <p className="text-on-surface-variant text-[0.9375rem] leading-relaxed">
            Faça o upload do seu avatar e escreva o seu nome para que as pessoas possam ver quem publicou a bolada.
          </p>
        </div>

        <form onSubmit={handleComplete} className="space-y-8">
          
          {/* Avatar and Name on the same line */}
          <div className="flex items-center gap-5 bg-surface-container-low p-4 rounded-[3px] border border-outline-variant/10">
            <div className="flex-shrink-0">
              <label className="cursor-pointer block">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                />
                <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center relative overflow-hidden border-2 border-dashed border-outline-variant/40 hover:border-primary transition-colors group">
                  {isUploading ? (
                    <Loader2 size={24} className="animate-spin text-primary" />
                  ) : avatar ? (
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={24} className="text-on-surface-variant group-hover:text-primary transition-colors" />
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
              <label className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 block">
                Nome de exibição
              </label>
              <input 
                type="text" 
                placeholder="O teu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border-b-2 border-outline-variant/30 focus:border-primary px-0 py-2 text-[1rem] font-medium outline-none transition-colors"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isSaving || isUploading}
            className="w-full bg-blue-900 text-white py-4 rounded-[3px] font-black uppercase tracking-widest text-[0.875rem] shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:brightness-110"
          >
            {isSaving ? 'Salvando...' : 'Concluir Perfil'}
            {!isSaving && <Check size={20} strokeWidth={3} />}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
