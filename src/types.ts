export interface Product {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  category: string;
  image: string;
  description?: string;
}

export interface Chat {
  id: string;
  user: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unreadCount?: number;
  online?: boolean;
}

export interface Notification {
  id: string;
  type: 'sale' | 'interest' | 'comment' | 'system';
  title: string;
  content: string;
  time: string;
  image?: string;
}

export interface UserProfile {
  id: string;
  displayName?: string;
  photoURL?: string;
  email?: string;
  phoneNumber?: string;
  city?: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  productsCount?: number;
  isVerified?: boolean;
}
