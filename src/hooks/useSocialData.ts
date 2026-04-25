import { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  DocumentData,
  Query,
  queryEqual
} from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Custom hook to fetch Firestore data with offline-first persistence.
 */
export function useOfflineCollection(path: string, constraints: any[] = [], limitCount = 40) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // We use a separate state to track if we have server data
  const [isFromServer, setIsFromServer] = useState(false);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, path),
      ...constraints,
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setData(items);
        setLoading(false);
        setIsFromServer(!snapshot.metadata.fromCache);
      },
      (err) => {
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [path, JSON.stringify(constraints.map(c => c.toString())), limitCount]);

  return { data, loading, error, isFromServer };
}

/**
 * Specific hook for the social feed
 */
export function useFeed() {
  return useOfflineCollection('products', [/* add filters if needed */]);
}
