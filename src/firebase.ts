import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCdlkSLfEi3xYIDxaQ1f9xjYbccMFqjiMk",
  authDomain: "zion-manager.firebaseapp.com",
  projectId: "zion-manager",
  storageBucket: "zion-manager.firebasestorage.app",
  messagingSenderId: "1048507266169",
  appId: "1:1048507266169:web:1ec848281a016b303cd0a8",
  measurementId: "G-Y16QGRLZ9F",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
