// src/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// ✅ Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDuvvrq1Bgbi2WoQPykTU_mSK89J8VTh_4",
  authDomain: "mukupersonalchat.firebaseapp.com",
  databaseURL: "https://mukupersonalchat-default-rtdb.firebaseio.com",
  projectId: "mukupersonalchat",
  storageBucket: "mukupersonalchat.appspot.com", // ✅ fixed this line
  messagingSenderId: "693491661527",
  appId: "1:693491661527:web:ee963c1d7e18e3ea4a0e92",
  measurementId: "G-M3GQ9DV1VW"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Get instances
const database = getDatabase(app);
const storage = getStorage(app);
const messaging = getMessaging(app);

// ✅ Export everything needed
export { app, database, storage, messaging, getToken, onMessage };
