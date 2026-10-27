import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// SUBSTITUI com as credenciais reais do teu projeto no Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCKLTSSgWWishfRf34y-GonGtg1CmjOMAY",
  authDomain: "cad-2023140288.firebaseapp.com",
  databaseURL: "https://cad-2023140288-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cad-2023140288",
  storageBucket: "cad-2023140288.firebasestorage.app",
  messagingSenderId: "298353350154",
  appId: "1:298353350154:web:648575a9b6e7cd577c71f3"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);