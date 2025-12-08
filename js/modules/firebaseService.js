// Firebase Service - Main Firebase integration module
class FirebaseService {
    constructor() {
        this.auth = null;
        this.db = null;
        this.initialized = false;
        this.authStateListeners = [];
    }

    async initialize() {
        if (this.initialized) return;

        try {
            // Use global Firebase instances if available (from firebaseConfig.js)
            if (typeof window.auth !== 'undefined' && typeof window.db !== 'undefined') {
                this.auth = window.auth;
                this.db = window.db;
                console.log('Using global Firebase instances');
            } else if (typeof firebase !== 'undefined') {
                // Fallback: Initialize if not already done
                if (!firebase.apps.length && window.firebaseConfig) {
                    firebase.initializeApp(window.firebaseConfig);
                }
                this.auth = firebase.auth();
                this.db = firebase.firestore();
                
                // Enable offline persistence (with better error handling)
                try {
                    // Note: enablePersistence() is deprecated but still works
                    // The new API (persistentLocalCache) requires different initialization
                    // For now, we'll use enablePersistence with better error handling
                    await this.db.enablePersistence({
                        synchronizeTabs: true
                    }).catch((err) => {
                        // Handle persistence errors gracefully - app still works without it
                        if (err.code === 'failed-precondition') {
                            console.warn('Firebase persistence: Multiple tabs open, persistence disabled');
                        } else if (err.code === 'unimplemented') {
                            console.warn('Firebase persistence: Not supported in this browser');
                        } else {
                            console.warn('Firebase persistence: Could not enable (non-critical):', err.message);
                        }
                        // Don't throw - app works fine without persistence
                    });
                } catch (err) {
                    // Catch any unexpected errors
                    console.warn('Firebase persistence setup error (non-critical):', err.message);
                }
            } else {
                throw new Error('Firebase SDK not loaded');
            }

            // Set up auth state listener
            this.auth.onAuthStateChanged((user) => {
                this.authStateListeners.forEach(listener => listener(user));
            });

            this.initialized = true;
            console.log('FirebaseService initialized successfully');
        } catch (error) {
            console.error('Firebase initialization error:', error);
            throw error;
        }
    }

    // Auth Methods
    async signUp(username, password, displayName, avatar = '🎓') {
        await this.initialize();
        
        // Validate inputs
        const trimmedUsername = username.trim();
        if (!trimmedUsername || trimmedUsername.length < 3) {
            return { success: false, message: 'Username must be at least 3 characters long' };
        }
        if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
            return { success: false, message: 'Username can only contain letters, numbers, and underscores' };
        }
        if (!password || password.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters long' };
        }
        
        const email = `${trimmedUsername}@studybuddy.app`;
        
        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const userId = userCredential.user.uid;

            // Create user profile in Firestore
            try {
                await this.db.collection('users').doc(userId).set({
                    username: trimmedUsername,
                    displayName: displayName || trimmedUsername,
                    avatar: avatar,
                    joinedDate: firebase.firestore.FieldValue.serverTimestamp(),
                    lastActive: firebase.firestore.FieldValue.serverTimestamp(),
                    totalXP: 0,
                    studyTime: 0,
                    studyStreak: 0,
                    studySessions: 0,
                    flashcardsCompleted: 0
                });

                // Initialize leaderboard entry
                try {
                    await this.updateLeaderboard(userId, {
                        username: trimmedUsername,
                        avatar: avatar,
                        studyTime: 0,
                        studyStreak: 0,
                        studySessions: 0,
                        flashcardsCompleted: 0,
                        totalXP: 0
                    });
                } catch (leaderboardError) {
                    console.warn('Could not initialize leaderboard entry:', leaderboardError);
                    // Non-critical, continue
                }
            } catch (firestoreError) {
                console.error('Error creating user profile:', firestoreError);
                // User is created but profile failed - still return success but log error
                // The user can still use the app
            }

            return { success: true, userId: userId, user: userCredential.user };
        } catch (error) {
            console.error('Sign up error:', error);
            return { success: false, message: this.getUserFriendlyErrorMessage(error) };
        }
    }

    async login(username, password) {
        await this.initialize();
        
        // Validate inputs
        if (!username || !username.trim()) {
            return { success: false, message: 'Please enter your username' };
        }
        if (!password || !password.trim()) {
            return { success: false, message: 'Please enter your password' };
        }
        
        const email = `${username.trim()}@studybuddy.app`;
        
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            
            // Update last active
            try {
                await this.db.collection('users').doc(userCredential.user.uid).update({
                    lastActive: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (updateError) {
                console.warn('Could not update last active:', updateError);
                // Non-critical error, continue with login
            }

            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: this.getUserFriendlyErrorMessage(error) };
        }
    }

    async logout() {
        await this.initialize();
        try {
            await this.auth.signOut();
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, message: this.getErrorMessage(error) };
        }
    }

    async sendPasswordResetEmail(username) {
        await this.initialize();
        const email = `${username}@studybuddy.app`;
        try {
            await this.auth.sendPasswordResetEmail(email);
            return { success: true };
        } catch (error) {
            return { success: false, message: this.getErrorMessage(error) };
        }
    }

    getCurrentUser() {
        return this.auth?.currentUser;
    }

    onAuthStateChanged(callback) {
        this.authStateListeners.push(callback);
        if (this.auth) {
            this.auth.onAuthStateChanged(callback);
        }
    }

    // Helper method for retrying Firestore operations
    async retryOperation(operation, maxRetries = 3, delay = 1000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                const isLastAttempt = i === maxRetries - 1;
                const isRetryable = error.code === 'unavailable' || 
                                   error.code === 'deadline-exceeded' ||
                                   error.message?.includes('network') ||
                                   error.message?.includes('fetch');
                
                if (isLastAttempt || !isRetryable) {
                    throw error;
                }
                
                console.warn(`Retry attempt ${i + 1}/${maxRetries} after ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            }
        }
    }

    // Firestore Methods - User Data
    async getUserData(userId) {
        await this.initialize();
        try {
            const doc = await this.retryOperation(() => 
                this.db.collection('users').doc(userId).get()
            );
            if (doc.exists) {
                return { success: true, data: doc.data() };
            }
            return { success: false, message: 'User not found' };
        } catch (error) {
            console.error('Get user data error:', error);
            return { success: false, message: this.getUserFriendlyErrorMessage(error) };
        }
    }

    async updateUserData(userId, data) {
        await this.initialize();
        try {
            await this.retryOperation(() => 
                this.db.collection('users').doc(userId).update({
                    ...data,
                    lastActive: firebase.firestore.FieldValue.serverTimestamp()
                })
            );
            return { success: true };
        } catch (error) {
            console.error('Update user data error:', error);
            return { success: false, message: this.getUserFriendlyErrorMessage(error) };
        }
    }

    // Flashcards
    async getFlashcards(userId) {
        await this.initialize();
        try {
            const snapshot = await this.retryOperation(() => 
                this.db.collection('users').doc(userId)
                    .collection('flashcards').get()
            );
            return {
                success: true,
                data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            };
        } catch (error) {
            console.error('Get flashcards error:', error);
            return { success: false, message: this.getUserFriendlyErrorMessage(error), data: [] };
        }
    }

    async saveFlashcard(userId, flashcard) {
        await this.initialize();
        try {
            // Ensure we always use a string document ID for Firestore
            let docId = flashcard.id;
            if (docId != null && typeof docId !== 'string') {
                docId = String(docId);
            }

            if (docId) {
                await this.retryOperation(() => 
                    this.db.collection('users').doc(userId)
                        .collection('flashcards').doc(docId).set({ ...flashcard, id: docId }, { merge: true })
                );
            } else {
                await this.retryOperation(() => 
                    this.db.collection('users').doc(userId)
                        .collection('flashcards').add(flashcard)
                );
            }
            return { success: true };
        } catch (error) {
            console.error('Save flashcard error:', error);
            return { success: false, message: this.getUserFriendlyErrorMessage(error) };
        }
    }

    async deleteFlashcard(userId, flashcardId) {
        await this.initialize();
        try {
            await this.db.collection('users').doc(userId)
                .collection('flashcards').doc(flashcardId).delete();
            return { success: true };
        } catch (error) {
            console.error('Delete flashcard error:', error);
            return { success: false, message: this.getErrorMessage(error) };
        }
    }

    // Leaderboard
    async updateLeaderboard(userId, stats) {
        await this.initialize();
        try {
            await this.retryOperation(() => 
                this.db.collection('leaderboards').doc('global').set({
                    [userId]: {
                        ...stats,
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    }
                }, { merge: true })
            );
            return { success: true };
        } catch (error) {
            console.error('Update leaderboard error:', error);
            // Leaderboard updates are non-critical, log but don't fail
            return { success: false, message: this.getUserFriendlyErrorMessage(error) };
        }
    }

    async getLeaderboard() {
        await this.initialize();
        try {
            const doc = await this.db.collection('leaderboards').doc('global').get();
            if (doc.exists) {
                const data = doc.data();
                // Convert object to array
                const users = Object.keys(data).map(userId => ({
                    userId: userId,
                    ...data[userId]
                }));
                return { success: true, data: users };
            }
            return { success: true, data: [] };
        } catch (error) {
            console.error('Get leaderboard error:', error);
            return { success: false, message: this.getErrorMessage(error) };
        }
    }

    onLeaderboardUpdate(callback) {
        this.initialize().then(() => {
            this.db.collection('leaderboards').doc('global')
                .onSnapshot((snapshot) => {
                    if (snapshot.exists) {  // For DocumentSnapshot, use exists without ()
                        const data = snapshot.data();
                        const users = Object.keys(data || {}).map(userId => ({
                            userId: userId,
                            ...data[userId]
                        }));
                        callback(users);
                    } else {
                        callback([]);
                    }
                }, (error) => {
                    console.error('Leaderboard listener error:', error);
                    callback([]);
                });
        });
    }

    // Study Groups
    async createStudyGroup(groupName, subject, description, createdBy) {
        await this.initialize();
        try {
            const groupCode = this.generateGroupCode();
            const groupRef = this.db.collection('studyGroups').doc();
            const groupId = groupRef.id;

            await groupRef.set({
                groupName: groupName,
                subject: subject,
                description: description,
                groupCode: groupCode,
                createdBy: createdBy,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Add creator as member
            await groupRef.collection('members').doc(createdBy).set({
                username: (await this.getUserData(createdBy)).data.displayName,
                joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                role: 'admin'
            });

            return { success: true, groupId: groupId, groupCode: groupCode };
        } catch (error) {
            console.error('Create study group error:', error);
            return { success: false, message: this.getErrorMessage(error) };
        }
    }

    async joinStudyGroup(groupCode, userId) {
        await this.initialize();
        try {
            // Find group by code
            const groupsSnapshot = await this.db.collection('studyGroups')
                .where('groupCode', '==', groupCode).get();

            if (groupsSnapshot.empty) {
                return { success: false, message: 'Group not found' };
            }

            const groupDoc = groupsSnapshot.docs[0];
            const groupId = groupDoc.id;

            // Check if already a member
            const memberDoc = await groupDoc.ref.collection('members').doc(userId).get();
            if (memberDoc.exists) {
                return { success: false, message: 'Already a member' };
            }

            // Add as member
            const userData = await this.getUserData(userId);
            await groupDoc.ref.collection('members').doc(userId).set({
                username: userData.data.displayName,
                joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                role: 'member'
            });

            return { success: true, groupId: groupId };
        } catch (error) {
            console.error('Join study group error:', error);
            return { success: false, message: this.getErrorMessage(error) };
        }
    }

    async leaveStudyGroup(groupId, userId) {
        await this.initialize();
        try {
            const groupRef = this.db.collection('studyGroups').doc(groupId);
            await groupRef.collection('members').doc(userId).delete();
            return { success: true };
        } catch (error) {
            console.error('Leave study group error:', error);
            return { success: false, message: this.getErrorMessage(error) };
        }
    }

    async deleteStudyGroup(groupId) {
        await this.initialize();
        try {
            const groupRef = this.db.collection('studyGroups').doc(groupId);

            // Delete members
            const membersSnap = await groupRef.collection('members').get();
            const batch = this.db.batch();
            membersSnap.forEach(doc => batch.delete(doc.ref));

            // Delete shared flashcards
            const flashcardsSnap = await groupRef.collection('sharedFlashcards').get();
            flashcardsSnap.forEach(doc => batch.delete(doc.ref));

            // Delete chat messages
            const messagesSnap = await groupRef.collection('messages').get();
            messagesSnap.forEach(doc => batch.delete(doc.ref));

            await batch.commit();
            await groupRef.delete();

            return { success: true };
        } catch (error) {
            console.error('Delete study group error:', error);
            return { success: false, message: this.getErrorMessage(error) };
        }
    }

    async getStudyGroups(userId) {
        await this.initialize();
        try {
            // Get all groups and filter by membership
            const groupsSnapshot = await this.db.collection('studyGroups').get();

            const groups = [];
            for (const doc of groupsSnapshot.docs) {
                const groupData = doc.data();
                
                // Check if user is a member
                const memberDoc = await doc.ref.collection('members').doc(userId).get();
                if (memberDoc.exists) {
                    // Get all members
                    const membersSnapshot = await doc.ref.collection('members').get();
                    const members = membersSnapshot.docs.map(m => ({
                        userId: m.id,
                        ...m.data()
                    }));

                    groups.push({
                        id: doc.id,
                        name: groupData.groupName,
                        subject: groupData.subject,
                        description: groupData.description,
                        code: groupData.groupCode,
                        createdBy: groupData.createdBy,
                        createdAt: groupData.createdAt,
                        members: members
                    });
                }
            }

            return { success: true, data: groups };
        } catch (error) {
            console.error('Get study groups error:', error);
            return { success: false, message: this.getErrorMessage(error) };
        }
    }

    async shareFlashcardToGroup(groupId, flashcard, sharedBy) {
        await this.initialize();
        try {
            await this.db.collection('studyGroups').doc(groupId)
                .collection('sharedFlashcards').add({
                    question: flashcard.front || flashcard.question,
                    answer: flashcard.back || flashcard.answer,
                    subject: flashcard.subject || '',
                    sharedBy: sharedBy,
                    sharedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            return { success: true };
        } catch (error) {
            console.error('Share flashcard error:', error);
            return { success: false, message: this.getErrorMessage(error) };
        }
    }

    async getSharedFlashcards(groupId) {
        await this.initialize();
        try {
            const snapshot = await this.db.collection('studyGroups').doc(groupId)
                .collection('sharedFlashcards')
                .orderBy('sharedAt', 'desc')
                .limit(50)
                .get();
            
            return {
                success: true,
                data: snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
            };
        } catch (error) {
            console.error('Get shared flashcards error:', error);
            return { success: false, message: this.getErrorMessage(error) };
        }
    }

    onStudyGroupUpdate(groupId, callback) {
        this.initialize().then(() => {
            this.db.collection('studyGroups').doc(groupId)
                .collection('sharedFlashcards')
                .orderBy('sharedAt', 'desc')
                .limit(50)
                .onSnapshot((snapshot) => {
                    const flashcards = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    callback(flashcards);
                }, (error) => {
                    console.error('Study group listener error:', error);
                });
        });
    }

    onGroupMessagesUpdate(groupId, callback) {
        this.initialize().then(() => {
            this.db.collection('studyGroups').doc(groupId)
                .collection('messages')
                .orderBy('sentAt', 'asc')
                .limit(100)
                .onSnapshot((snapshot) => {
                    const messages = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        sentAt: doc.data().sentAt?.toDate ? doc.data().sentAt.toDate().toISOString() : (doc.data().sentAt || new Date().toISOString())
                    }));
                    callback(messages);
                }, (error) => {
                    console.error('Group messages listener error:', error);
                });
        });
    }

    // Study Group Chat Messages
    async addGroupMessage(groupId, message) {
        await this.initialize();
        try {
            await this.db.collection('studyGroups').doc(groupId)
                .collection('messages').add({
                    text: message.text,
                    senderId: message.senderId,
                    senderName: message.senderName,
                    sentAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            return { success: true };
        } catch (error) {
            console.error('Add group message error:', error);
            return { success: false, message: this.getErrorMessage(error) };
        }
    }

    async getGroupMessages(groupId, limit = 50) {
        await this.initialize();
        try {
            const snapshot = await this.db.collection('studyGroups').doc(groupId)
                .collection('messages')
                .orderBy('sentAt', 'asc')
                .limit(limit)
                .get();
            const messages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                sentAt: doc.data().sentAt?.toDate ? doc.data().sentAt.toDate().toISOString() : (doc.data().sentAt || new Date().toISOString())
            }));
            return { success: true, data: messages };
        } catch (error) {
            console.error('Get group messages error:', error);
            return { success: false, message: this.getErrorMessage(error), data: [] };
        }
    }

    // Get all notes for a user
    async getNotes(userId) {
        await this.initialize();
        try {
            const notesSnapshot = await this.db.collection('users').doc(userId).collection('notes').get();
            const notes = notesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return { success: true, data: notes };
        } catch (error) {
            console.error('Error fetching notes:', error);
            return { success: false, message: this.getErrorMessage(error), data: [] };
        }
    }

    // Get timetable for a user
    async getTimetable(userId) {
        await this.initialize();
        try {
            const timetableDoc = await this.retryOperation(() => 
                this.db.collection('users').doc(userId).collection('timetable').doc('schedule').get()
            );
            if (timetableDoc.exists) {
                return { success: true, data: timetableDoc.data() };
            }
            return { success: true, data: null };
        } catch (error) {
            console.error('Error fetching timetable:', error);
            return { success: false, message: this.getUserFriendlyErrorMessage(error), data: null };
        }
    }

    // Save full timetable schedule used by FirebaseStore
    async saveTimetable(userId, timetable) {
        await this.initialize();
        try {
            await this.retryOperation(() =>
                this.db.collection('users').doc(userId)
                    .collection('timetable').doc('schedule').set(timetable, { merge: true })
            );
            return { success: true };
        } catch (error) {
            console.error('Save timetable error:', error);
            return { success: false, message: this.getUserFriendlyErrorMessage(error) };
        }
    }

    // Get vision board items
    async getVisionBoard(userId) {
        await this.initialize();
        try {
            const visionDoc = await this.retryOperation(() => 
                this.db.collection('users').doc(userId)
                    .collection('visionBoard').doc('items').get()
            );
            if (visionDoc.exists) {
                return { success: true, data: visionDoc.data().items || [] };
            }
            return { success: true, data: [] };
        } catch (error) {
            console.error('Error fetching vision board:', error);
            return { success: false, message: this.getUserFriendlyErrorMessage(error), data: [] };
        }
    }

    // Save vision board
    async saveVisionBoard(userId, items) {
        await this.initialize();
        try {
            await this.retryOperation(() => 
                this.db.collection('users').doc(userId)
                    .collection('visionBoard').doc('items').set({ items }, { merge: true })
            );
            return { success: true };
        } catch (error) {
            console.error('Save vision board error:', error);
            return { success: false, message: this.getUserFriendlyErrorMessage(error) };
        }
    }

    // Get papers/past exams
    async getPapers(userId) {
        await this.initialize();
        try {
            const papersSnapshot = await this.retryOperation(() => 
                this.db.collection('users').doc(userId)
                    .collection('papers').get()
            );
            const papers = papersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return { success: true, data: papers };
        } catch (error) {
            console.error('Error fetching papers:', error);
            return { success: false, message: this.getUserFriendlyErrorMessage(error), data: [] };
        }
    }

    // Get user stats
    async getUserStats(userId) {
        await this.initialize();
        try {
            const statsDoc = await this.db.collection('users').doc(userId).collection('stats').doc('summary').get();
            if (statsDoc.exists) {
                return { success: true, data: statsDoc.data() };
            }
            return {
                success: true,
                data: {
                    studyTime: 0,
                    studyStreak: 0,
                    studySessions: 0,
                    flashcardsCompleted: 0,
                    totalXP: 0
                }
            };
        } catch (error) {
            console.error('Error fetching user stats:', error);
            return { success: false, message: this.getErrorMessage(error), data: null };
        }
    }

    // Get sessions for a user
    async getSessions(userId) {
        await this.initialize();
        try {
            const sessionsSnapshot = await this.db.collection('users').doc(userId)
                .collection('sessions').orderBy('timestamp', 'desc').limit(500).get();
            const sessions = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return { success: true, data: sessions };
        } catch (error) {
            console.error('Error fetching sessions:', error);
            return { success: false, message: this.getErrorMessage(error), data: [] };
        }
    }

    // Get achievements for a user
    async getAchievements(userId) {
        await this.initialize();
        try {
            const achievementsSnapshot = await this.db.collection('achievements').doc(userId).collection('unlocked').get();
            const achievements = achievementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return { success: true, data: achievements };
        } catch (error) {
            console.error('Error fetching achievements:', error);
            return { success: false, message: this.getErrorMessage(error), data: [] };
        }
    }

    // Get countdowns for a user
    async getCountdowns(userId) {
        await this.initialize();
        try {
            const countdownsSnapshot = await this.db.collection('users').doc(userId).collection('countdowns').get();
            const countdowns = countdownsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return { success: true, data: countdowns };
        } catch (error) {
            console.error('Error fetching countdowns:', error);
            return { success: false, message: this.getErrorMessage(error), data: [] };
        }
    }

    // Save note
    async saveNote(userId, note) {
        await this.initialize();
        try {
            if (note.id) {
                await this.db.collection('users').doc(userId)
                    .collection('notes').doc(note.id).set(note, { merge: true });
            } else {
                await this.db.collection('users').doc(userId)
                    .collection('notes').add(note);
            }
            return { success: true };
        } catch (error) {
            console.error('Save note error:', error);
            return { success: false, message: this.getErrorMessage(error) };
        }
    }

    // Save timetable entry
    async saveTimetableEntry(userId, entry) {
        await this.initialize();
        try {
            if (entry.id) {
                await this.db.collection('users').doc(userId)
                    .collection('timetable').doc(entry.id).set(entry, { merge: true });
            } else {
                await this.db.collection('users').doc(userId)
                    .collection('timetable').add(entry);
            }
            return { success: true };
        } catch (error) {
            console.error('Save timetable error:', error);
            return { success: false, message: this.getErrorMessage(error) };
        }
    }

    // Save countdown
    async saveCountdown(userId, countdown) {
        await this.initialize();
        try {
            if (countdown.id) {
                await this.db.collection('users').doc(userId)
                    .collection('countdowns').doc(countdown.id).set(countdown, { merge: true });
            } else {
                await this.db.collection('users').doc(userId)
                    .collection('countdowns').add(countdown);
            }
            return { success: true };
        } catch (error) {
            console.error('Save countdown error:', error);
            return { success: false, message: this.getErrorMessage(error) };
        }
    }

    // Get user settings
    async getSettings(userId) {
        await this.initialize();
        try {
            const settingsDoc = await this.db.collection('users').doc(userId).collection('settings').doc('preferences').get();
            if (settingsDoc.exists) {
                return { success: true, data: settingsDoc.data() };
            }
            // Return default settings
            return {
                success: true,
                data: {
                    darkMode: true,
                    notifications: true,
                    soundEnabled: true,
                    language: 'en'
                }
            };
        } catch (error) {
            console.error('Error fetching settings:', error);
            return { success: false, message: this.getErrorMessage(error), data: {} };
        }
    }

    // Save user settings
    async saveSettings(userId, settings) {
        await this.initialize();
        try {
            await this.db.collection('users').doc(userId)
                .collection('settings').doc('preferences').set(settings, { merge: true });
            return { success: true };
        } catch (error) {
            console.error('Save settings error:', error);
            return { success: false, message: this.getErrorMessage(error) };
        }
    }

    // Helper Methods
    generateGroupCode() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }

    getErrorMessage(error) {
        const errorMessages = {
            'auth/email-already-in-use': 'Username already exists',
            'auth/invalid-email': 'Invalid username',
            'auth/weak-password': 'Password is too weak',
            'auth/user-not-found': 'User not found',
            'auth/wrong-password': 'Incorrect password',
            'auth/network-request-failed': 'Network error. Please check your connection',
            'permission-denied': 'Permission denied',
            'unavailable': 'Service temporarily unavailable'
        };
        return errorMessages[error.code] || error.message || 'An error occurred';
    }

    getUserFriendlyErrorMessage(error) {
        const errorMessages = {
            'auth/email-already-in-use': 'This username is already taken. Please choose a different one.',
            'auth/invalid-email': 'Invalid username format. Username must be at least 3 characters.',
            'auth/weak-password': 'Password is too weak. Please use at least 6 characters.',
            'auth/user-not-found': 'No account found with this username. Please sign up first.',
            'auth/wrong-password': 'Incorrect password. Please try again.',
            'auth/invalid-credential': 'Invalid username or password. Please check your credentials.',
            'auth/invalid-login-credentials': 'Invalid username or password. If you don\'t have an account, please sign up first.',
            'auth/network-request-failed': 'Network error. Please check your internet connection and try again.',
            'auth/too-many-requests': 'Too many failed login attempts. Please try again later.',
            'permission-denied': 'Permission denied. Please contact support if this persists.',
            'unavailable': 'Service temporarily unavailable. Please try again in a moment.',
            'auth/operation-not-allowed': 'This operation is not allowed. Please contact support.'
        };
        
        // Check for specific error codes
        if (error.code && errorMessages[error.code]) {
            return errorMessages[error.code];
        }
        
        // Check error message for common patterns
        const errorMessage = error.message || '';
        if (errorMessage.includes('user-not-found') || errorMessage.includes('invalid-credential')) {
            return 'No account found with this username. Please sign up first.';
        }
        if (errorMessage.includes('wrong-password') || errorMessage.includes('invalid-password')) {
            return 'Incorrect password. Please try again.';
        }
        if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            return 'Network error. Please check your internet connection and try again.';
        }
        
        // Default user-friendly message
        return 'An error occurred. Please try again. If the problem persists, contact support.';
    }
}

// Export singleton instance
window.firebaseService = new FirebaseService();

