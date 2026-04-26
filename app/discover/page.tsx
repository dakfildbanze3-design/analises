'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db, auth } from '@/src/lib/firebase';
import { UserProfile } from '@/src/types';
import { checkIsFollowing, followUser, unfollowUser } from '@/src/services/followService';
import { UserPlus, UserCheck, Loader2, Search } from 'lucide-react';

export default function DiscoverPage() {
  const router = useRouter();
  const [users, setUsers] = useState<(UserProfile & { isFollowing: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'users'), limit(30)));
      const userList = await Promise.all(snap.docs.map(async (doc) => {
        const userData = { id: doc.id, ...doc.data() } as UserProfile;
        let isFollowing = false;
        if (auth.currentUser && auth.currentUser.uid !== doc.id) {
          isFollowing = await checkIsFollowing(auth.currentUser.uid, doc.id);
        }
        return { ...userData, isFollowing };
      }));
      setUsers(userList.filter(u => u.id !== auth.currentUser?.uid));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleFollow = async (targetUserId: string, currentlyFollowing: boolean) => {
    if (!auth.currentUser) {
      router.push('/login');
      return;
    }
    try {
      if (currentlyFollowing) await unfollowUser(targetUserId);
      else await followUser(targetUserId);
      setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, isFollowing: !currentlyFollowing } : u));
    } catch (error) {
      console.error(error);
    }
  };

  const filteredUsers = users.filter(u => u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen pt-16 pb-20 bg-background px-4">
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={14} />
        <input placeholder="Procurar por nome..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-surface-container rounded-full py-2 pl-9 pr-4 text-xs font-bold" />
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><Loader2 className="animate-spin" size={24} /></div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <motion.div key={user.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between bg-surface-container p-3 rounded-[12px]">
              <div onClick={() => router.push(`/public-profile/${user.id}`)} className="flex items-center gap-3 flex-1 cursor-pointer">
                <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} className="w-12 h-12 rounded-full border border-white/10" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold truncate">{user.displayName || 'Utilizador'}</span>
                  <span className="text-xs opacity-50">@{user.email?.split('@')[0]}</span>
                </div>
              </div>
              <button onClick={() => handleToggleFollow(user.id, user.isFollowing)} className={`px-4 py-1.5 rounded-full text-[0.7rem] font-black uppercase ${user.isFollowing ? 'bg-surface text-white/60' : 'bg-primary text-black'}`}>
                {user.isFollowing ? <UserCheck size={14} className="inline mr-1" /> : <UserPlus size={14} className="inline mr-1" />}
                {user.isFollowing ? 'Seguindo' : 'Seguir'}
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
