import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, increment, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { auth } from '../lib/firebase';
import { notificationService } from './notificationService';

export async function checkIsFollowing(followerId: string, followingId: string): Promise<boolean> {
  if (!followerId || !followingId) return false;
  
  try {
    const docId = `${followerId}_${followingId}`;
    const followDoc = await getDoc(doc(db, 'follows', docId));
    return followDoc.exists();
  } catch (error) {
    console.error('Error checking follow status:', error);
    return false;
  }
}

export async function followUser(followingId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('You must be logged in to follow users');
  
  const followerId = currentUser.uid;
  if (followerId === followingId) throw new Error('You cannot follow yourself');

  const docId = `${followerId}_${followingId}`;
  
  try {
    // 1. Save follow relationship in 'follows' table
    await setDoc(doc(db, 'follows', docId), {
      followerId,
      followingId,
      createdAt: serverTimestamp()
    });

    // 2. Increment followersCount on the 'users' table of the followed user
    const userRef = doc(db, 'users', followingId);
    await updateDoc(userRef, {
      followersCount: increment(1)
    });

    // 3. Increment followingCount on the 'users' table of the follower
    const followerRef = doc(db, 'users', followerId);
    await updateDoc(followerRef, {
      followingCount: increment(1)
    });

    // 4. Create notification
    await notificationService.createNotification({
      type: 'follow',
      toUserId: followingId,
      text: 'começou a seguir você'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `followers/${docId}`);
  }
}

export async function unfollowUser(followingId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('You must be logged in to unfollow users');
  
  const followerId = currentUser.uid;
  const docId = `${followerId}_${followingId}`;
  
  try {
    // 1. Remove from 'follows' table
    await deleteDoc(doc(db, 'follows', docId));

    // 2. Decrement followersCount on the 'users' table of the followed user
    const userRef = doc(db, 'users', followingId);
    await updateDoc(userRef, {
      followersCount: increment(-1)
    });

    // 3. Decrement followingCount on the 'users' table of the follower
    const followerRef = doc(db, 'users', followerId);
    await updateDoc(followerRef, {
      followingCount: increment(-1)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `follows/${docId}`);
  }
}
