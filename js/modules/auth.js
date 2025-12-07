// Authentication Manager - Handles user authentication and sessions
class AuthManager {
    constructor() {
        this.sessionKey = 'sb_auth_session';
        this.deviceKey = 'sb_device_id';
        this.init();
    }

    init() {
        // Generate or retrieve device ID
        if (!localStorage.getItem(this.deviceKey)) {
            localStorage.setItem(this.deviceKey, this.generateDeviceId());
        }
    }

    generateDeviceId() {
        return 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getDeviceId() {
        return localStorage.getItem(this.deviceKey);
    }

    // Simple password hashing (for production, use bcrypt or similar)
    hashPassword(password) {
        // Simple hash function - in production, use a proper hashing library
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36);
    }

    // Check password strength
    checkPasswordStrength(password) {
        let strength = 0;
        let feedback = [];

        if (password.length >= 8) strength++;
        else feedback.push('Use at least 8 characters');

        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        else feedback.push('Mix uppercase and lowercase letters');

        if (/\d/.test(password)) strength++;
        else feedback.push('Add numbers');

        if (/[^a-zA-Z0-9]/.test(password)) strength++;
        else feedback.push('Add special characters');

        return {
            strength: strength,
            level: strength <= 1 ? 'weak' : strength <= 2 ? 'fair' : strength <= 3 ? 'good' : 'strong',
            feedback: feedback
        };
    }

    // Create new account
    signUp(username, password, avatar = '🎓') {
        // Validate input
        if (!username || username.trim().length < 2) {
            return { success: false, message: 'Username must be at least 2 characters' };
        }

        if (!password || password.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters' };
        }

        // Check if username already exists
        const accounts = this.getAllAccounts();
        const existingAccount = Object.values(accounts).find(acc => 
            acc.username && acc.username.toLowerCase() === username.toLowerCase()
        );

        if (existingAccount) {
            return { success: false, message: 'Username already exists. Please choose another.' };
        }

        // Create account
        const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const hashedPassword = this.hashPassword(password);
        const deviceId = this.getDeviceId();

        const account = {
            userId: userId,
            username: username.trim(),
            passwordHash: hashedPassword,
            avatar: avatar,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            devices: [deviceId], // Track devices
            user: {
                name: username.trim(),
                avatar: avatar,
                level: 1,
                xp: 0,
                streak: 0,
                lastLogin: new Date().toISOString().split('T')[0],
                userId: userId
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
            },
            studyGroups: [],
            friends: [],
            leaderboardSettings: {
                showOnGlobal: true
            }
        };

        // Save account
        accounts[userId] = account;
        this.saveAccounts(accounts);

        // Create session
        this.createSession(userId, deviceId);

        return { success: true, userId: userId, account: account };
    }

    // Login
    login(username, password, rememberDevice = true) {
        if (!username || !password) {
            return { success: false, message: 'Please enter both username and password' };
        }

        const accounts = this.getAllAccounts();
        const account = Object.values(accounts).find(acc => 
            acc.username && acc.username.toLowerCase() === username.toLowerCase()
        );

        if (!account) {
            return { success: false, message: 'Invalid username or password' };
        }

        // Verify password
        const hashedPassword = this.hashPassword(password);
        if (account.passwordHash !== hashedPassword) {
            return { success: false, message: 'Invalid username or password' };
        }

        // Update last login
        account.lastLogin = new Date().toISOString();
        const deviceId = this.getDeviceId();
        
        // Add device if not already tracked
        if (!account.devices) account.devices = [];
        if (!account.devices.includes(deviceId) && rememberDevice) {
            account.devices.push(deviceId);
        }

        this.saveAccounts(this.getAllAccounts());

        // Create session
        this.createSession(account.userId, deviceId);

        return { success: true, userId: account.userId, account: account };
    }

    // Create session
    createSession(userId, deviceId) {
        const session = {
            userId: userId,
            deviceId: deviceId,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        };
        localStorage.setItem(this.sessionKey, JSON.stringify(session));
    }

    // Check if user is authenticated
    isAuthenticated() {
        const session = this.getSession();
        if (!session) return false;

        // Check if session is expired
        if (new Date(session.expiresAt) < new Date()) {
            this.logout();
            return false;
        }

        // Verify account still exists
        const accounts = this.getAllAccounts();
        const account = accounts[session.userId];
        if (!account) {
            this.logout();
            return false;
        }

        // Check if device is remembered
        const deviceId = this.getDeviceId();
        if (account.devices && account.devices.includes(deviceId)) {
            return true;
        }

        return false;
    }

    // Get current session
    getSession() {
        try {
            const session = localStorage.getItem(this.sessionKey);
            return session ? JSON.parse(session) : null;
        } catch (e) {
            return null;
        }
    }

    // Get current user
    getCurrentUser() {
        const session = this.getSession();
        if (!session) return null;

        const accounts = this.getAllAccounts();
        return accounts[session.userId] || null;
    }

    // Logout
    logout() {
        localStorage.removeItem(this.sessionKey);
        // Note: We don't remove deviceId so user can still be remembered if they log back in
    }

    // Change password
    changePassword(userId, currentPassword, newPassword) {
        const accounts = this.getAllAccounts();
        const account = accounts[userId];

        if (!account) {
            return { success: false, message: 'Account not found' };
        }

        // Verify current password
        const currentHash = this.hashPassword(currentPassword);
        if (account.passwordHash !== currentHash) {
            return { success: false, message: 'Current password is incorrect' };
        }

        // Validate new password
        if (!newPassword || newPassword.length < 6) {
            return { success: false, message: 'New password must be at least 6 characters' };
        }

        // Update password
        account.passwordHash = this.hashPassword(newPassword);
        this.saveAccounts(accounts);

        return { success: true, message: 'Password changed successfully' };
    }

    // Update profile
    updateProfile(userId, updates) {
        const accounts = this.getAllAccounts();
        const account = accounts[userId];

        if (!account) {
            return { success: false, message: 'Account not found' };
        }

        if (updates.username) {
            // Check if new username is available
            const existingAccount = Object.values(accounts).find(acc => 
                acc.userId !== userId && 
                acc.username && 
                acc.username.toLowerCase() === updates.username.toLowerCase()
            );

            if (existingAccount) {
                return { success: false, message: 'Username already taken' };
            }

            account.username = updates.username.trim();
            if (account.user) {
                account.user.name = updates.username.trim();
            }
        }

        if (updates.avatar) {
            account.avatar = updates.avatar;
            if (account.user) {
                account.user.avatar = updates.avatar;
            }
        }

        this.saveAccounts(accounts);
        return { success: true, account: account };
    }

    // Storage methods
    getAllAccounts() {
        try {
            const raw = localStorage.getItem('sb_accounts');
            if (!raw || raw === 'undefined' || raw === 'null') return {};
            return JSON.parse(raw);
        } catch (e) {
            console.warn('Error parsing accounts:', e);
            return {};
        }
    }

    saveAccounts(accounts) {
        localStorage.setItem('sb_accounts', JSON.stringify(accounts));
    }
}

// Export for use in other files
window.AuthManager = AuthManager;

