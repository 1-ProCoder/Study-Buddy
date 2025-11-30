class Store {
    constructor() {
        this.themes = ['light', 'dark', 'midnight', 'sunset', 'forest'];
        this.accountManager = new AccountManager();

        // Load from current account or use defaults
        const currentAccount = this.accountManager.getCurrentAccount();

        if (currentAccount) {
            // Load from existing account
            this.state = {
                user: currentAccount.user,
                subjects: currentAccount.subjects || [],
                timetable: currentAccount.timetable || null,
                settings: currentAccount.settings || {
                    theme: 'light',
                    soundEnabled: true,
                    fontSize: 'medium'
                },
                flashcards: currentAccount.flashcards || [],
                sessions: currentAccount.sessions || [],
                papers: currentAccount.papers || [],
                achievements: currentAccount.achievements || [],
                countdowns: currentAccount.countdowns || [],
                visionBoard: currentAccount.visionBoard || [],
                dailyChallenges: currentAccount.dailyChallenges || this.generateDailyChallenges(),
                badges: currentAccount.badges || [],
                checkin_today: currentAccount.checkin_today || false,
                last_checkin: currentAccount.last_checkin || null,
                timetableCompletions: currentAccount.timetableCompletions || {},
                last_timetable_check: currentAccount.last_timetable_check || null,
                daily_xp_claimed: currentAccount.daily_xp_claimed || false,
                last_daily_xp: currentAccount.last_daily_xp || null,
                dailyActivities: currentAccount.dailyActivities || {}
            };

            // Check streak on init
            this.checkStreak();
            this.checkDailyChallengesReset();
            this.checkDailyCheckIn();
        } else {
            // No account - will be created when user enters name
            this.state = {
                user: {
                    name: 'Student',
                    avatar: '🎓',
                    level: 1,
                    xp: 0,
                    streak: 0,
                    lastLogin: new Date().toISOString().split('T')[0],
                    userId: null
                },
                subjects: [],
                timetable: null,
                settings: {
                    theme: 'light',
                    soundEnabled: true,
                    fontSize: 'medium'
                },
                flashcards: [],
                sessions: [],
                papers: [],
                achievements: [],
                countdowns: [],
                visionBoard: [],
                dailyChallenges: this.generateDailyChallenges(),
                badges: [],
                checkin_today: false,
                last_checkin: null,
                timetableCompletions: {},
                last_timetable_check: null,
                daily_xp_claimed: false,
                last_daily_xp: null,
                dailyActivities: {}
            };
        }
    }

    save(key) {
        // Save to current account
        const currentAccount = this.accountManager.getCurrentAccount();
        if (currentAccount && this.state[key] !== undefined) {
            try {
                // Deep clone to avoid reference issues
                const dataToSave = JSON.parse(JSON.stringify(this.state[key]));
                // Update only the specific key to avoid overwriting other data
                const updateData = {};
                updateData[key] = dataToSave;
                this.accountManager.updateCurrentAccount(updateData);
            } catch (e) {
                console.warn(`Error saving ${key}:`, e);
            }
        }
    }

    getAllUsers() {
        // Get all user profiles from account manager
        return this.accountManager.getAllUserProfiles();
    }

    getSubjects() {
        return this.state.subjects;
    }

    addSubject(subject) {
        this.state.subjects.push(subject);
        this.save('subjects');
    }

    updateSubject(updatedSubject) {
        const index = this.state.subjects.findIndex(s => s.id === updatedSubject.id);
        if (index !== -1) {
            this.state.subjects[index] = updatedSubject;
            this.save('subjects');
        }
    }

    deleteSubject(id) {
        this.state.subjects = this.state.subjects.filter(s => s.id !== id);
        this.save('subjects');
    }

    getTimetable() {
        return this.state.timetable;
    }

    saveTimetable(timetable) {
        this.state.timetable = timetable;
        this.save('timetable');
    }

    getSettings() {
        return this.state.settings;
    }

    // Flashcards
    getDecks() { return this.state.flashcards; }
    saveDecks(decks) {
        this.state.flashcards = decks;
        this.save('flashcards');
    }

    // Pomodoro Sessions
    getSessions() { return this.state.sessions; }
    logSession(duration, subjectId = null) {
        // Ensure duration is a whole number (integer)
        const roundedDuration = Math.round(duration);
        const session = {
            timestamp: new Date().toISOString(),
            duration: roundedDuration // minutes (whole number only)
        };
        if (subjectId) session.subjectId = subjectId;
        this.state.sessions.push(session);
        this.save('sessions');
        this.checkAchievements();
        this.updateChallengeProgress('study_time', roundedDuration);
    }

    // Past Papers
    getPapers() { return this.state.papers; }
    addPaper(paper) {
        this.state.papers.push(paper);
        this.save('papers');
    }

    // Achievements
    getAchievements() { return this.state.achievements; }
    unlockAchievement(id, title, icon) {
        if (!this.state.achievements.find(a => a.id === id)) {
            this.state.achievements.push({ id, title, icon, date: new Date().toISOString() });
            this.save('achievements');
            return true; // Unlocked new
        }
        return false;
    }

    checkAchievements() {
        // Simple checks
        const totalHours = this.state.sessions.reduce((acc, s) => acc + s.duration, 0) / 60;
        if (totalHours >= 10) this.unlockAchievement('hours_10', 'Studied 10 Hours', '🤓');

        if (this.state.user.streak >= 5) this.unlockAchievement('streak_5', '5 Day Streak', '🔥');
    }

    cycleTheme() {
        const currentIndex = this.themes.indexOf(this.state.settings.theme);
        const nextIndex = (currentIndex + 1) % this.themes.length;
        this.state.settings.theme = this.themes[nextIndex];
        this.save('settings');
        return this.state.settings.theme;
    }

    checkStreak() {
        const today = new Date().toISOString().split('T')[0];
        if (this.state.user.lastLogin !== today) {
            const last = new Date(this.state.user.lastLogin);
            const current = new Date(today);
            const diffTime = Math.abs(current - last);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                this.state.user.streak++;
            } else if (diffDays > 1) {
                this.state.user.streak = 0;
            }

            this.state.user.lastLogin = today;
            this.save('user');
        }
    }

    // Countdowns
    getCountdowns() {
        return this.state.countdowns.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    addCountdown(countdown) {
        this.state.countdowns.push(countdown);
        this.save('countdowns');
    }

    deleteCountdown(id) {
        this.state.countdowns = this.state.countdowns.filter(c => c.id !== id);
        this.save('countdowns');
    }

    getUser() {
        return this.state.user;
    }

    updateUser(updates) {
        this.state.user = { ...this.state.user, ...updates };
        this.save('user');
    }

    addXP(amount) {
        this.state.user.xp += amount;
        // Level up logic: Level * 100 XP required
        const xpNeeded = this.state.user.level * 100;
        let leveledUp = false;

        if (this.state.user.xp >= xpNeeded) {
            this.state.user.level++;
            this.state.user.xp -= xpNeeded;
            this.unlockAchievement(`level_${this.state.user.level}`, `Reached Level ${this.state.user.level}`, '⭐');
            leveledUp = true;
            if (typeof Utils !== 'undefined' && Utils.triggerConfetti) {
                Utils.triggerConfetti();
            }
        }
        this.save('user');
        return leveledUp;
    }

    // Vision Board
    getVisionBoard() { return this.state.visionBoard; }
    addToVisionBoard(item) {
        this.state.visionBoard.push(item);
        this.save('vision');
    }
    removeFromVisionBoard(id) {
        this.state.visionBoard = this.state.visionBoard.filter(i => i.id !== id);
        this.save('vision');
    }

    // Daily Challenges
    generateDailyChallenges() {
        const challenges = [
            { id: 'study_30', text: 'Study for 30 minutes', type: 'study_time', target: 30, current: 0, completed: false, xp: 50 },
            { id: 'quiz_1', text: 'Complete 1 Quiz/Flashcard Session', type: 'quiz_complete', target: 1, current: 0, completed: false, xp: 30 },
            { id: 'login', text: 'Log in today', type: 'login', target: 1, current: 1, completed: true, xp: 10 }
        ];
        // Randomize or rotate in future
        return challenges;
    }

    checkDailyChallengesReset() {
        const today = new Date().toISOString().split('T')[0];
        const lastChallengeDate = localStorage.getItem('sb_challenge_date');

        if (lastChallengeDate !== today) {
            this.state.dailyChallenges = this.generateDailyChallenges();
            this.save('challenges');
            localStorage.setItem('sb_challenge_date', today);
        }
    }

    getDailyChallenges() {
        // Ensure we always return an array for rendering
        const challenges = this.state.dailyChallenges;
        return Array.isArray(challenges) ? challenges : [];
    }

    updateChallengeProgress(type, amount) {
        let updated = false;
        this.state.dailyChallenges.forEach(c => {
            if (c.type === type && !c.completed) {
                c.current += amount;
                if (c.current >= c.target) {
                    c.current = c.target;
                    c.completed = true;
                    this.addXP(c.xp);
                    updated = true;
                }
            }
        });
        if (updated) this.save('challenges');
    }

    // Badges & Gamification
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
        return this.state.badges;
    }

    unlockBadge(badgeId) {
        if (!this.state.badges.find(b => b.id === badgeId)) {
            const badgeTemplate = this.getAllBadges().find(b => b.id === badgeId);
            if (badgeTemplate) {
                this.state.badges.push({
                    id: badgeId,
                    name: badgeTemplate.name,
                    icon: badgeTemplate.icon,
                    unlockedAt: new Date().toISOString()
                });
                this.save('badges');
                return true;
            }
        }
        return false;
    }

    checkBadgeProgress() {
        const totalHours = this.state.sessions.reduce((acc, s) => acc + s.duration, 0) / 60;

        // Check hour-based badges
        if (totalHours >= 1) this.unlockBadge('study_1h');
        if (totalHours >= 10) this.unlockBadge('study_10h');
        if (totalHours >= 50) this.unlockBadge('study_50h');
        if (totalHours >= 100) this.unlockBadge('study_100h');

        // Check XP-based badges
        if (this.state.user.xp >= 500) this.unlockBadge('xp_500');
        if (this.state.user.xp >= 2000) this.unlockBadge('xp_2000');

        // Check streak badges
        if (this.state.user.streak >= 7) this.unlockBadge('streak_7');
        if (this.state.user.streak >= 30) this.unlockBadge('streak_30');
    }

    checkDailyCheckIn() {
        const today = new Date().toISOString().split('T')[0];
        const lastCheckIn = this.state.last_checkin;
        const lastXPClaim = this.state.last_daily_xp;

        if (lastCheckIn !== today) {
            this.state.checkin_today = false;
        }
        if (lastXPClaim !== today) {
            this.state.daily_xp_claimed = false;
        }
    }

    completeDailyCheckIn() {
        const today = new Date().toISOString().split('T')[0];
        if (!this.state.checkin_today) {
            this.state.checkin_today = true;
            this.state.last_checkin = today;
            this.addXP(25); // Daily check-in bonus
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
            this.addXP(10); // Free daily XP reward
            this.save('daily_xp_claimed');
            this.save('last_daily_xp');
            return true;
        }
        return false;
    }

    canClaimDailyXP() {
        return !this.state.daily_xp_claimed;
    }

    getBadgeProgress(badgeId) {
        const badge = this.getAllBadges().find(b => b.id === badgeId);
        if (!badge) return null;

        let progress = 0;
        let isUnlocked = this.state.badges.find(b => b.id === badgeId);

        if (badge.type === 'hours') {
            progress = Math.floor((this.state.sessions.reduce((acc, s) => acc + s.duration, 0) / 60) * 100 / badge.target);
        } else if (badge.type === 'xp') {
            progress = Math.floor((this.state.user.xp * 100) / badge.target);
        } else if (badge.type === 'streak') {
            progress = Math.floor((this.state.user.streak * 100) / badge.target);
        }

        return { isUnlocked: !!isUnlocked, progress: Math.min(progress, 100), target: badge.target };
    }

    // Timetable Completions
    recordTimetableCompletion(dayName, completed = true) {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        if (!this.state.timetableCompletions[yesterday]) {
            this.state.timetableCompletions[yesterday] = {};
        }

        this.state.timetableCompletions[yesterday][dayName] = {
            completed: completed,
            recordedAt: new Date().toISOString()
        };

        this.save('timetable_completions');

        if (completed) {
            this.addXP(50); // 50 XP for completing a day's schedule
            return true;
        }
        return false;
    }

    getTimetableCompletionStatus(date) {
        return this.state.timetableCompletions[date] || {};
    }

    shouldShowTimetableCheckIn() {
        const today = new Date().toISOString().split('T')[0];
        const lastCheck = this.state.last_timetable_check;

        // Show check-in if not checked today
        return lastCheck !== today;
    }

    markTimetableCheckInDone() {
        const today = new Date().toISOString().split('T')[0];
        this.state.last_timetable_check = today;
        this.save('last_timetable_check');
    }

    // Daily Activity Log for various achievements
    recordDailyActivity(activityType, amount = 1) {
        const today = new Date().toISOString().split('T')[0];
        if (!this.state.dailyActivities) {
            this.state.dailyActivities = {};
        }
        if (!this.state.dailyActivities[today]) {
            this.state.dailyActivities[today] = {};
        }
        this.state.dailyActivities[today][activityType] =
            (this.state.dailyActivities[today][activityType] || 0) + amount;
        this.save('daily_activities');
    }

    getDailyActivity(date = null) {
        const target = date || new Date().toISOString().split('T')[0];
        return this.state.dailyActivities?.[target] || {};
    }
}
