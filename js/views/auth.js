// Authentication Views - Sign Up and Login
class AuthView {
    constructor(authManager, onAuthSuccess) {
        this.authManager = authManager;
        this.onAuthSuccess = onAuthSuccess;
    }

    render(container) {
        // Check if user is already authenticated
        if (this.authManager.isAuthenticated()) {
            this.onAuthSuccess();
            return;
        }

        // Check if this is a returning user on a new device
        const accounts = this.authManager.getAllAccounts();
        const hasAccounts = Object.keys(accounts).length > 0;

        if (hasAccounts) {
            this.renderLogin(container);
        } else {
            this.renderSignUp(container);
        }
    }

    renderSignUp(container) {
        container.innerHTML = `
            <div class="auth-container" style="
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
                padding: 2rem;
            ">
                <div class="auth-card" style="
                    background: var(--bg-card);
                    border-radius: 20px;
                    padding: 3rem;
                    max-width: 500px;
                    width: 100%;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                ">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">🎓</div>
                        <h1 style="margin-bottom: 0.5rem; color: var(--text-main);">Welcome to StudyBuddy!</h1>
                        <p class="text-muted">Create your account to get started</p>
                    </div>

                    <form id="signup-form">
                        <div class="form-group">
                            <label>Display Name</label>
                            <input type="text" id="signup-username" placeholder="Enter your name" class="input-premium" required autofocus>
                        </div>

                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" id="signup-password" placeholder="Create a password" class="input-premium" required minlength="6">
                            <div id="password-strength" style="margin-top: 0.5rem; font-size: 0.85rem;"></div>
                        </div>

                        <div class="form-group">
                            <label>Confirm Password</label>
                            <input type="password" id="signup-password-confirm" placeholder="Confirm your password" class="input-premium" required>
                            <div id="password-match" style="margin-top: 0.5rem; font-size: 0.85rem;"></div>
                        </div>

                        <div class="form-group">
                            <label>Choose Avatar</label>
                            <div style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; margin-top: 0.5rem;">
                                ${['🎓', '👨‍🎓', '👩‍🎓', '🧑‍🎓', '🤓', '📚', '⭐', '🌟'].map(avatar => `
                                    <button type="button" class="avatar-option ${avatar === '🎓' ? 'selected' : ''}" data-avatar="${avatar}" style="
                                        font-size: 2rem;
                                        width: 60px;
                                        height: 60px;
                                        border: 3px solid var(--border);
                                        border-radius: 50%;
                                        background: var(--bg-body);
                                        cursor: pointer;
                                        transition: all 0.2s;
                                    ">${avatar}</button>
                                `).join('')}
                            </div>
                        </div>

                        <div id="signup-error" style="color: var(--danger); margin-bottom: 1rem; font-size: 0.9rem; display: none;"></div>

                        <button type="submit" class="btn btn-primary btn-block" style="margin-top: 1rem; padding: 1rem; font-size: 1.1rem; font-weight: 700;">
                            Create Account
                        </button>

                        <p style="text-align: center; margin-top: 1.5rem; font-size: 0.9rem; color: var(--text-muted);">
                            Already have an account? <a href="#" id="switch-to-login" style="color: var(--primary); text-decoration: none; font-weight: 600;">Log in</a>
                        </p>
                    </form>
                </div>
            </div>
        `;

        this.attachSignUpListeners();
    }

    renderLogin(container) {
        container.innerHTML = `
            <div class="auth-container" style="
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
                padding: 2rem;
            ">
                <div class="auth-card" style="
                    background: var(--bg-card);
                    border-radius: 20px;
                    padding: 3rem;
                    max-width: 500px;
                    width: 100%;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                ">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">🎓</div>
                        <h1 style="margin-bottom: 0.5rem; color: var(--text-main);">Welcome Back!</h1>
                        <p class="text-muted">Log in to continue your studies</p>
                    </div>

                    <form id="login-form">
                        <div class="form-group">
                            <label>Username</label>
                            <input type="text" id="login-username" placeholder="Enter your username" class="input-premium" required autofocus>
                        </div>

                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" id="login-password" placeholder="Enter your password" class="input-premium" required>
                        </div>

                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                            <input type="checkbox" id="remember-device" checked style="width: auto;">
                            <label for="remember-device" style="font-size: 0.9rem; color: var(--text-muted); cursor: pointer;">
                                Remember me on this device
                            </label>
                        </div>

                        <div id="login-error" style="color: var(--danger); margin-bottom: 1rem; font-size: 0.9rem; display: none;"></div>

                        <button type="submit" class="btn btn-primary btn-block" style="margin-top: 1rem; padding: 1rem; font-size: 1.1rem; font-weight: 700;">
                            Log In
                        </button>

                        <p style="text-align: center; margin-top: 1.5rem; font-size: 0.9rem; color: var(--text-muted);">
                            Don't have an account? <a href="#" id="switch-to-signup" style="color: var(--primary); text-decoration: none; font-weight: 600;">Sign up</a>
                        </p>
                    </form>
                </div>
            </div>
        `;

        this.attachLoginListeners();
    }

    attachSignUpListeners() {
        const form = document.getElementById('signup-form');
        const passwordInput = document.getElementById('signup-password');
        const confirmInput = document.getElementById('signup-password-confirm');
        const strengthDiv = document.getElementById('password-strength');
        const matchDiv = document.getElementById('password-match');
        const errorDiv = document.getElementById('signup-error');
        let selectedAvatar = '🎓';

        // Avatar selection
        document.querySelectorAll('.avatar-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.avatar-option').forEach(b => {
                    b.classList.remove('selected');
                    b.style.borderColor = 'var(--border)';
                });
                btn.classList.add('selected');
                btn.style.borderColor = 'var(--primary)';
                selectedAvatar = btn.dataset.avatar;
            });
        });

        // Password strength checker
        passwordInput.addEventListener('input', () => {
            const password = passwordInput.value;
            if (password.length > 0) {
                const strength = this.authManager.checkPasswordStrength(password);
                const colors = {
                    weak: 'var(--danger)',
                    fair: '#f59e0b',
                    good: '#10b981',
                    strong: 'var(--success)'
                };
                strengthDiv.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="flex: 1; height: 4px; background: var(--bg-body); border-radius: 2px; overflow: hidden;">
                            <div style="height: 100%; width: ${(strength.strength / 4) * 100}%; background: ${colors[strength.level]}; transition: all 0.3s;"></div>
                        </div>
                        <span style="color: ${colors[strength.level]}; font-weight: 600; text-transform: capitalize;">${strength.level}</span>
                    </div>
                    ${strength.feedback.length > 0 ? `<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">${strength.feedback[0]}</div>` : ''}
                `;
            } else {
                strengthDiv.innerHTML = '';
            }
        });

        // Password match checker
        confirmInput.addEventListener('input', () => {
            const password = passwordInput.value;
            const confirm = confirmInput.value;
            if (confirm.length > 0) {
                if (password === confirm) {
                    matchDiv.innerHTML = '<span style="color: var(--success);">✓ Passwords match</span>';
                    confirmInput.style.borderColor = 'var(--success)';
                } else {
                    matchDiv.innerHTML = '<span style="color: var(--danger);">✗ Passwords do not match</span>';
                    confirmInput.style.borderColor = 'var(--danger)';
                }
            } else {
                matchDiv.innerHTML = '';
                confirmInput.style.borderColor = '';
            }
        });

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorDiv.style.display = 'none';

            const username = document.getElementById('signup-username').value.trim();
            const password = passwordInput.value;
            const confirm = confirmInput.value;

            if (password !== confirm) {
                errorDiv.textContent = 'Passwords do not match';
                errorDiv.style.display = 'block';
                return;
            }

            if (password.length < 6) {
                errorDiv.textContent = 'Password must be at least 6 characters';
                errorDiv.style.display = 'block';
                return;
            }

            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Creating Account...';
            submitBtn.disabled = true;

            const result = await this.authManager.signUp(username, password, selectedAvatar);
            if (result.success) {
                this.onAuthSuccess();
            } else {
                errorDiv.textContent = result.message;
                errorDiv.style.display = 'block';
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });

        // Switch to login
        document.getElementById('switch-to-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.renderLogin(document.getElementById('app-view'));
        });
    }

    attachLoginListeners() {
        const form = document.getElementById('login-form');
        const errorDiv = document.getElementById('login-error');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorDiv.style.display = 'none';

            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;
            const rememberDevice = document.getElementById('remember-device').checked;

            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Logging in...';
            submitBtn.disabled = true;

            const result = await this.authManager.login(username, password, rememberDevice);
            if (result.success) {
                this.onAuthSuccess();
            } else {
                errorDiv.textContent = result.message;
                errorDiv.style.display = 'block';
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });

        // Switch to signup
        document.getElementById('switch-to-signup')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.renderSignUp(document.getElementById('app-view'));
        });
    }
}

// Export for use in other files
window.AuthView = AuthView;

