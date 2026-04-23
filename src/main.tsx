import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { auth, db } from './lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';

async function seedYoutubeVideos() {
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    try {
      const q = query(collection(db, 'products'), where('videoUrl', '==', 'https://youtu.be/AclmGFVyVa4'));
      const snap = await getDocs(q);
      if (snap.empty) {
        console.log("Seeding initial YT videos...");
        const videos = [
          { id: "AclmGFVyVa4", name: "Anúncio Premium 1", category: "Serviços" },
          { id: "BrqU9_xqo8Q", name: "Anúncio de Impacto", category: "Serviços" },
          { id: "1UzGdUe82jA", name: "Lançamento Exclusivo", category: "Acessórios" },
          { id: "INQPq9e8iOg", name: "Oferta Sensacional", category: "Roupas" }
        ];

        for (const v of videos) {
          const url = `https://youtu.be/${v.id}`;
          const imgUrl = `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`;
          
          await addDoc(collection(db, 'products'), {
            name: v.name,
            description: "Anúncio pronto a inspirar vendas no Bazar.",
            price: 999,
            category: v.category,
            location: "Maputo",
            productType: "short",
            videoUrl: url,
            images: [imgUrl],
            sellerId: user.uid,
            sellerName: user.displayName || "Admin",
            sellerAvatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
            views: Math.floor(Math.random() * 5000),
            likedBy: [],
            createdAt: serverTimestamp()
          });
        }
        console.log("Seeding complete!");
      }
    } catch (e) {
      console.warn("Seed ignored", e);
    }
  });
}

seedYoutubeVideos();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}
