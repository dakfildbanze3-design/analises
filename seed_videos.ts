import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

const videos = [
  { id: "AclmGFVyVa4", name: "Anúncio Premium 1", category: "Serviços" },
  { id: "BrqU9_xqo8Q", name: "Anúncio de Impacto", category: "Serviços" },
  { id: "1UzGdUe82jA", name: "Lançamento Exclusivo", category: "Acessórios" },
  { id: "INQPq9e8iOg", name: "Oferta Sensacional", category: "Roupas" }
];

async function seed() {
  console.log("Seeding videos...");
  for (const v of videos) {
    const url = `https://youtu.be/${v.id}`;
    const imgUrl = `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`;
    
    await addDoc(collection(db, 'products'), {
      name: v.name,
      description: "Anúncio dinâmico para promover produtos com máximo impacto no mercado.",
      price: 999,
      category: v.category,
      location: "Maputo",
      productType: "short",
      videoUrl: url,
      images: [imgUrl],
      sellerId: "admin_seed",
      sellerName: "Boladas Ads",
      views: Math.floor(Math.random() * 5000) + 1000,
      likedBy: [],
      createdAt: new Date() // Since serverTimestamp won't work perfectly via simple node script sometimes without complex auth logic, we use Date
    });
    console.log("Added", url);
  }
  console.log("Done seeding.");
  process.exit(0);
}

seed().catch(console.error);
