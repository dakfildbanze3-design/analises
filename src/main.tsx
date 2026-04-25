import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ... (existing imports)
import { auth, db } from './lib/firebase';
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';

async function cleanupSeedVideos() {
  const dummyIds = [
    "AclmGFVyVa4", "BrqU9_xqo8Q", "1UzGdUe82jA", "INQPq9e8iOg", "K9c8W_F7qxk"
  ];
  
  try {
    const productsRef = collection(db, 'products');
    for (const vidId of dummyIds) {
      const q = query(productsRef, where('videoUrl', '==', `https://youtu.be/${vidId}`));
      const snap = await getDocs(q);
      for (const docSnap of snap.docs) {
        await deleteDoc(doc(db, 'products', docSnap.id));
        console.log(`Deleted ghost video: ${vidId}`);
      }
    }
  } catch (e) {
    console.warn("Cleanup failed", e);
  }
}

// Run cleanup once on start if needed (you can remove this after it runs once)
cleanupSeedVideos();

console.log("Main.tsx initialization started");

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
