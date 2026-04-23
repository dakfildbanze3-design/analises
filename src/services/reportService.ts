import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export interface ReportData {
  targetId: string; // The ID of the thing being reported (product, post, short)
  targetType: 'product' | 'short' | 'user';
  reportedUserId?: string; // The ID of the owner of the content
  reason: string;
  description: string;
}

export const reportService = {
  async submitReport(data: ReportData) {
    if (!auth.currentUser) {
      throw new Error("Precisa ter a sessão iniciada para fazer uma denúncia.");
    }

    try {
      await addDoc(collection(db, 'reports'), {
        ...data,
        reporterId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        status: 'pending' // 'pending', 'reviewed', 'resolved'
      });
    } catch (error: any) {
      console.error("Erro ao enviar denúncia:", error);
      throw error;
    }
  }
};
