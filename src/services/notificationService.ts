import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  serverTimestamp,
  getDocs,
  getDoc,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { db, auth, messaging } from '../lib/firebase';

export type NotificationType = 'like' | 'comment' | 'follow' | 'post';

export interface AppNotification {
  id: string;
  type: NotificationType;
  fromUserId: string;
  fromUserName?: string;
  fromUserAvatar?: string;
  toUserId: string;
  postId?: string;
  text: string;
  read: boolean;
  createdAt: Timestamp;
}

export const notificationService = {
  /**
   * Create a new notification
   */
  async createNotification(params: {
    type: NotificationType;
    toUserId: string;
    postId?: string;
    text: string;
  }) {
    const { type, toUserId, postId, text } = params;
    const currentUser = auth.currentUser;

    if (!currentUser || currentUser.uid === toUserId) return;

    try {
      await addDoc(collection(db, 'notifications'), {
        type,
        fromUserId: currentUser.uid,
        fromUserName: currentUser.displayName || 'Alguém',
        fromUserAvatar: currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.uid}`,
        toUserId,
        postId,
        text,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  },

  /**
   * Subscribe to unread notification count
   */
  subscribeToUnreadCount(userId: string, callback: (count: number) => void) {
    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', userId),
      where('read', '==', false)
    );

    return onSnapshot(q, (snapshot) => {
      callback(snapshot.size);
    });
  },

  /**
   * Subscribe to notification list
   */
  subscribeToNotifications(userId: string, callback: (notifications: AppNotification[]) => void) {
    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, async (snapshot) => {
      const promises = snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        let realName = data.fromUserName;
        let realAvatar = data.fromUserAvatar;

        if (data.fromUserId) {
          try {
            const userSnap = await getDoc(doc(db, 'users', data.fromUserId));
            if (userSnap.exists()) {
              const uData = userSnap.data();
              if (uData.displayName) realName = uData.displayName;
              if (uData.avatarUrl) realAvatar = uData.avatarUrl;
            }
          } catch (err) {
            console.warn("Failed to fetch real user data for notification", err);
          }
        }

        return {
          id: docSnap.id,
          ...data,
          fromUserName: realName,
          fromUserAvatar: realAvatar
        } as AppNotification;
      });

      const notifications = await Promise.all(promises);
      callback(notifications);
    });
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId: string) {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('toUserId', '==', userId),
        where('read', '==', false)
      );
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.docs.forEach((docSnap) => {
        batch.update(docSnap.ref, { read: true });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  },

  /**
   * Register FCM Token for the user
   */
  async saveFCMToken(userId: string) {
    if (!messaging) return;

    try {
      // Safety check for environments where Notification API is missing (e.g. some mobile browsers or non-secure contexts)
      if (typeof window === 'undefined' || !('Notification' in window)) {
        console.warn('Notification API not supported in this browser.');
        return;
      }

      // Notification permission request removed for better UX
      /*
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
      */
        const token = await getToken(messaging, {
          vapidKey: (import.meta as any).env.VITE_FIREBASE_VAPID_KEY
        });

        if (token) {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, { fcmToken: token });
          console.log('FCM Token saved');
        }
      /*
      }
      */
    } catch (error) {
           console.warn('FCM registration skipped or failed (unsupported in some dev environments):', error);
    }
  },

  /**
   * Setup foreground message listener
   */
  listenForMessages() {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      console.log('Message received in foreground: ', payload);
      // You could show a toast here
    });
  }
};
