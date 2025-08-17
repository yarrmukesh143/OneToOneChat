// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";         // 👈 add auth if you need login
import { getDatabase } from "firebase/database"; // 👈 add database

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD2wpDhIBZbfm75K4JAyVWTGeZitdmZF8k",
  authDomain: "mukupersonalchats.firebaseapp.com",
  databaseURL: "https://mukupersonalchats-default-rtdb.firebaseio.com", 
  projectId: "mukupersonalchats",
  storageBucket: "mukupersonalchats.appspot.com", // 👈 fix .app -> .appspot.com
  messagingSenderId: "1068270569503",
  appId: "1:1068270569503:web:ee1cbe98d29785184c2d2a",
  measurementId: "G-52LRV8VJSW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);            // 👈 optional if using login
const database = getDatabase(app);    // 👈 THIS is the missing part

export { auth, database, analytics };
