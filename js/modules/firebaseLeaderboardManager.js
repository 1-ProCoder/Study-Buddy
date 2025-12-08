// Firebase Leaderboard Manager - Replaces localStorage-based LeaderboardManager
class FirebaseLeaderboardManager {
    constructor(store, authManager) {
        this.store = store;
        this.authManager = authManager;
        this.firebaseService = window.firebaseService;
        this.leaderboardListener = null;
    }

    // Initialize user in leaderboard
    async initializeUser(userId, username, avatar) {
        const result = await this.firebaseService.updateLeaderboard(userId, {
            username: username,
            avatar: avatar || '🎓',
            studyTime: 0,
            studyStreak: 0,
            studySessions: 0,
            flashcardsCompleted: 0,
            totalXP: 0,
            subjectBreakdown: {}
        });
        return result.success;
    }

    // Update study time
    async updateStudyTime(userId, minutes, subjectId = null) {
        const userData = await this.firebaseService.getUserData(userId);
        if (!userData.success) return false;

        const currentStudyTime = userData.data.studyTime || 0;
        const newStudyTime = currentStudyTime + minutes;

        // Update user data
        await this.firebaseService.updateUserData(userId, {
            studyTime: newStudyTime
        });

        // Update leaderboard
        const leaderboardData = {
            studyTime: newStudyTime
        };

        if (subjectId) {
            const subjectName = this.getSubjectName(subjectId);
            const subjectBreakdown = userData.data.subjectBreakdown || {};
            if (!subjectBreakdown[subjectName]) {
                subjectBreakdown[subjectName] = { studyTime: 0, xp: 0 };
            }
            subjectBreakdown[subjectName].studyTime += minutes;
            leaderboardData.subjectBreakdown = subjectBreakdown;
        }

        await this.firebaseService.updateLeaderboard(userId, leaderboardData);
        return true;
    }

    // Update study sessions
    async updateStudySessions(userId, count = 1) {
        const userData = await this.firebaseService.getUserData(userId);
        if (!userData.success) return false;

        const currentSessions = userData.data.studySessions || 0;
        const newSessions = currentSessions + count;

        await this.firebaseService.updateUserData(userId, {
            studySessions: newSessions
        });

        await this.firebaseService.updateLeaderboard(userId, {
            studySessions: newSessions
        });
        return true;
    }

    // Update flashcards completed
    async updateFlashcards(userId, count = 1) {
        const userData = await this.firebaseService.getUserData(userId);
        if (!userData.success) return false;

        const currentFlashcards = userData.data.flashcardsCompleted || 0;
        const newFlashcards = currentFlashcards + count;

        await this.firebaseService.updateUserData(userId, {
            flashcardsCompleted: newFlashcards
        });

        await this.firebaseService.updateLeaderboard(userId, {
            flashcardsCompleted: newFlashcards
        });
        return true;
    }

    // Update XP
    async updateXP(userId, xp) {
        const userData = await this.firebaseService.getUserData(userId);
        if (!userData.success) return false;

        const currentXP = userData.data.totalXP || 0;
        const newXP = currentXP + xp;

        await this.firebaseService.updateUserData(userId, {
            totalXP: newXP
        });

        await this.firebaseService.updateLeaderboard(userId, {
            totalXP: newXP
        });
        return true;
    }

    // Update streak
    async updateStreak(userId, streak) {
        await this.firebaseService.updateUserData(userId, {
            studyStreak: streak
        });

        await this.firebaseService.updateLeaderboard(userId, {
            studyStreak: streak
        });
        return true;
    }

    // Get all users from leaderboard
    async getAllUsers() {
        const result = await this.firebaseService.getLeaderboard();
        if (result.success) {
            return result.data;
        }
        return [];
    }

    // Get leaderboard with filters
    async getLeaderboard(category = 'totalXP', timeFilter = 'alltime', subjectFilter = '') {
        let users = await this.getAllUsers();

        // Apply time filter
        if (timeFilter !== 'alltime') {
            const now = new Date();
            let cutoffDate;
            
            switch (timeFilter) {
                case 'today':
                    cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'week':
                    cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
            }

            if (cutoffDate) {
                users = users.filter(u => {
                    const lastActive = u.lastActive ? new Date(u.lastActive.toDate ? u.lastActive.toDate() : u.lastActive) : null;
                    return lastActive && lastActive >= cutoffDate;
                });
            }
        }

        // Apply subject filter
        if (subjectFilter) {
            users = users.filter(u => {
                if (!u.subjectBreakdown) return false;
                const subjectKey = subjectFilter.toLowerCase();
                return u.subjectBreakdown[subjectKey] && u.subjectBreakdown[subjectKey].studyTime > 0;
            });
        }

        // Sort by category
        users.sort((a, b) => {
            let aValue, bValue;

            switch (category) {
                case 'studyTime':
                    aValue = a.studyTime || 0;
                    bValue = b.studyTime || 0;
                    break;
                case 'studyStreak':
                    aValue = a.studyStreak || 0;
                    bValue = b.studyStreak || 0;
                    break;
                case 'studySessions':
                    aValue = a.studySessions || 0;
                    bValue = b.studySessions || 0;
                    break;
                case 'flashcardsCompleted':
                    aValue = a.flashcardsCompleted || 0;
                    bValue = b.flashcardsCompleted || 0;
                    break;
                case 'totalXP':
                default:
                    aValue = a.totalXP || 0;
                    bValue = b.totalXP || 0;
                    break;
            }

            return bValue - aValue;
        });

        return users;
    }

    // Sync current user's stats
    async syncCurrentUser() {
        if (!this.authManager.isAuthenticated()) return;

        const currentUser = this.authManager.getCurrentUser();
        if (!currentUser) return;

        const userId = currentUser.userId;
        const userData = await this.firebaseService.getUserData(userId);
        
        if (userData.success) {
            // Sync all stats to leaderboard
            await this.firebaseService.updateLeaderboard(userId, {
                username: currentUser.username,
                avatar: currentUser.avatar,
                studyTime: userData.data.studyTime || 0,
                studyStreak: userData.data.studyStreak || 0,
                studySessions: userData.data.studySessions || 0,
                flashcardsCompleted: userData.data.flashcardsCompleted || 0,
                totalXP: userData.data.totalXP || 0,
                subjectBreakdown: userData.data.subjectBreakdown || {}
            });
        }
    }

    // Set up real-time listener
    onLeaderboardUpdate(callback) {
        this.firebaseService.onLeaderboardUpdate((users) => {
            callback(users);
        });
    }

    // Helper methods
    getSubjectName(subjectId) {
        if (!subjectId) return 'general';
        const subjects = this.store.getSubjects();
        const subject = subjects.find(s => s.id === subjectId);
        return subject ? subject.name.toLowerCase() : 'general';
    }

    // Start auto-refresh
    startAutoRefresh(callback, interval = 30000) {
        // Real-time updates are handled by Firestore listeners
        // This is kept for backward compatibility
        if (callback) {
            this.onLeaderboardUpdate(callback);
        }
    }

    // Stop auto-refresh
    stopAutoRefresh() {
        // Firestore listeners are automatically cleaned up
        if (this.leaderboardListener) {
            this.leaderboardListener();
            this.leaderboardListener = null;
        }
    }
}

// Export for use in other files
window.FirebaseLeaderboardManager = FirebaseLeaderboardManager;

