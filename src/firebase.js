import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace with your actual Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyALw5FnmhK40sy5Y8xfeDS_wWJshyS4BM4",
  authDomain: "jubilacion-app.firebaseapp.com",
  projectId: "jubilacion-app",
  storageBucket: "jubilacion-app.firebasestorage.app",
  messagingSenderId: "520677822676",
  appId: "1:520677822676:web:e1bda9285baaa2dc5a6b41"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
