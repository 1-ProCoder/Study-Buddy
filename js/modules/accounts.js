// Account Manager - Handles multiple user accounts
class AccountManager {
    constructor() {
        this.currentAccountId = localStorage.getItem('sb_current_account');
        this.initializeAccounts();
    }

    initializeAccounts() {
        // Get all accounts
        const accounts = this.getAllAccounts();

        // If no current account is set, prompt for login/create
        if (!this.currentAccountId || !accounts[this.currentAccountId]) {
            this.currentAccountId = null;
        }
    }

    getAllAccounts() {
        try {
            const raw = localStorage.getItem('sb_accounts');
            if (!raw || raw === 'undefined' || raw === 'null') return {};
            return JSON.parse(raw);
        } catch (e) {
            console.warn('Error parsing accounts from localStorage:', e);
            return {};
        }
    }

    saveAccounts(accounts) {
        localStorage.setItem('sb_accounts', JSON.stringify(accounts));
    }

    createAccount(username, avatar = '🎓') {
        const accounts = this.getAllAccounts();
        const accountId = 'acc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        // Check if username already exists
        const existingAccount = Object.values(accounts).find(acc => acc.username === username);
        if (existingAccount) {
            return { success: false, message: 'Username already exists!' };
        }

        accounts[accountId] = {
            accountId: accountId,
            username: username,
            avatar: avatar,
            createdAt: new Date().toISOString(),
            user: {
                name: username,
                avatar: avatar,
                level: 1,
                xp: 0,
                streak: 0,
                lastLogin: new Date().toISOString().split('T')[0],
                userId: accountId
            },
            subjects: [],
            flashcards: [],
            sessions: [],
            achievements: [],
            countdowns: [],
            visionBoard: [],
            badges: [],
            settings: {
                theme: 'light',
                soundEnabled: true,
                fontSize: 'medium'
            }
        };

        this.saveAccounts(accounts);
        this.currentAccountId = accountId;
        localStorage.setItem('sb_current_account', accountId);

        return { success: true, accountId: accountId };
    }

    loginAccount(accountId) {
        const accounts = this.getAllAccounts();
        if (!accounts[accountId]) {
            return { success: false, message: 'Account not found!' };
        }

        this.currentAccountId = accountId;
        localStorage.setItem('sb_current_account', accountId);

        // Update last login
        accounts[accountId].user.lastLogin = new Date().toISOString().split('T')[0];
        this.saveAccounts(accounts);

        return { success: true };
    }

    getCurrentAccount() {
        if (!this.currentAccountId) return null;
        const accounts = this.getAllAccounts();
        return accounts[this.currentAccountId] || null;
    }

    updateCurrentAccount(data) {
        if (!this.currentAccountId) return;
        const accounts = this.getAllAccounts();
        if (accounts[this.currentAccountId]) {
            // Deep merge to properly update nested objects like 'user'
            const currentAccount = accounts[this.currentAccountId];
            Object.keys(data).forEach(key => {
                if (typeof data[key] === 'object' && data[key] !== null && !Array.isArray(data[key])) {
                    // Deep merge for objects
                    currentAccount[key] = { ...currentAccount[key], ...data[key] };
                } else {
                    // Direct assignment for primitives and arrays
                    currentAccount[key] = data[key];
                }
            });
            accounts[this.currentAccountId] = currentAccount;
            this.saveAccounts(accounts);
        }
    }

    logout() {
        this.currentAccountId = null;
        localStorage.removeItem('sb_current_account');
    }

    getAllUserProfiles() {
        const accounts = this.getAllAccounts();
        return Object.values(accounts)
            .filter(acc => acc && acc.accountId) // Filter out invalid accounts
            .map(acc => {
                // Safely access user object with fallbacks
                const user = acc.user || {};
                const username = acc.username || 'Unknown';
                
                return {
                    userId: user.userId || acc.accountId, // Use userId from user object, fallback to accountId
                    accountId: acc.accountId,
                    name: user.name || username, // Use name from user object, fallback to username
                    username: username,
                    avatar: user.avatar || acc.avatar || '🎓', // Use avatar from user object, fallback to account avatar
                    xp: user.xp || 0,
                    level: user.level || 1,
                    streak: user.streak || 0,
                    totalStudyMinutes: Math.round((acc.sessions || []).reduce((sum, s) => sum + (s.duration || 0), 0))
                };
            });
    }
}

// Export for use in other files
window.AccountManager = AccountManager;
