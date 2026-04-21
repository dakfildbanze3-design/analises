import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp, 
  setDoc, 
  getDoc,
  query,
  where,
  limit,
  deleteDoc,
  collectionGroup,
  getDocs
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export type CallStatus = 'calling' | 'ringing' | 'accepted' | 'rejected' | 'ended';

export interface CallData {
  id: string;
  caller_id: string;
  receiver_id: string;
  status: CallStatus;
  type: 'video' | 'audio';
  created_at: any;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  caller_name?: string;
  receiver_name?: string;
  caller_avatar?: string;
  receiver_avatar?: string;
}

export const callService = {
  /**
   * Create a new call record
   */
  async createCall(receiverId: string, receiverName: string, receiverAvatar: string, type: 'video' | 'audio' = 'video') {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("User not authenticated");

    const callRef = collection(db, 'calls');
    const newCall = await addDoc(callRef, {
      caller_id: userId,
      receiver_id: receiverId,
      status: 'calling',
      type: type,
      created_at: serverTimestamp(),
      caller_name: auth.currentUser.displayName || 'Vendedor',
      caller_avatar: auth.currentUser.photoURL || '',
      receiver_name: receiverName,
      receiver_avatar: receiverAvatar
    });

    return newCall.id;
  },

  /**
   * Update call status
   */
  async updateCallStatus(callId: string, status: CallStatus) {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, { status });
  },

  /**
   * Signaling: Store SDP Offer
   */
  async setOffer(callId: string, offer: RTCSessionDescriptionInit) {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, { 
      offer: {
        type: offer.type,
        sdp: offer.sdp
      }
    });
  },

  /**
   * Signaling: Store SDP Answer
   */
  async setAnswer(callId: string, answer: RTCSessionDescriptionInit) {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, { 
      answer: {
        type: answer.type,
        sdp: answer.sdp
      }
    });
  },

  /**
   * Signaling: Add ICE Candidate
   */
  async addIceCandidate(callId: string, candidate: RTCIceCandidate, type: 'caller' | 'receiver') {
    const candidateRef = collection(db, 'calls', callId, type === 'caller' ? 'callerCandidates' : 'receiverCandidates');
    await addDoc(candidateRef, candidate.toJSON());
  },

  /**
   * Listen for incoming calls
   */
  subscribeToIncomingCalls(userId: string, callback: (call: CallData) => void) {
    const q = query(
      collection(db, 'calls'),
      where('receiver_id', '==', userId),
      where('status', 'in', ['calling', 'ringing']),
      limit(1)
    );

    return onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          callback({ id: change.doc.id, ...data } as CallData);
        }
      });
    });
  },

  /**
   * Listen to a specific call's changes
   */
  subscribeToCall(callId: string, callback: (call: CallData) => void) {
    return onSnapshot(doc(db, 'calls', callId), (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() } as CallData);
      }
    });
  },

  /**
   * Listen for ICE Candidates
   */
  subscribeToIceCandidates(callId: string, type: 'caller' | 'receiver', callback: (candidate: RTCIceCandidate) => void) {
    const q = collection(db, 'calls', callId, type === 'caller' ? 'callerCandidates' : 'receiverCandidates');
    return onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          callback(new RTCIceCandidate(change.doc.data()));
        }
      });
    });
  }
};
