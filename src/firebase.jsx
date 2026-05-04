import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCNysQsGtuYYS__jfhweKFmdiHt7hrvckk",
  authDomain: "almacen---colaborativo.firebaseapp.com",
  projectId: "almacen---colaborativo",
  storageBucket: "almacen---colaborativo.firebasestorage.app",
  messagingSenderId: "806849569554",
  appId: "1:806849569554:web:66b268f4ff0ef08abf89cb"
};

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);

// Exportamos las herramientas para usarlas en toda la APP
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();