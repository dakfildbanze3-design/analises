import React, { useState, useEffect } from 'react';
import { Home, MessageSquare, PlusSquare, Bell, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { notificationService } from '../services/notificationService';
import { chatService } from '../services/chatService';
import { auth } from '../lib/firebase';

export default function BottomNav() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubNotifications = notificationService.subscribeToUnreadCount(
      auth.currentUser.uid,
      (count) => setUnreadCount(count)
    );

    const unsubChat = chatService.subscribeToTotalUnreadCount(
      auth.currentUser.uid,
      (count) => setChatUnreadCount(count)
    );

    return () => {
      unsubNotifications();
      unsubChat();
    };
  }, [auth.currentUser?.uid]);

  const navItems = [
    { icon: Home, label: 'Início', path: '/' },
    { icon: MessageSquare, label: 'Chat', path: '/chat', badge: chatUnreadCount },
    { icon: PlusSquare, label: 'Vender', path: '/sell-camera' },
    { icon: Bell, label: 'Alertas', path: '/alerts', badge: unreadCount },
    { icon: User, label: 'Perfil', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center h-14 px-2 bg-black z-50 border-t border-outline-variant/10">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => `
            flex flex-col items-center justify-center pt-1 transition-all relative w-full
            ${isActive ? 'text-primary border-t-2 border-primary-container' : 'text-on-surface/60 hover:text-primary'}
          `}
        >
          <item.icon size={20} strokeWidth={3} fill={item.path === '/profile' ? 'currentColor' : 'none'} />
          <span className="text-[0.6875rem] uppercase font-medium mt-0.5">{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <span className="absolute top-1 right-1/2 translate-x-4 bg-primary text-black text-[0.625rem] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-black">
              {item.badge > 9 ? '9+' : item.badge}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
