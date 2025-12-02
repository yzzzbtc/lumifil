// Firebase Configuration for LUMIFIL
const firebaseConfig = {
    apiKey: "AIzaSyBB7fkNOC3eTZt40f-Imf_QE58w4HYtaw4",
    authDomain: "lumifil-6cb32.firebaseapp.com",
    databaseURL: "https://lumifil-6cb32-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "lumifil-6cb32",
    storageBucket: "lumifil-6cb32.firebasestorage.app",
    messagingSenderId: "420555154440",
    appId: "1:420555154440:web:f0592152b783bb26dd1dbd"
};

// Sprawdź czy Firebase jest skonfigurowany
const isFirebaseConfigured = () => {
    return firebaseConfig.apiKey && firebaseConfig.apiKey !== "UZUPELNIJ_API_KEY";
};
