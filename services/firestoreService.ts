// services/firestoreService.ts

import firestore from '@react-native-firebase/firestore';
import { Farmer, Post } from '../types';

// Fetch Farmers
export const fetchFarmers = async (): Promise<Farmer[]> => {
  const querySnapshot = await firestore().collection('farmers').get();
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Farmer[];
};

// Fetch Posts
export const fetchPosts = async (): Promise<Post[]> => {
  const querySnapshot = await firestore().collection('posts').orderBy('createdAt', 'desc').get();
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Post[];
};
