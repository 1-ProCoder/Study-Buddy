// Leaderboard Manager - Handles shared leaderboard data and updates
class LeaderboardManager {
    constructor(store, authManager) {
        this.store = store;
        this.authManager = authManager;
        this.lastUpdate = null;
        this.updateInterval = null;
    }

    // Initialize leaderboard for current user
    initializeUser(userId, username, avatar) {
        const leaderboardData = window.storage.get('leaderboard:users', true) || [];
        const existingUser = leaderboardData.find(u => u.userId === userId);

        if (!existingUser) {
            const newUser = {
                userId: userId,
                username: username,
                avatar: avatar || '🎓',
                studyTime: 0, // minutes
                studyStreak: 0, // days
                studySessions: 0, // count
                flashcardsCompleted: 0, // count
                totalXP: 0, // points
                lastActive: new Date().toISOString().split('T')[0],
                subjectBreakdown: {},
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            };
            leaderboardData.push(newUser);
            window.storage.set('leaderboard:users', leaderboardData, true);
        } else {
            // Update last active
            existingUser.lastActive = new Date().toISOString().split('T')[0];
            existingUser.lastUpdated = new Date().toISOString();
            this.saveLeaderboard(leaderboardData);
        }
    }

    // Update leaderboard stat for a user
    updateStat(userId, statType, value, increment = true) {
        const leaderboardData = window.storage.get('leaderboard:users', true) || [];
        let user = leaderboardData.find(u => u.userId === userId);

        if (!user) {
            // User not found, initialize
            const currentUser = this.authManager?.getCurrentUser();
            if (currentUser && currentUser.userId === userId) {
                this.initializeUser(userId, currentUser.username, currentUser.avatar);
                user = leaderboardData.find(u => u.userId === userId);
            } else {
                console.warn('User not found in leaderboard:', userId);
                return false;
            }
        }

        // Update the stat
        if (increment) {
            user[statType] = (user[statType] || 0) + value;
        } else {
            user[statType] = value;
        }

        user.lastActive = new Date().toISOString().split('T')[0];
        user.lastUpdated = new Date().toISOString();

        this.saveLeaderboard(leaderboardData);
        return true;
    }

    // Update study time
    updateStudyTime(userId, minutes, subjectId = null) {
        this.updateStat(userId, 'studyTime', minutes, true);
        
        if (subjectId) {
            const leaderboardData = window.storage.get('leaderboard:users', true) || [];
            const user = leaderboardData.find(u => u.userId === userId);
            if (user) {
                if (!user.subjectBreakdown) user.subjectBreakdown = {};
                const subjectName = this.getSubjectName(subjectId);
                if (!user.subjectBreakdown[subjectName]) {
                    user.subjectBreakdown[subjectName] = { studyTime: 0, xp: 0 };
                }
                user.subjectBreakdown[subjectName].studyTime += minutes;
                this.saveLeaderboard(leaderboardData);
            }
        }
    }

    // Update study sessions count
    updateStudySessions(userId, count = 1) {
        this.updateStat(userId, 'studySessions', count, true);
    }

    // Update flashcards completed
    updateFlashcards(userId, count = 1) {
        this.updateStat(userId, 'flashcardsCompleted', count, true);
    }

    // Update XP
    updateXP(userId, xp) {
        this.updateStat(userId, 'totalXP', xp, true);
    }

    // Update study streak
    updateStreak(userId, streak) {
        this.updateStat(userId, 'studyStreak', streak, false);
    }

    // Get subject name from ID
    getSubjectName(subjectId) {
        if (!subjectId) return 'general';
        const subjects = this.store.getSubjects();
        const subject = subjects.find(s => s.id === subjectId);
        return subject ? subject.name.toLowerCase() : 'general';
    }

    // Get all leaderboard data
    getAllUsers() {
        return window.storage.get('leaderboard:users', true) || [];
    }

    // Get user stats
    getUserStats(userId) {
        const leaderboardData = this.getAllUsers();
        return leaderboardData.find(u => u.userId === userId) || null;
    }

    // Save leaderboard data
    saveLeaderboard(data) {
        window.storage.set('leaderboard:users', data, true);
        this.lastUpdate = new Date();
    }

    // Get leaderboard sorted by category
    getLeaderboard(category = 'totalXP', timeFilter = 'alltime', subjectFilter = '') {
        let users = this.getAllUsers();

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
                default:
                    cutoffDate = null;
            }

            if (cutoffDate) {
                users = users.filter(u => {
                    const lastActive = new Date(u.lastActive);
                    return lastActive >= cutoffDate;
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

    // Sync current user's stats to leaderboard
    syncCurrentUser() {
        if (!this.authManager || !this.authManager.isAuthenticated()) return;

        const currentUser = this.authManager.getCurrentUser();
        if (!currentUser) return;

        const userId = currentUser.userId;
        const username = currentUser.username;
        const avatar = currentUser.avatar || '🎓';

        // Initialize if needed
        this.initializeUser(userId, username, avatar);

        // Sync stats from store
        const sessions = this.store.getSessions() || [];
        const totalStudyTime = sessions.reduce((acc, s) => acc + (s.duration || 0), 0);
        const studySessions = sessions.length;
        
        const decks = this.store.getDecks() || [];
        const flashcardsCompleted = decks.reduce((acc, d) => 
            acc + (d.cards ? d.cards.filter(c => c.mastered).length : 0), 0
        );

        const user = this.store.getUser();
        const totalXP = user.xp || 0;
        const studyStreak = user.streak || 0;

        // Update all stats
        const leaderboardData = this.getAllUsers();
        const leaderboardUser = leaderboardData.find(u => u.userId === userId);
        
        if (leaderboardUser) {
            leaderboardUser.studyTime = totalStudyTime;
            leaderboardUser.studySessions = studySessions;
            leaderboardUser.flashcardsCompleted = flashcardsCompleted;
            leaderboardUser.totalXP = totalXP;
            leaderboardUser.studyStreak = studyStreak;
            leaderboardUser.username = username; // Update username if changed
            leaderboardUser.avatar = avatar; // Update avatar if changed
            leaderboardUser.lastActive = new Date().toISOString().split('T')[0];
            leaderboardUser.lastUpdated = new Date().toISOString();

            // Update subject breakdown
            const subjectSessions = {};
            sessions.forEach(s => {
                if (s.subjectId) {
                    const subjectName = this.getSubjectName(s.subjectId);
                    if (!subjectSessions[subjectName]) {
                        subjectSessions[subjectName] = { studyTime: 0, xp: 0 };
                    }
                    subjectSessions[subjectName].studyTime += s.duration || 0;
                }
            });
            leaderboardUser.subjectBreakdown = subjectSessions;

            this.saveLeaderboard(leaderboardData);
        }
    }

    // Start auto-refresh
    startAutoRefresh(callback, interval = 30000) {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.updateInterval = setInterval(() => {
            this.syncCurrentUser();
            if (callback) callback();
        }, interval);
    }

    // Stop auto-refresh
    stopAutoRefresh() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}

// Export for use in other files
window.LeaderboardManager = LeaderboardManager;

