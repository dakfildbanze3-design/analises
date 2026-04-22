import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

const API_KEY = "AIzaSyBzdm9ZalO_TLaS7X7JiH5MJGgdUTYHC2c";
const SEARCH_ID = "371250384a1704742";

export async function searchMoz() {
  const searchQuery = "vendas Maputo OR carros Moçambique OR telefones Maputo OR casas Maputo OR computadores Moçambique";
  const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ID}&q=${encodeURIComponent(searchQuery)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Erro na busca Google:", error);
    return [];
  }
}

export async function syncGoogleProductsToFirebase() {
  const items = await searchMoz();
  
  for (const item of items) {
    const image = item.pagemap?.cse_image?.[0]?.src || item.pagemap?.metatags?.[0]?.['og:image'];
    
    if (!image) continue;

    // Verificar se já existe (evitar duplicados simples pelo link)
    const q = query(collection(db, "products"), where("externalLink", "==", item.link));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      await addDoc(collection(db, "products"), {
        name: item.title,
        description: item.snippet,
        price: "Consultar", // Preço não vem estruturado do Google Search
        image: image,
        category: "TUDO",
        sellerId: "google-sync",
        author: "Anúncio Web",
        avatar: "https://www.google.com/favicon.ico",
        createdAt: serverTimestamp(),
        views: Math.floor(Math.random() * 500),
        externalLink: item.link,
        productType: 'standard'
      });
      console.log("Produto sincronizado:", item.title);
    }
  }
}
