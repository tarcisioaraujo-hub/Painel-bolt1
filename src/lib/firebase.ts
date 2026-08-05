import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDyuEJbyccdWVSsHjxn03Yoj7KdJQKF8dU',
  authDomain: 'teste-lovable-5e0a1.firebaseapp.com',
  projectId: 'teste-lovable-5e0a1',
  storageBucket: 'teste-lovable-5e0a1.firebasestorage.app',
  messagingSenderId: '208861618667',
  appId: '1:208861618667:web:61be2154f1442e0646f9ae',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
