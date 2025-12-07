// Firebase Store - Replaces localStorage-based Store
class FirebaseStore {
    constructor(firebaseService, authManager) {
        this.firebaseService = firebaseService;
        this.authManager = authManager;
        this.state = {
            user: {},
            subjects: [],
            flashcards: [],
            sessions: [],
            achievements: [],
            countdowns: [],
            visionBoard: [],
            badges: [],
            // Daily / streak tracking (needed by views)
            checkin_today: false,
            last_checkin: null,
            daily_xp_claimed: false,
            last_daily_xp: null,
            // Settings
            settings: {
                theme: 'light',
                soundEnabled: true,
                fontSize: 'medium'
            }
        };

        this.loading = false;
    }

    async initialize() {
        if (!this.authManager.isAuthenticated()) {
            return;
        }

        this.loading = true;
        const userId = this.authManager.getCurrentUser().userId;

        try {
            // Load user data
            const userDataResult = await this.firebaseService.getUserData(userId);
            if (userDataResult.success) {
                const userData = userDataResult.data;
                this.state.user = {
                    name: userData.displayName || userData.username,
                    avatar: userData.avatar || '🎓',
                    level: this.calculateLevel(userData.totalXP || 0),
                    xp: userData.totalXP || 0,
                    streak: userData.studyStreak || 0,
                    lastLogin: new Date().toISOString().split('T')[0],
                    userId: userId
                };
            }

            // Load flashcards
            const flashcardsResult = await this.firebaseService.getFlashcards(userId);
            if (flashcardsResult.success) {
                const decks = this.groupFlashcardsIntoDecks(flashcardsResult.data);
                this.state.flashcards = decks;
            }

            // Load subjects (stored in user profile)
            if (userDataResult.success && userDataResult.data.subjects) {
                this.state.subjects = userDataResult.data.subjects;
            }

            // Load notes
            const notesResult = await this.firebaseService.getNotes(userId);
            if (notesResult.success) {
                this.state.notes = notesResult.data;
            }

            // Load timetable
            const timetableResult = await this.firebaseService.getTimetable(userId);
            if (timetableResult.success) {
                this.state.timetable = timetableResult.data;
            }

            // Load countdowns
            const countdownsResult = await this.firebaseService.getCountdowns(userId);
            if (countdownsResult.success) {
                this.state.countdowns = countdownsResult.data;
            }

            // Load achievements
            const achievementsResult = await this.firebaseService.getAchievements(userId);
            if (achievementsResult.success) {
                this.state.achievements = achievementsResult.data;
            }

            // Load settings
            const settingsResult = await this.firebaseService.getSettings(userId);
            if (settingsResult.success) {
                this.state.settings = settingsResult.data;
            }

            // Load vision board
            const visionResult = await this.firebaseService.getVisionBoard(userId);
            if (visionResult.success) {
                this.state.visionBoard = visionResult.data || [];
            }

            // Load papers
            const papersResult = await this.firebaseService.getPapers(userId);
            if (papersResult.success) {
                this.state.papers = papersResult.data || [];
            }

            // Load sessions
            const sessionsResult = await this.firebaseService.getSessions(userId);
            if (sessionsResult.success) {
                this.state.sessions = sessionsResult.data;
            }

        } catch (error) {
            console.error('Error initializing Firebase store:', error);
        } finally {
            this.loading = false;
        }
    }

    groupFlashcardsIntoDecks(flashcards) {
        // Group flashcards by subject or create default deck
        const decks = {};
        flashcards.forEach(card => {
            const deckTitle = card.subject || 'General';
            if (!decks[deckTitle]) {
                decks[deckTitle] = {
                    id: `deck_${deckTitle.toLowerCase().replace(/\s+/g, '_')}`,
                    title: deckTitle,
                    cards: [],
                    icon: '📚'
                };
            }
            decks[deckTitle].cards.push(card);
        });
        return Object.values(decks);
    }

    calculateLevel(xp) {
        let level = 1;
        let xpNeeded = 100;
        while (xp >= xpNeeded) {
            xp -= xpNeeded;
            level++;
            xpNeeded = level * 100;
        }
        return level;
    }

    // Save methods
    async save(key) {
        if (!this.authManager.isAuthenticated()) return;
        
        const userId = this.authManager.getCurrentUser().userId;
        const dataToSave = JSON.parse(JSON.stringify(this.state[key]));

        try {
            switch (key) {
                case 'flashcards':
                    // Save each flashcard to Firestore
                    for (const deck of dataToSave) {
                        for (const card of deck.cards) {
                            await this.firebaseService.saveFlashcard(userId, {
                                ...card,
                                subject: deck.title
                            });
                        }
                    }
                    break;
                case 'user':
                    await this.firebaseService.updateUserData(userId, {
                        displayName: dataToSave.name,
                        avatar: dataToSave.avatar,
                        totalXP: dataToSave.xp,
                        studyStreak: dataToSave.streak
                    });
                    break;
                case 'subjects':
                    await this.firebaseService.updateUserData(userId, {
                        subjects: dataToSave
                    });
                    break;
                case 'notes':
                    // Notes are saved individually, not as a batch
                    break;
                case 'timetable':
                    await this.firebaseService.saveTimetable(userId, dataToSave);
                    break;
                case 'countdowns':
                    // Countdowns are saved individually
                    break;
                case 'achievements':
                    // Achievements are saved individually
                    break;
                case 'settings':
                    await this.firebaseService.saveSettings(userId, dataToSave);
                    break;
                case 'visionBoard':
                    // Vision board items are saved individually
                    break;
                case 'sessions':
                    // Sessions are saved individually
                    break;
            }
        } catch (error) {
            console.error(`Error saving ${key}:`, error);
        }
    }

    // Get methods
    getUser() {
        return this.state.user;
    }

    getDecks() {
        return this.state.flashcards;
    }

    getSessions() {
        return this.state.sessions || [];
    }

    getSubjects() {
        return this.state.subjects || [];
    }

    getSettings() {
        return this.state.settings || { theme: 'light', soundEnabled: true, fontSize: 'medium' };
    }

    getNotes() {
        return this.state.notes || [];
    }

    getTimetable() {
        return this.state.timetable || null;
    }

    getCountdowns() {
        return this.state.countdowns || [];
    }

    getAchievements() {
        return this.state.achievements || [];
    }

    getVisionBoard() {
        return this.state.visionBoard || [];
    }

    getPapers() {
        return this.state.papers || [];
    }

    getTimetable() {
        return this.state.timetable || null;
    }

    getCurrentUserId() {
        if (!this.authManager || !this.authManager.isAuthenticated()) {
            return null;
        }
        const user = this.authManager.getCurrentUser();
        return user ? user.userId : null;
    }

    // Async methods that fetch from Firestore
    async loadVisionBoard() {
        const userId = this.getCurrentUserId();
        if (!userId) return [];
        
        const result = await this.firebaseService.getVisionBoard(userId);
        if (result.success) {
            this.state.visionBoard = result.data;
        }
        return result.success ? result.data : [];
    }

    async saveVisionBoard(items) {
        const userId = this.getCurrentUserId();
        if (!userId) return { success: false };
        
        this.state.visionBoard = items;
        return await this.firebaseService.saveVisionBoard(userId, items);
    }

    async loadPapers() {
        const userId = this.getCurrentUserId();
        if (!userId) return [];
        
        const result = await this.firebaseService.getPapers(userId);
        if (result.success) {
            this.state.papers = result.data;
        }
        return result.success ? result.data : [];
    }

    async loadTimetable() {
        const userId = this.getCurrentUserId();
        if (!userId) return null;
        
        const result = await this.firebaseService.getTimetable(userId);
        if (result.success) {
            this.state.timetable = result.data;
        }
        return result.success ? result.data : null;
    }

    // Update methods
    async updateUser(updates) {
        this.state.user = { ...this.state.user, ...updates };
        await this.save('user');
    }

    async addXP(amount) {
        this.state.user.xp += amount;
        const xpNeeded = this.state.user.level * 100;
        let leveledUp = false;

        if (this.state.user.xp >= xpNeeded) {
            this.state.user.level++;
            this.state.user.xp -= xpNeeded;
            leveledUp = true;
        }

        await this.save('user');
        
        // Update leaderboard
        if (this.authManager.isAuthenticated()) {
            const userId = this.authManager.getCurrentUser().userId;
            await this.firebaseService.updateLeaderboard(userId, {
                totalXP: this.state.user.xp
            });
        }

        return leveledUp;
    }

    async logSession(duration, subjectId = null) {
        const roundedDuration = Math.round(duration);
        const session = {
            timestamp: new Date().toISOString(),
            duration: roundedDuration
        };
        if (subjectId) session.subjectId = subjectId;
        
        this.state.sessions = this.state.sessions || [];
        this.state.sessions.push(session);
        
        // Save session to Firestore
        if (this.authManager.isAuthenticated()) {
            const userId = this.authManager.getCurrentUser().userId;
            await this.firebaseService.saveSession(userId, session);
            
            // Update user stats and leaderboard
            const userData = await this.firebaseService.getUserData(userId);
            if (userData.success) {
                const currentStudyTime = userData.data.studyTime || 0;
                const currentSessions = userData.data.studySessions || 0;
                
                await this.firebaseService.updateUserData(userId, {
                    studyTime: currentStudyTime + roundedDuration,
                    studySessions: currentSessions + 1
                });

                await this.firebaseService.updateLeaderboard(userId, {
                    studyTime: currentStudyTime + roundedDuration,
                    studySessions: currentSessions + 1
                });
            }
        }
    }

    async saveDecks(decks) {
        this.state.flashcards = decks;
        await this.save('flashcards');
    }

    // Other methods from original Store class
    async addSubject(subject) {
        this.state.subjects = this.state.subjects || [];
        this.state.subjects.push(subject);
        await this.save('subjects');
    }

    async updateSubject(updatedSubject) {
        this.state.subjects = this.state.subjects || [];
        const index = this.state.subjects.findIndex(s => s.id === updatedSubject.id);
        if (index !== -1) {
            this.state.subjects[index] = updatedSubject;
            await this.save('subjects');
        }
    }

    async deleteSubject(id) {
        this.state.subjects = this.state.subjects || [];
        this.state.subjects = this.state.subjects.filter(s => s.id !== id);
        await this.save('subjects');
    }

    async saveNote(note) {
        if (!this.authManager.isAuthenticated()) return;
        const userId = this.authManager.getCurrentUser().userId;
        const result = await this.firebaseService.saveNote(userId, note);
        if (result.success) {
            // Update local state
            this.state.notes = this.state.notes || [];
            const index = this.state.notes.findIndex(n => n.id === note.id);
            if (index !== -1) {
                this.state.notes[index] = { ...note, id: result.id };
            } else {
                this.state.notes.push({ ...note, id: result.id });
            }
        }
        return result;
    }

    async deleteNote(noteId) {
        if (!this.authManager.isAuthenticated()) return;
        const userId = this.authManager.getCurrentUser().userId;
        const result = await this.firebaseService.deleteNote(userId, noteId);
        if (result.success) {
            this.state.notes = (this.state.notes || []).filter(n => n.id !== noteId);
        }
        return result;
    }

    async saveCountdown(countdown) {
        if (!this.authManager.isAuthenticated()) return;
        const userId = this.authManager.getCurrentUser().userId;
        const result = await this.firebaseService.saveCountdown(userId, countdown);
        if (result.success) {
            this.state.countdowns = this.state.countdowns || [];
            const index = this.state.countdowns.findIndex(c => c.id === countdown.id);
            if (index !== -1) {
                this.state.countdowns[index] = { ...countdown, id: result.id };
            } else {
                this.state.countdowns.push({ ...countdown, id: result.id });
            }
        }
        return result;
    }

    async deleteCountdown(countdownId) {
        if (!this.authManager.isAuthenticated()) return;
        const userId = this.authManager.getCurrentUser().userId;
        const result = await this.firebaseService.deleteCountdown(userId, countdownId);
        if (result.success) {
            this.state.countdowns = (this.state.countdowns || []).filter(c => c.id !== countdownId);
        }
        return result;
    }

    async saveAchievement(achievement) {
        if (!this.authManager.isAuthenticated()) return;
        const userId = this.authManager.getCurrentUser().userId;
        const result = await this.firebaseService.saveAchievement(userId, achievement);
        if (result.success) {
            this.state.achievements = this.state.achievements || [];
            const index = this.state.achievements.findIndex(a => a.id === achievement.id);
            if (index !== -1) {
                this.state.achievements[index] = achievement;
            } else {
                this.state.achievements.push(achievement);
            }
        }
        return result;
    }

    async saveTimetable(timetable) {
        if (!this.authManager.isAuthenticated()) return;
        const userId = this.authManager.getCurrentUser().userId;
        const result = await this.firebaseService.saveTimetable(userId, timetable);
        if (result.success) {
            this.state.timetable = timetable;
        }
        return result;
    }

    async saveVisionItem(item) {
        if (!this.authManager.isAuthenticated()) return;
        const userId = this.authManager.getCurrentUser().userId;
        const result = await this.firebaseService.saveVisionItem(userId, item);
        if (result.success) {
            this.state.visionBoard = this.state.visionBoard || [];
            const index = this.state.visionBoard.findIndex(v => v.id === item.id);
            if (index !== -1) {
                this.state.visionBoard[index] = { ...item, id: result.id };
            } else {
                this.state.visionBoard.push({ ...item, id: result.id });
            }
        }
        return result;
    }

    async deleteVisionItem(itemId) {
        if (!this.authManager.isAuthenticated()) return;
        const userId = this.authManager.getCurrentUser().userId;
        const result = await this.firebaseService.deleteVisionItem(userId, itemId);
        if (result.success) {
            this.state.visionBoard = (this.state.visionBoard || []).filter(v => v.id !== itemId);
        }
        return result;
    }

    // Backward compatibility methods
    getAllUsers() {
        // This would fetch from leaderboard
        return [];
    }

    // ---------------- Gamification & Daily Rewards ----------------
    // Badge templates (static)
    getAllBadges() {
        return [
            { id: 'starter', name: 'Starter', icon: '🌱', requirement: 'Complete first session', type: 'milestone' },
            { id: 'study_1h', name: 'Getting Started', icon: '📚', requirement: '1 hour of study', type: 'hours', target: 1 },
            { id: 'study_10h', name: 'Studious', icon: '🤓', requirement: '10 hours of study', type: 'hours', target: 10 },
            { id: 'study_50h', name: 'Scholar', icon: '🎓', requirement: '50 hours of study', type: 'hours', target: 50 },
            { id: 'study_100h', name: 'Master', icon: '🧙', requirement: '100 hours of study', type: 'hours', target: 100 },
            { id: 'xp_500', name: 'Rising Star', icon: '⭐', requirement: '500 XP earned', type: 'xp', target: 500 },
            { id: 'xp_2000', name: 'Legendary', icon: '🌟', requirement: '2000 XP earned', type: 'xp', target: 2000 },
            { id: 'streak_7', name: 'On Fire', icon: '🔥', requirement: '7 day streak', type: 'streak', target: 7 },
            { id: 'streak_30', name: 'Unstoppable', icon: '💪', requirement: '30 day streak', type: 'streak', target: 30 },
            { id: 'subject_master', name: 'Subject Master', icon: '🏆', requirement: '10 hours in one subject', type: 'subject', target: 10 }
        ];
    }

    getBadges() {
        return this.state.badges || [];
    }

    async unlockBadge(badgeId) {
        if (!this.getBadges().find(b => b.id === badgeId)) {
            const template = this.getAllBadges().find(b => b.id === badgeId);
            if (template) {
                this.state.badges.push({
                    id: badgeId,
                    name: template.name,
                    icon: template.icon,
                    unlockedAt: new Date().toISOString()
                });
                await this.save('badges');
                return true;
            }
        }
        return false;
    }

    checkBadgeProgress() {
        const totalHours = (this.state.sessions.reduce((a, s) => a + s.duration, 0) / 60);
        // Hour-based
        if (totalHours >= 1) this.unlockBadge('study_1h');
        if (totalHours >= 10) this.unlockBadge('study_10h');
        if (totalHours >= 50) this.unlockBadge('study_50h');
        if (totalHours >= 100) this.unlockBadge('study_100h');
        // XP-based
        if (this.state.user.xp >= 500) this.unlockBadge('xp_500');
        if (this.state.user.xp >= 2000) this.unlockBadge('xp_2000');
        // Streak
        if (this.state.user.streak >= 7) this.unlockBadge('streak_7');
        if (this.state.user.streak >= 30) this.unlockBadge('streak_30');
    }

    getBadgeProgress(badgeId) {
        const badge = this.getAllBadges().find(b => b.id === badgeId);
        if (!badge) return null;
        const unlocked = !!this.state.badges.find(b => b.id === badgeId);
        let progress = 0;
        if (badge.type === 'hours') {
            progress = Math.floor((this.state.sessions.reduce((a, s) => a + s.duration, 0) / 60) * 100 / badge.target);
        } else if (badge.type === 'xp') {
            progress = Math.floor((this.state.user.xp * 100) / badge.target);
        } else if (badge.type === 'streak') {
            progress = Math.floor((this.state.user.streak * 100) / badge.target);
        }
        return { isUnlocked: unlocked, progress: Math.min(progress, 100), target: badge.target };
    }

    // ---------------- Daily Check-in & XP ----------------
    checkDailyCheckIn() {
        const today = new Date().toISOString().split('T')[0];
        if (this.state.last_checkin !== today) {
            this.state.checkin_today = false;
        }
        if (this.state.last_daily_xp !== today) {
            this.state.daily_xp_claimed = false;
        }
    }

    completeDailyCheckIn() {
        const today = new Date().toISOString().split('T')[0];
        if (!this.state.checkin_today) {
            this.state.checkin_today = true;
            this.state.last_checkin = today;
            this.addXP(25);
            this.save('checkin_today');
            this.save('last_checkin');
            return true;
        }
        return false;
    }

    claimDailyXP() {
        const today = new Date().toISOString().split('T')[0];
        if (!this.state.daily_xp_claimed) {
            this.state.daily_xp_claimed = true;
            this.state.last_daily_xp = today;
            this.addXP(10);
            this.save('daily_xp_claimed');
            this.save('last_daily_xp');
            return true;
        }
        return false;
    }

    canClaimDailyXP() {
        return !this.state.daily_xp_claimed;
    }

    // ---------------- Existing compatibility section ----------------
    // Additional methods for compatibility
    checkAchievements() {
        // Achievement checking logic
    }

    updateChallengeProgress(challengeType, value) {
        // Challenge progress logic
    }
    getDailyChallenges() {
        // Return default daily challenges or fetch from Firestore
        return [
          {
            id: 1,
            title: 'Study for 25 minutes',
            description: 'Complete one Pomodoro session',
            xp: 50,
            completed: false
          },
          {
            id: 2,
            title: 'Review 10 flashcards',
            description: 'Practice with flashcards',
            xp: 30,
            completed: false
          },
          {
            id: 3,
            title: 'Add 5 new notes',
            description: 'Create study notes',
            xp: 40,
            completed: false
          }
        ];
      }
}

// Export for use in other files
window.FirebaseStore = FirebaseStore;

