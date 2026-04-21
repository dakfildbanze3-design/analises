import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { GoogleIcon } from './Login';
import { auth, googleProvider, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [location, setLocation] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("As senhas não coincidem.");
      return;
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save initial user data to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        location: location,
        createdAt: serverTimestamp()
      }, { merge: true });

      navigate('/profile-setup');
    } catch (error: any) {
      alert('Erro ao registar: ' + error.message);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;

      // Check if user already exists in Firestore (optional, setDoc will overwrite or you can check)
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        location: '', // Will be filled later
        createdAt: serverTimestamp()
      }, { merge: true });

      navigate('/profile-setup');
    } catch (error: any) {
      alert('Erro com Google: ' + error.message);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen bg-background px-6 py-8 flex flex-col"
    >
      <button onClick={() => navigate(-1)} className="mb-6 text-on-surface-variant hover:text-primary transition-colors">
        <ArrowLeft size={24} strokeWidth={2.5} />
      </button>

      <div className="flex-1 flex flex-col justify-center items-center text-center">
        <img 
          src="/android-chrome-512x512.png" 
          alt="Logo" 
          className="w-20 h-20 mb-6 object-contain"
        />
        <h1 className="text-[2rem] font-black uppercase tracking-tighter mb-2">Criar Conta</h1>
        <p className="text-on-surface-variant text-[0.875rem] mb-6 max-w-[280px]">
          Junta-te à comunidade e começa a fazer grandes negócios.
        </p>

        <form onSubmit={handleRegister} className="space-y-4 mb-6 w-full text-left">
          <div>
            <label className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
              Email
            </label>
            <input 
              type="email" 
              placeholder="O teu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-[3px] px-4 py-3.5 text-[0.875rem] focus:ring-2 focus:ring-primary outline-none transition-all"
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
              className="w-full bg-surface-container-low border-none rounded-[3px] px-4 py-3.5 text-[0.875rem] focus:ring-2 focus:ring-primary outline-none transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
                Senha
              </label>
              <input 
                type="password" 
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-[3px] px-4 py-3.5 text-[0.875rem] focus:ring-2 focus:ring-primary outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="text-[0.75rem] font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
                Confirmar
              </label>
              <input 
                type="password" 
                placeholder="Repetir"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-[3px] px-4 py-3.5 text-[0.875rem] focus:ring-2 focus:ring-primary outline-none transition-all"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-blue-900 text-white py-4 rounded-[3px] font-black uppercase tracking-widest text-[0.875rem] shadow-lg active:scale-[0.98] transition-all mt-6 hover:brightness-110"
          >
            Criar Conta
          </button>
        </form>

        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-outline-variant/20"></div>
          </div>
          <span className="relative bg-background px-4 text-[0.75rem] text-on-surface-variant uppercase tracking-widest font-bold">
            Ou
          </span>
        </div>

        <button 
          type="button"
          onClick={handleGoogleRegister}
          className="w-full bg-surface-container-low text-on-surface py-3.5 rounded-[3px] font-bold text-[0.875rem] flex items-center justify-center gap-3 active:scale-[0.98] transition-all border border-outline-variant/10 hover:bg-surface-container-high"
        >
          <GoogleIcon />
          Registar com Google
        </button>

        <p className="text-center mt-6 text-[0.875rem] text-on-surface-variant">
          Já tens uma conta?{' '}
          <Link to="/login" className="text-primary font-bold hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
