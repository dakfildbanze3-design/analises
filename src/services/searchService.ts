import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDocs,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export interface SearchHistory {
  id: string;
  query: string;
  timestamp: any;
  userId: string;
}

export const searchService = {
  /**
   * Save a search query to history
   */
  async saveSearchQuery(text: string) {
    if (!auth.currentUser || !text.trim()) return;

    try {
      const q = text.trim();
      
      // Check if already exists in recent history to avoid duplicates
      const historyQ = query(
        collection(db, 'search_history'),
        where('userId', '==', auth.currentUser.uid),
        where('query', '==', q),
        limit(1)
      );
      
      const snapshot = await getDocs(historyQ);
      
      if (snapshot.empty) {
        await addDoc(collection(db, 'search_history'), {
          userId: auth.currentUser.uid,
          query: q,
          timestamp: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error saving search history:", error);
    }
  },

  /**
   * Get search history for the current user
   */
  subscribeToHistory(callback: (history: SearchHistory[]) => void) {
    if (!auth.currentUser) return () => {};

    const q = query(
      collection(db, 'search_history'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    return onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SearchHistory[];
      callback(history);
    }, (error) => {
      console.error("Error subscribing to search history:", error);
    });
  },

  /**
   * Clear a single history item
   */
  async deleteHistoryItem(id: string) {
    try {
      await deleteDoc(doc(db, 'search_history', id));
    } catch (error) {
      console.error("Error deleting history item:", error);
    }
  },

  /**
   * Clear all history for the user
   */
  async clearAllHistory() {
    if (!auth.currentUser) return;
    
    try {
      const q = query(
        collection(db, 'search_history'),
        where('userId', '==', auth.currentUser.uid)
      );
      
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      
      await batch.commit();
    } catch (error) {
      console.error("Error clearing search history:", error);
    }
  }
};
