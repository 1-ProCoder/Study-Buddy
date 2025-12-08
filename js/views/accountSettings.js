// Account Settings View
class AccountSettingsView {
    constructor(store, authManager) {
        this.store = store;
        this.authManager = authManager;
    }

    async render(container) {
        const currentUser = this.authManager.getCurrentUser();
        const appUser = this.store.getUser ? this.store.getUser() : null;
        if (!currentUser && !appUser) {
            container.innerHTML = '<div class="card"><p>Please log in to view account settings.</p></div>';
            return;
        }

        container.innerHTML = `
            <div class="account-settings-container animate-fade-in">
                <div class="header-actions">
                    <h2>Account Settings</h2>
                </div>

                <div class="settings-sections" style="display: flex; flex-direction: column; gap: 2rem; margin-top: 2rem;">
                    <!-- Profile Section -->
                    <div class="card">
                        <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span>👤</span> Profile Information
                        </h3>
                        
                        <div class="form-group">
                            <label>Display Name</label>
                            <input type="text" id="profile-username" value="${(appUser?.name || currentUser?.username) || ''}" class="input-premium">
                            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">
                                This is your username shown on leaderboards and in study groups
                            </p>
                        </div>

                        <div class="form-group">
                            <label>Avatar</label>
                            <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 0.5rem;">
                                ${['🎓', '👨‍🎓', '👩‍🎓', '🧑‍🎓', '🤓', '📚', '⭐', '🌟', '🔥', '💪', '🎯', '🏆'].map(avatar => `
                                    <button type="button" class="avatar-option-settings ${avatar === (currentUser.avatar || '🎓') ? 'selected' : ''}" data-avatar="${avatar}" style="
                                        font-size: 2rem;
                                        width: 60px;
                                        height: 60px;
                                        border: 3px solid ${avatar === (currentUser.avatar || '🎓') ? 'var(--primary)' : 'var(--border)'};
                                        border-radius: 50%;
                                        background: var(--bg-body);
                                        cursor: pointer;
                                        transition: all 0.2s;
                                    ">${avatar}</button>
                                `).join('')}
                            </div>
                        </div>

                        <button class="btn btn-primary" id="save-profile-btn" style="margin-top: 1rem;">
                            Save Profile Changes
                        </button>
                    </div>

                    <!-- Password Section -->
                    <div class="card">
                        <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span>🔒</span> Change Password
                        </h3>
                        
                        <div class="form-group">
                            <label>Current Password</label>
                            <input type="password" id="current-password" class="input-premium" placeholder="Enter current password">
                        </div>

                        <div class="form-group">
                            <label>New Password</label>
                            <input type="password" id="new-password" class="input-premium" placeholder="Enter new password" minlength="6">
                            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">
                                Password must be at least 6 characters long
                            </p>
                        </div>

                        <div class="form-group">
                            <label>Confirm New Password</label>
                            <input type="password" id="confirm-new-password" class="input-premium" placeholder="Confirm new password">
                            <div id="password-change-match" style="margin-top: 0.5rem; font-size: 0.85rem;"></div>
                        </div>

                        <div id="password-change-error" style="color: var(--danger); margin-bottom: 1rem; font-size: 0.9rem; display: none;"></div>
                        <div id="password-change-success" style="color: var(--success); margin-bottom: 1rem; font-size: 0.9rem; display: none;"></div>

                        <button class="btn btn-primary" id="change-password-btn" style="margin-top: 1rem;">
                            Change Password
                        </button>
                    </div>

                    <!-- Account Info Section -->
                    <div class="card">
                        <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span>ℹ️</span> Account Information
                        </h3>
                        
                        <div style="display: flex; flex-direction: column; gap: 1rem;">
                            <div>
                                <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.25rem;">Account Created</div>
                                <div style="font-weight: 600;">${(currentUser?.createdAt || appUser?.createdAt) ? new Date(currentUser?.createdAt || appUser?.createdAt).toLocaleDateString() : 'Unknown'}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.25rem;">Last Login</div>
                                <div style="font-weight: 600;">${(currentUser?.lastLogin || appUser?.lastLogin) ? new Date(currentUser?.lastLogin || appUser?.lastLogin).toLocaleDateString() : 'Never'}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.25rem;">User ID</div>
                                <div style="font-family: monospace; font-size: 0.85rem; color: var(--text-muted);">${currentUser?.userId || appUser?.userId || 'Unknown'}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Danger Zone -->
                    <div class="card" style="border: 2px solid var(--danger);">
                        <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; color: var(--danger);">
                            <span>⚠️</span> Danger Zone
                        </h3>
                        
                        <p style="color: var(--text-muted); margin-bottom: 1rem;">
                            Logging out will clear your session on this device. You'll need to log in again on this device.
                        </p>

                        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                            <button class="btn" id="logout-btn" style="
                                background: var(--danger);
                                color: white;
                                border: none;
                            ">
                                Log Out
                            </button>

                            <button class="btn" id="delete-account-btn" style="
                                background: transparent;
                                color: var(--danger);
                                border: 1px solid var(--danger);
                            ">
                                Permanently Delete Account
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    attachEventListeners() {
        let selectedAvatar = this.authManager.getCurrentUser()?.avatar || '🎓';

        // Avatar selection
        document.querySelectorAll('.avatar-option-settings').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.avatar-option-settings').forEach(b => {
                    b.classList.remove('selected');
                    b.style.borderColor = 'var(--border)';
                });
                btn.classList.add('selected');
                btn.style.borderColor = 'var(--primary)';
                selectedAvatar = btn.dataset.avatar;
            });
        });

        // Save profile
        document.getElementById('save-profile-btn')?.addEventListener('click', () => {
            const username = document.getElementById('profile-username').value.trim();
            const result = this.authManager.updateProfile(this.authManager.getCurrentUser().userId, {
                username: username,
                avatar: selectedAvatar
            });

            if (result.success) {
                // Update store
                this.store.state.user = { ...this.store.state.user, name: username, avatar: selectedAvatar };
                this.store.save('user');
                
                // Show success message
                const btn = document.getElementById('save-profile-btn');
                const originalText = btn.textContent;
                btn.textContent = '✓ Saved!';
                btn.style.background = 'var(--success)';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                }, 2000);
            } else {
                alert(result.message);
            }
        });

        // Password change match checker
        document.getElementById('confirm-new-password')?.addEventListener('input', () => {
            const newPass = document.getElementById('new-password').value;
            const confirm = document.getElementById('confirm-new-password').value;
            const matchDiv = document.getElementById('password-change-match');
            
            if (confirm.length > 0) {
                if (newPass === confirm) {
                    matchDiv.innerHTML = '<span style="color: var(--success);">✓ Passwords match</span>';
                } else {
                    matchDiv.innerHTML = '<span style="color: var(--danger);">✗ Passwords do not match</span>';
                }
            } else {
                matchDiv.innerHTML = '';
            }
        });

        // Change password
        document.getElementById('change-password-btn')?.addEventListener('click', () => {
            const currentPass = document.getElementById('current-password').value;
            const newPass = document.getElementById('new-password').value;
            const confirmPass = document.getElementById('confirm-new-password').value;
            const errorDiv = document.getElementById('password-change-error');
            const successDiv = document.getElementById('password-change-success');

            errorDiv.style.display = 'none';
            successDiv.style.display = 'none';

            if (!currentPass || !newPass || !confirmPass) {
                errorDiv.textContent = 'Please fill in all password fields';
                errorDiv.style.display = 'block';
                return;
            }

            if (newPass !== confirmPass) {
                errorDiv.textContent = 'New passwords do not match';
                errorDiv.style.display = 'block';
                return;
            }

            if (newPass.length < 6) {
                errorDiv.textContent = 'New password must be at least 6 characters';
                errorDiv.style.display = 'block';
                return;
            }

            const result = this.authManager.changePassword(
                this.authManager.getCurrentUser().userId,
                currentPass,
                newPass
            );

            if (result.success) {
                successDiv.textContent = result.message;
                successDiv.style.display = 'block';
                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-new-password').value = '';
            } else {
                errorDiv.textContent = result.message;
                errorDiv.style.display = 'block';
            }
        });

        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to log out? You will need to log in again on this device.')) {
                this.authManager.logout();
                location.reload();
            }
        });

        // Delete Account
        document.getElementById('delete-account-btn')?.addEventListener('click', () => {
            const current = this.authManager.getCurrentUser();
            if (!current) return;

            const firstConfirm = confirm('This will permanently delete your account, remove you from leaderboards and study groups, and log you out. This cannot be undone. Continue?');
            if (!firstConfirm) return;
            const secondConfirm = confirm('Are you absolutely sure? This action is permanent.');
            if (!secondConfirm) return;

            const result = this.authManager.deleteAccount(current.userId);
            if (result.success) {
                // Clear StudyBuddy local data for this user on this device
                try {
                    Object.keys(localStorage).forEach(key => {
                        if (key.startsWith('studybuddy_')) {
                            localStorage.removeItem(key);
                        }
                    });
                } catch (e) {
                    console.warn('Error clearing StudyBuddy data after account delete:', e);
                }

                alert('Your account has been deleted.');
                location.reload();
            } else {
                alert(result.message || 'Failed to delete account.');
            }
        });
    }
}

// Export for use in other files
window.AccountSettingsView = AccountSettingsView;

