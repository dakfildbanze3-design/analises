import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  getDoc,
  setDoc,
  getDocs,
  limit
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

import { supabase } from '../lib/supabase';

export interface Message {
  id: string;
  text: string;
  sender_id: string; // Adjusted to requested name
  senderId?: string; // Compatibility
  sender_name?: string;
  sender_avatar?: string;
  created_at: any; // Adjusted to requested name
  createdAt?: any; // Compatibility
  image?: string;
  type?: 'text' | 'audio' | 'call_log' | 'image' | 'video';
  duration?: number; // Adjusted to requested name
  audioDuration?: number; // Compatibility
  audio_url?: string; // Adjusted to requested name
  audioUrl?: string; // Compatibility
  image_url?: string;
  imageUrl?: string;
  video_url?: string;
  videoUrl?: string;
  chat_id: string;
  status?: 'sent' | 'seen';
  participants?: string[];
}

export interface ChatRoom {
  id: string;
  participants: string[];
  lastMessage?: string;
  updatedAt?: any;
  lastSenderId?: string;
  unreadCount_currentUser?: number;
  otherUser?: {
    id: string;
    displayName: string;
    avatarUrl: string;
  };
}

export const chatService = {
  /**
   * Upload de áudio para o Supabase Storage
   */
  async uploadAudio(blob: Blob): Promise<string> {
    const fileName = `${auth.currentUser?.uid}_${Date.now()}.m4a`;
    const { data, error } = await supabase.storage
      .from('chat-audio')
      .upload(fileName, blob, {
        contentType: 'audio/m4a',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Erro no upload Supabase:', error);
      throw error;
    }

    const { data: publicData } = supabase.storage
      .from('chat-audio')
      .getPublicUrl(data.path);

    return publicData.publicUrl;
  },

  /**
   * Upload de arquivo genérico para o Supabase Storage
   */
  async uploadFile(blob: Blob, bucket: string, extension: string): Promise<string> {
    const fileName = `${auth.currentUser?.uid}_${Date.now()}.${extension}`;
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, blob, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Erro no upload Supabase:', error);
      throw error;
    }

    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicData.publicUrl;
  },

  /**
   * Obtém ou cria uma sala de chat entre dois usuários
   */
  async getOrCreateChat(otherUserId: string, otherUserName?: string, otherUserAvatar?: string) {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId || !otherUserId) throw new Error("Usuários não identificados");
    if (currentUserId === otherUserId) throw new Error("Não podes iniciar um chat contigo mesmo");

    // Tentar encontrar chat existente
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef, 
      where('participants', 'array-contains', currentUserId)
    );
    
    const snapshot = await getDocs(q);
    let commonChat = snapshot.docs.find(doc => {
      const parts = doc.data().participants as string[];
      return parts.includes(otherUserId);
    });

    if (commonChat) {
      return commonChat.id;
    }

    // Se não existir, criar novo
    const newChatRef = await addDoc(chatsRef, {
      participants: [currentUserId, otherUserId],
      updatedAt: serverTimestamp(),
      lastMessage: '',
      // Guardar nomes denormalizados para facilitar a lista
      [`userName_${currentUserId}`]: auth.currentUser?.displayName || 'Usuário',
      [`userAvatar_${currentUserId}`]: auth.currentUser?.photoURL || '',
      [`userName_${otherUserId}`]: otherUserName || 'Vendedor',
      [`userAvatar_${otherUserId}`]: otherUserAvatar || '',
      [`unreadCount_${currentUserId}`]: 0,
      [`unreadCount_${otherUserId}`]: 0,
    });

    return newChatRef.id;
  },

  /**
   * Envia uma mensagem
   */
  async sendMessage(
    chatId: string, 
    text: string, 
    type: 'text' | 'audio' | 'call_log' | 'image' | 'video' = 'text', 
    duration: number = 0, 
    fileBlob?: Blob
  ) {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    let audio_url = null;
    let image_url = null;
    let video_url = null;

    if (type === 'audio' && fileBlob) {
      audio_url = await this.uploadAudio(fileBlob);
    } else if (type === 'image' && fileBlob) {
      image_url = await this.uploadFile(fileBlob, 'product-images', 'jpg');
    } else if (type === 'video' && fileBlob) {
      video_url = await this.uploadFile(fileBlob, 'product-images', 'mp4');
    }

    // Obter os participantes do chat para guardar na mensagem (para regras de segurança otimizadas)
    const chatDocRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatDocRef);
    let participants = [userId];
    let otherUserId = '';
    if (chatSnap.exists()) {
      participants = chatSnap.data().participants || [userId];
      otherUserId = participants.find(p => p !== userId) || '';
    }

    const messageData: any = {
      chat_id: chatId,
      sender_id: userId,
      senderId: userId, // compatibility
      sender_name: auth.currentUser?.displayName || 'Usuário',
      sender_avatar: auth.currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
      text,
      audio_url,
      audioUrl: audio_url, // compatibility
      image_url,
      imageUrl: image_url, // compatibility
      video_url,
      videoUrl: video_url, // compatibility
      duration,
      audioDuration: duration, // compatibility
      type,
      participants: participants, // Added for security rules without get()
      created_at: serverTimestamp(),
      createdAt: serverTimestamp(), // compatibility
      status: 'sent'
    };

    // Usando a coleção "messages" conforme solicitado
    await addDoc(collection(db, 'messages'), messageData);

    const updateData: any = {
      lastMessage: type === 'audio' ? '🎵 Áudio' : type === 'image' ? '🖼️ Foto' : type === 'video' ? '🎥 Vídeo' : type === 'call_log' ? '📞 Chamada' : text,
      updatedAt: serverTimestamp(),
      lastSenderId: userId,
    };

    // Incrementar contador de não lidas para o destinatário
    if (otherUserId) {
      const currentUnread = chatSnap.data()?.[`unreadCount_${otherUserId}`] || 0;
      updateData[`unreadCount_${otherUserId}`] = currentUnread + 1;
    }

    await updateDoc(chatDocRef, updateData);
  },

  /**
   * Marca mensagens como lidas
   */
  async markAsRead(chatId: string) {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const chatDocRef = doc(db, 'chats', chatId);
    await updateDoc(chatDocRef, {
      [`unreadCount_${userId}`]: 0
    });

    // Também marcar mensagens individuais como 'seen'
    const q = query(
      collection(db, 'messages'),
      where('chat_id', '==', chatId),
      where('participants', 'array-contains', userId), // Required by Firestore rules
      where('status', '==', 'sent'),
      limit(50)
    );

    const snapshot = await getDocs(q);
    const promises = snapshot.docs
      .filter(docSnap => docSnap.data().sender_id !== userId) // Filter sender locally to avoid complex query constraints
      .map(docSnap => 
        updateDoc(doc(db, 'messages', docSnap.id), { status: 'seen' })
      );
    await Promise.all(promises);
  },

  /**
   * Subscreve às mensagens de um chat
   */
  subscribeToMessages(chatId: string, callback: (messages: Message[]) => void) {
    const userId = auth.currentUser?.uid;
    const q = query(
      collection(db, 'messages'),
      where('chat_id', '==', chatId),
      where('participants', 'array-contains', userId),
      orderBy('created_at', 'asc'),
      limit(100)
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          sender_id: data.sender_id || data.senderId,
          created_at: data.created_at || data.createdAt,
          duration: data.duration || data.audioDuration,
          audio_url: data.audio_url || data.audioUrl,
          image_url: data.image_url || data.imageUrl,
          video_url: data.video_url || data.videoUrl,
          chat_id: data.chat_id,
          status: data.status || 'sent'
        };
      }) as Message[];
      callback(messages);
    });
  },

  /**
   * Obtém detalhes da sala de chat
   */
  subscribeToChatRoom(chatId: string, callback: (room: ChatRoom) => void) {
    return onSnapshot(doc(db, 'chats', chatId), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const currentUserId = auth.currentUser?.uid;
        const otherUserId = data.participants.find((p: string) => p !== currentUserId);

        let realName = data[`userName_${otherUserId}`] || 'Usuário';
        let realAvatar = data[`userAvatar_${otherUserId}`] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUserId}`;

        // Obter dados atualizados do utilizador
        if (otherUserId) {
          try {
            const userSnap = await getDoc(doc(db, 'users', otherUserId));
            if (userSnap.exists()) {
              const userData = userSnap.data();
              if (userData.displayName) realName = userData.displayName;
              if (userData.avatarUrl) realAvatar = userData.avatarUrl;
            }
          } catch (err) {
            console.warn("Erro ao carregar dados do user:", err);
          }
        }

        callback({
          id: docSnap.id,
          participants: data.participants,
          lastMessage: data.lastMessage,
          updatedAt: data.updatedAt,
          lastSenderId: data.lastSenderId,
          unreadCount_currentUser: data[`unreadCount_${currentUserId}`] || 0,
          otherUser: {
            id: otherUserId,
            displayName: realName,
            avatarUrl: realAvatar
          }
        });
      }
    });
  },

  /**
   * Subscreve ao contador total de mensagens não lidas de todos os chats
   */
  subscribeToTotalUnreadCount(userId: string, callback: (count: number) => void) {
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId)
    );

    return onSnapshot(q, (snapshot) => {
      const total = snapshot.docs.reduce((acc, docSnap) => {
        const data = docSnap.data();
        return acc + (data[`unreadCount_${userId}`] || 0);
      }, 0);
      callback(total);
    });
  }
};
