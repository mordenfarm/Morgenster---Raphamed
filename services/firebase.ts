
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

// IMPORTANT: This is a dummy configuration to allow the application to initialize
// without crashing. For the app to function correctly and connect to your database,
// you MUST replace these values with the actual configuration from your Firebase project.
// You can find this in: Project Settings > General > Your apps > Firebase SDK snippet (Config).

const firebaseConfig = {
  apiKey: "AIzaSyCIbnA6bF8Fm7i6EsQTdl-hHruJWQ-9i30",
  authDomain: "mh-raphamed.firebaseapp.com",
  projectId: "mh-raphamed",
  storageBucket: "mh-raphamed.firebasestorage.app",
  messagingSenderId: "398157602694",
  appId: "1:398157602694:web:0fe77b18c81d923cc15607"
};
// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();

// Configure Offline Persistence (IndexedDB)
// Using modern cache settings to avoid deprecation warnings for enableMultiTabIndexedDbPersistence
try {
  db.settings({
    localCache: firebase.firestore.persistentLocalCache({
      tabManager: firebase.firestore.persistentMultipleTabManager()
    })
  });
} catch (err: any) {
  if (err.code === 'failed-precondition') {
      console.warn('Persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
      console.warn('Persistence not supported by browser');
  } else {
      console.warn('Error enabling persistence:', err);
  }
}
