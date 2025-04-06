import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  update,
  push,
  onValue
} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCi5n-L_ogUif2Bsq7l8qfU9Yoq9h7J6VE",
    authDomain: "cryptonix-67333.firebaseapp.com",
    databaseURL: "https://cryptonix-67333-default-rtdb.firebaseio.com",
    projectId: "cryptonix-67333",
    storageBucket: "cryptonix-67333.firebasestorage.app",
    messagingSenderId: "701360318410",
    appId: "1:701360318410:web:050c6ced8857cc0d2b5133",
    measurementId: "G-Y131E5B1QF"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export { 
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  ref,
  set,
  get,
  update,
  push,
  onValue
};