// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDR0VntS4qShJCCYqFfcZWfszom0nxWHqk",
    authDomain: "studybuddy011-b3399.firebaseapp.com",
    projectId: "studybuddy011-b3399",
    storageBucket: "studybuddy011-b3399.firebasestorage.app",
    messagingSenderId: "78933709906",
    appId: "1:78933709906:web:42d0050acaef4699233b8b"
};

// Store config globally
window.firebaseConfig = firebaseConfig;

// Initialize Firebase if not already initialized
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    
    // Initialize services and make globally available
    window.auth = firebase.auth();
    window.db = firebase.firestore();
    
    // Enable offline persistence
    window.db.enablePersistence()
        .catch((err) => {
            if (err.code == 'failed-precondition') {
                console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
            } else if (err.code == 'unimplemented') {
                console.log('The current browser does not support persistence.');
            }
        });
    
    console.log('✅ Firebase initialized successfully!');
}