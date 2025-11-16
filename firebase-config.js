// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCmMtq0VdxJWhNwg08U8Gk5vOD9ehIHsbY",
  authDomain: "qkchic-store.firebaseapp.com",
  projectId: "qkchic-store",
  storageBucket: "qkchic-store.firebasestorage.app",
  messagingSenderId: "101926603991",
  appId: "1:101926603991:web:942eafc677867021da7492",
  measurementId: "G-0EG0JW7N6R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const storage = getStorage(app);
const db = getFirestore(app);

export { app, analytics, auth, storage, db };
