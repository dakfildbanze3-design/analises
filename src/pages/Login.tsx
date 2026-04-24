import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';

export const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (error: any) {
      alert('Erro ao entrar: ' + error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/profile-setup');
    } catch (error: any) {
      alert('Erro com Google: ' + error.message);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen bg-background px-6 py-8 flex flex-col"
    >
      <div className="flex-1 flex flex-col justify-center items-center text-center">
        <img 
          src="/android-chrome-512x512.png" 
          alt="Logo" 
          className="w-20 h-20 mb-6 object-contain"
        />
        <h1 className="text-[2rem] font-black uppercase tracking-tighter mb-2">Bem-vindo de volta</h1>
        <p className="text-on-surface-variant text-[0.875rem] mb-8 max-w-[280px]">
          Inicia sessão para continuares a explorar as melhores boladas.
        </p>

        <form onSubmit={handleLogin} className="space-y-4 mb-8 w-full text-left">
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
              Senha
            </label>
            <input 
              type="password" 
              placeholder="A tua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-[3px] px-4 py-3.5 text-[0.875rem] focus:ring-2 focus:ring-primary outline-none transition-all"
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full shiny-button text-white py-4 rounded-full font-black uppercase tracking-[0.2em] text-[0.875rem] shadow-2xl mt-4"
          >
            Entrar
          </button>
        </form>

        <div className="relative flex items-center justify-center mb-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-outline-variant/20"></div>
          </div>
          <span className="relative bg-background px-4 text-[0.75rem] text-on-surface-variant uppercase tracking-widest font-bold">
            Ou
          </span>
        </div>

        <button 
          type="button"
          onClick={handleGoogleLogin}
          className="w-full bg-surface-container-low text-on-surface py-3.5 rounded-[3px] font-bold text-[0.875rem] flex items-center justify-center gap-3 active:scale-[0.98] transition-all border border-outline-variant/10 hover:bg-surface-container-high"
        >
          <GoogleIcon />
          Continuar com Google
        </button>

        <p className="text-center mt-auto pt-8 text-[0.875rem] text-on-surface-variant">
          Não tens uma conta?{' '}
          <Link to="/register" className="text-primary font-bold hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
