import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { UserProfile } from '../types';
import { checkIsFollowing, followUser, unfollowUser } from '../services/followService';
import TopBar from '../components/TopBar';
import { UserPlus, UserCheck, Loader2, Search } from 'lucide-react';

const DiscoverUsers: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<(UserProfile & { isFollowing: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      // Just a simple "recent/recommended" fetch for now
      const q = query(usersRef, limit(30));
      const snap = await getDocs(q);
      
      const userList = await Promise.all(snap.docs.map(async (doc) => {
        const userData = { id: doc.id, ...doc.data() } as UserProfile;
        let isFollowing = false;
        if (auth.currentUser && auth.currentUser.uid !== doc.id) {
          isFollowing = await checkIsFollowing(auth.currentUser.uid, doc.id);
        }
        return { ...userData, isFollowing };
      }));

      // Filter out self
      setUsers(userList.filter(u => u.id !== auth.currentUser?.uid));
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleFollow = async (targetUserId: string, currentlyFollowing: boolean) => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }

    try {
      if (currentlyFollowing) {
        await unfollowUser(targetUserId);
      } else {
        await followUser(targetUserId);
      }
      
      setUsers(prev => prev.map(u => 
        u.id === targetUserId ? { ...u, isFollowing: !currentlyFollowing } : u
      ));
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pt-4 pb-10">
      
      <div className="p-4">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
          <input 
            type="text"
            placeholder="Procurar por nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/10 border-none rounded-[3px] py-2 pl-9 pr-4 text-xs focus:outline-none transition-all font-medium placeholder:text-white/20"
          />
        </div>

        {loading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="animate-spin text-white" size={24} />
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <motion.div 
                key={user.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between glossy-black p-3 rounded-2xl border border-white/5"
              >
                <div 
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  onClick={() => navigate(`/public-profile/${user.id}`)}
                >
                  <img 
                    src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                    className="w-12 h-12 rounded-full border border-white/10"
                    alt={user.displayName || 'User'}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">{user.displayName || 'Utilizador'}</span>
                    <span className="text-xs text-white/40">@{user.email?.split('@')[0]}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleFollow(user.id, user.isFollowing)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[0.7rem] font-black uppercase tracking-widest transition-all
                    ${user.isFollowing 
                      ? 'bg-white/10 text-white/60 border border-white/5' 
                      : 'bg-white text-black shadow-[0_4px_10px_rgba(0,0,0,0.5)]'}
                  `}
                >
                  {user.isFollowing ? (
                    <><UserCheck size={14} /> Seguindo</>
                  ) : (
                    <><UserPlus size={14} /> Seguir</>
                  )}
                </button>
              </motion.div>
            ))}
            
            {filteredUsers.length === 0 && !loading && (
              <div className="text-center py-20 text-white/40">
                <Search size={40} className="mx-auto mb-4 opacity-20" />
                <p className="text-sm">Nenhum utilizador encontrado.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscoverUsers;
