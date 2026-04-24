import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Camera, Loader2, Check } from 'lucide-react';
import { auth, db, supabase, STORAGE_BUCKETS } from '../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const PersonalInfo: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    username: '',
    bio: '',
    location: '',
    avatarUrl: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) return;
      try {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile(data);
          setFormData({
            displayName: data.displayName || '',
            username: data.username || '',
            bio: data.bio || '',
            location: data.location || '',
            avatarUrl: data.avatarUrl || ''
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    setUploading(true);
    try {
      if (!supabase) {
        throw new Error('Serviço de upload não configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas configurações.');
      }
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.AVATARS)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKETS.AVATARS)
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, avatarUrl: publicUrl }));
    } catch (err: any) {
      alert('Erro no upload: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(docRef, {
        displayName: formData.displayName,
        username: formData.username,
        bio: formData.bio,
        location: formData.location,
        avatarUrl: formData.avatarUrl,
        updatedAt: new Date()
      });
      alert('Informações atualizadas com sucesso!');
      onClose();
    } catch (e: any) {
      alert('Erro ao salvar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="fixed inset-0 z-50 bg-background flex justify-center items-center"><Loader2 className="animate-spin text-zinc-500" /></div>;

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-background overflow-y-auto"
    >
      <div className="sticky top-0 bg-background/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-outline-variant/10 z-10">
        <button onClick={onClose} className="p-2 border border-outline-variant/20 rounded-full text-on-surface hover:bg-surface-container transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-[0.875rem] font-bold text-on-surface uppercase tracking-widest">Informações Pessoais</h2>
        <div className="w-9" />
      </div>

      <div className="p-6">
        <div className="flex flex-col items-center mb-8">
          <label className="cursor-pointer relative group block">
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
            <div className="w-24 h-24 rounded-full bg-surface-container-highest overflow-hidden border-2 border-primary border-dashed flex items-center justify-center">
              {uploading ? (
                <Loader2 size={24} className="animate-spin text-primary" />
              ) : formData.avatarUrl ? (
                <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <Camera size={24} className="text-on-surface-variant group-hover:text-primary" />
              )}
              {formData.avatarUrl && !uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={20} className="text-white" />
                </div>
              )}
            </div>
          </label>
          <span className="text-[0.625rem] text-primary uppercase font-bold mt-3 tracking-widest cursor-pointer">Trocar Foto</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant block mb-1">Nome Completo</label>
            <input 
              className="w-full bg-surface-container p-3 rounded-[3px] text-[0.875rem] border border-outline-variant/10 focus:border-primary outline-none"
              value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})}
            />
          </div>
          <div>
            <label className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant block mb-1">Username</label>
            <input 
              className="w-full bg-surface-container p-3 rounded-[3px] text-[0.875rem] border border-outline-variant/10 focus:border-primary outline-none"
              value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})}
              placeholder="@username"
            />
          </div>
          <div>
            <label className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant block mb-1">Localização</label>
            <input 
              className="w-full bg-surface-container p-3 rounded-[3px] text-[0.875rem] border border-outline-variant/10 focus:border-primary outline-none"
              value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}
            />
          </div>
          <div>
            <label className="text-[0.6875rem] font-bold uppercase tracking-widest text-on-surface-variant block mb-1">Biografia</label>
            <textarea 
              className="w-full bg-surface-container p-3 rounded-[3px] text-[0.875rem] border border-outline-variant/10 focus:border-primary outline-none min-h-[100px] resize-y"
              value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})}
              placeholder="Fale um pouco sobre si..."
            />
          </div>
        </div>

        <button 
          onClick={handleSave} disabled={saving || uploading}
          className="w-full mt-8 bg-blue-900 text-white font-black text-[0.875rem] uppercase tracking-widest py-4 rounded-[3px] flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : <><Check size={20} /> Guardar Alterações</>}
        </button>
      </div>
    </motion.div>
  );
}

export default PersonalInfo;
