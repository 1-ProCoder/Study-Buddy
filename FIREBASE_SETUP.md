# Firebase Setup Guide for Study Buddy

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Enter project name: "Study Buddy"
4. Follow the setup wizard
5. Enable Google Analytics (optional)

## Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click "Get Started"
3. Enable **Email/Password** authentication
4. Save

## Step 3: Create Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click "Create Database"
3. Start in **Production mode** (we'll set up rules)
4. Choose a location (closest to your users)
5. Click "Enable"

## Step 4: Set Up Security Rules

1. In Firestore Database, go to **Rules** tab
2. Replace with these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can only read/write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Everyone can read leaderboards, authenticated users can write
    match /leaderboards/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.resource.data.keys().hasAll(['username', 'studyTime', 'totalXP']);
    }
    
    // Study group members can read/write group data
    match /studyGroups/{groupId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
      
      match /members/{memberId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null;
      }
      
      match /sharedFlashcards/{flashcardId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null;
      }
      
      match /sharedNotes/{noteId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null;
      }
    }
    
    // Achievements - users can read/write their own
    match /achievements/{userId}/{achievementId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click "Publish"

## Step 5: Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click the web icon (`</>`)
4. Register app with nickname "Study Buddy Web"
5. Copy the Firebase configuration object

## Step 6: Update Configuration in Code

1. Open `js/modules/firebaseConfig.js`
2. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

## Step 7: Test the Integration

1. Open the Study Buddy website
2. Try signing up with a new account
3. Check Firebase Console → Authentication to see the new user
4. Check Firestore Database to see user data being created
5. Complete a study session and check leaderboard updates

## Data Migration

If you have existing users with localStorage data:

1. The app will automatically detect Firebase configuration
2. On first Firebase login, existing data can be migrated
3. Users will need to sign up again with Firebase (or you can create a migration script)

## Troubleshooting

### "Firebase not initialized" errors
- Check that Firebase SDK scripts are loaded before your app scripts
- Verify Firebase config values are correct
- Check browser console for detailed error messages

### Authentication errors
- Ensure Email/Password auth is enabled in Firebase Console
- Check that security rules allow the operations you're trying to perform

### Firestore permission errors
- Review security rules in Firebase Console
- Ensure user is authenticated before accessing Firestore
- Check that document paths match your rules

### Network errors
- Firebase requires internet connection
- Offline persistence is enabled but initial load needs connection
- Check Firebase status page if issues persist

## Features Enabled

✅ **Firebase Authentication** - Email/Password login
✅ **Firestore Database** - All user data storage
✅ **Real-time Updates** - Leaderboards and study groups sync in real-time
✅ **Offline Support** - Data persists locally when offline
✅ **Cross-device Sync** - Login on any device to access your data

## Next Steps

1. Set up Firebase Hosting (optional) for deployment
2. Configure custom domain (optional)
3. Set up Firebase Analytics (optional) for usage tracking
4. Configure backup and recovery strategies

