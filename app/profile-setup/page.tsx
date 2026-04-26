'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Camera, Check, Loader2 } from 'lucide-react';
import { auth, db, supabase, STORAGE_BUCKETS } from '@/src/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

export default function ProfileSetup() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingInit, setIsFetchingInit] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) {
        setIsFetchingInit(false);
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setName(data.displayName || user.displayName || '');
          setBio(data.bio || '');
          setAvatar(data.avatarUrl || user.photoURL || null);
        } else {
          setName(user.displayName || '');
          setAvatar(user.photoURL || null);
        }
      } catch (e) {
        console.error(e);
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
      if (!supabase) throw new Error('Supabase not configured');
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from(STORAGE_BUCKETS.AVATARS).upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKETS.AVATARS).getPublicUrl(fileName);
      setAvatar(publicUrl);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setIsSaving(true);
    try {
      await updateProfile(auth.currentUser, { displayName: name, photoURL: avatar });
      await setDoc(doc(db, 'users', auth.currentUser.uid), { displayName: name, bio: bio, avatarUrl: avatar }, { merge: true });
      router.push('/');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isFetchingInit) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen pt-12 flex flex-col justify-center px-6 bg-background">
      <div className="max-w-sm mx-auto w-full">
        <h1 className="text-2xl font-black uppercase mb-4">Complete o seu perfil</h1>
        <form onSubmit={handleComplete} className="space-y-6">
          <div className="flex items-center gap-4 bg-surface-container p-4 rounded-[12px]">
            <label className="cursor-pointer relative">
              <input type="file" className="hidden" onChange={handleAvatarUpload} />
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border-2 border-dashed border-white/20">
                {isUploading ? <Loader2 className="animate-spin" /> : avatar ? <img src={avatar} className="w-full h-full object-cover" /> : <Camera size={24} />}
              </div>
            </label>
            <div className="flex-1">
              <label className="text-xs font-bold uppercase opacity-50 mb-1 block">Nome</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent border-b border-white/10 outline-none pb-1" required />
            </div>
          </div>
          <div className="bg-surface-container p-4 rounded-[12px]">
            <label className="text-xs font-bold uppercase opacity-50 mb-1 block">Biografia</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full bg-transparent outline-none resize-none" rows={3} />
          </div>
          <button type="submit" disabled={isSaving || isUploading} className="w-full bg-primary text-black font-black py-4 rounded-full flex items-center justify-center gap-2">
            {isSaving ? 'Salvando...' : 'Concluir'} <Check size={20} />
          </button>
        </form>
      </div>
    </motion.div>
  );
}
