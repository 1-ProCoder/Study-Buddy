// Firebase Authentication Manager - Replaces AuthManager
class FirebaseAuthManager {
    constructor() {
        this.firebaseService = window.firebaseService;
        this.currentUser = null;
        this.init();
    }

    async init() {
        await this.firebaseService.initialize();
        
        // Listen to auth state changes
        this.firebaseService.onAuthStateChanged((user) => {
            this.currentUser = user;
            if (user) {
                this.loadUserProfile(user.uid);
            } else {
                this.userProfile = null;
            }
        });
        
        // Check current auth state immediately
        const currentUser = this.firebaseService.getCurrentUser();
        if (currentUser) {
            this.currentUser = currentUser;
            await this.loadUserProfile(currentUser.uid);
        }
    }

    async loadUserProfile(userId) {
        const result = await this.firebaseService.getUserData(userId);
        if (result.success) {
            this.userProfile = result.data;
        }
    }

    // Sign Up
    async signUp(username, password, avatar = '🎓') {
        const result = await this.firebaseService.signUp(username, password, username, avatar);
        if (result.success) {
            this.currentUser = result.user;
            await this.loadUserProfile(result.userId);
        }
        return result;
    }

    // Login
    async login(username, password) {
        const result = await this.firebaseService.login(username, password);
        if (result.success) {
            this.currentUser = result.user;
            await this.loadUserProfile(result.user.uid);
        }
        return result;
    }

    // Logout
    async logout() {
        const result = await this.firebaseService.logout();
        if (result.success) {
            this.currentUser = null;
            this.userProfile = null;
        }
        return result;
    }

    // Send password reset
    async sendPasswordReset(username) {
        return await this.firebaseService.sendPasswordResetEmail(username);
    }

    // Check if authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Get current user
    getCurrentUser() {
        if (!this.currentUser) return null;
        
        return {
            userId: this.currentUser.uid,
            username: this.userProfile?.username || this.currentUser.email?.split('@')[0] || 'User',
            displayName: this.userProfile?.displayName || this.userProfile?.username || 'User',
            avatar: this.userProfile?.avatar || '🎓',
            email: this.currentUser.email,
            ...this.userProfile
        };
    }

    // Update profile
    async updateProfile(updates) {
        if (!this.currentUser) return { success: false, message: 'Not authenticated' };
        
        const result = await this.firebaseService.updateUserData(this.currentUser.uid, updates);
        if (result.success) {
            await this.loadUserProfile(this.currentUser.uid);
        }
        return result;
    }

    // Change password
    async changePassword(currentPassword, newPassword) {
        if (!this.currentUser) return { success: false, message: 'Not authenticated' };
        
        try {
            // Re-authenticate user
            const email = this.currentUser.email;
            const credential = firebase.auth.EmailAuthProvider.credential(email, currentPassword);
            await this.currentUser.reauthenticateWithCredential(credential);
            
            // Update password
            await this.currentUser.updatePassword(newPassword);
            return { success: true, message: 'Password changed successfully' };
        } catch (error) {
            return { success: false, message: this.firebaseService.getErrorMessage(error) };
        }
    }

    // Get all accounts (for backward compatibility)
    getAllAccounts() {
        // Not applicable with Firebase - returns empty object
        return {};
    }

    // Check password strength
    checkPasswordStrength(password) {
        if (!password) {
            return { strength: 0, level: 'empty', feedback: ['Password is required'] };
        }
        if (password.length < 6) {
            return { strength: 1, level: 'weak', feedback: ['Password must be at least 6 characters'] };
        }
        if (password.length < 8) {
            return { strength: 2, level: 'fair', feedback: ['Password is acceptable'] };
        }
        if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
            return { strength: 4, level: 'strong', feedback: [] };
        }
        return { strength: 3, level: 'good', feedback: [] };
    }
}

// Export for use in other files
window.FirebaseAuthManager = FirebaseAuthManager;

