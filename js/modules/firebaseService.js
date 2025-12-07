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
                
                // Enable offline persistence
                try {
                    await this.db.enablePersistence({
                        synchronizeTabs: true
                    });
                } catch (err) {
                    if (err.code === 'failed-precondition') {
                        console.warn('Firebase persistence failed: Multiple tabs open');
                    } else if (err.code === 'unimplemented') {
                        console.warn('Firebase persistence not supported in this browser');
                    }
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
        const email = `${username}@studybuddy.app`;
        
        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const userId = userCredential.user.uid;

            // Create user profile in Firestore
            await this.db.collection('users').doc(userId).set({
                username: username,
                displayName: displayName || username,
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
            await this.updateLeaderboard(userId, {
                username: username,
                avatar: avatar,
                studyTime: 0,
                studyStreak: 0,
                studySessions: 0,
                flashcardsCompleted: 0,
                totalXP: 0
            });

            return { success: true, userId: userId, user: userCredential.user };
        } catch (error) {
            console.error('Sign up error:', error);
            return { success: false, message: this.getErrorMessage(error) };
        }
    }

    async login(username, password) {
        await this.initialize();
        const email = `${username}@studybuddy.app`;
        
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            
            // Update last active
            await this.db.collection('users').doc(userCredential.user.uid).update({
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            });

            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: this.getErrorMessage(error) };
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

    // Firestore Methods - User Data
    async getUserData(userId) {
        await this.initialize();
        try {
            const doc = await this.db.collection('users').doc(userId).get();
            if (doc.exists) {
                return { success: true, data: doc.data() };
            }
            return { success: false, message: 'User not found' };
        } catch (error) {
            console.error('Get user data error:', error);
            return { success: false, message: this.getErrorMessage(error) };
        }
    }

    async updateUserData(userId, data) {
        await this.initialize();
        try {
            await this.db.collection('users').doc(userId).update({
                ...data,
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            console.error('Update user data error:', error);
            return { success: false, message: this.getErrorMessage(error) };
        }
    }

    // Flashcards
    async getFlashcards(userId) {
        await this.initialize();
        try {
            const snapshot = await this.db.collection('users').doc(userId)
                .collection('flashcards').get();
            return {
                success: true,
                data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            };
        } catch (error) {
            console.error('Get flashcards error:', error);
            return { success: false, message: this.getErrorMessage(error) };
        }
    }

    async saveFlashcard(userId, flashcard) {
        await this.initialize();
        try {
            if (flashcard.id) {
                await this.db.collection('users').doc(userId)
                    .collection('flashcards').doc(flashcard.id).set(flashcard, { merge: true });
            } else {
                await this.db.collection('users').doc(userId)
                    .collection('flashcards').add(flashcard);
            }
            return { success: true };
        } catch (error) {
            console.error('Save flashcard error:', error);
            return { success: false, message: this.getErrorMessage(error) };
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
            await this.db.collection('leaderboards').doc('global').set({
                [userId]: {
                    ...stats,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                }
            }, { merge: true });
            return { success: true };
        } catch (error) {
            console.error('Update leaderboard error:', error);
            return { success: false, message: this.getErrorMessage(error) };
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
                    if (snapshot.exists()) {
                        const data = snapshot.data();
                        const users = Object.keys(data).map(userId => ({
                            userId: userId,
                            ...data[userId]
                        }));
                        callback(users);
                    } else {
                        callback([]);
                    }
                }, (error) => {
                    console.error('Leaderboard listener error:', error);
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
            const timetableSnapshot = await this.db.collection('users').doc(userId).collection('timetable').get();
            const timetable = timetableSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return { success: true, data: timetable };
        } catch (error) {
            console.error('Error fetching timetable:', error);
            return { success: false, message: this.getErrorMessage(error), data: [] };
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
}

// Export singleton instance
window.firebaseService = new FirebaseService();

