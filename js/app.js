// Check if Firebase is configured
const useFirebase = window.firebaseConfig && 
                    window.firebaseConfig.apiKey !== "YOUR_API_KEY" &&
                    typeof firebase !== 'undefined';

// Initialize Firebase Service (must be done before auth/store)
if (useFirebase && typeof FirebaseService !== 'undefined') {
    window.firebaseService = new FirebaseService();
}

// Initialize Auth Manager (Firebase or localStorage)
let authManager;
let store;
let accountManager;

if (useFirebase && typeof FirebaseAuthManager !== 'undefined') {
    // Use Firebase
    console.log('Initializing Firebase backend...');
    authManager = new FirebaseAuthManager();
    store = new FirebaseStore(window.firebaseService, authManager);
    accountManager = new AccountManager(); // Keep for backward compatibility
} else {
    // Use localStorage (fallback)
    console.log('Using localStorage backend (Firebase not configured)');
    authManager = new AuthManager();
    accountManager = new AccountManager();
    store = new Store();
}

// Initialize Ad Manager
const adManager = new AdManager();

// Initialize Voice Manager
const voiceManager = new VoiceManager(store, null); // Router passed later

// Theme handling
const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('theme-btn');
    const btnMobile = document.getElementById('theme-btn-mobile');

    const themeNames = {
        'light': '☀️ Light Mode',
        'dark': '🌙 Dark Mode',
        'midnight': '🌌 Midnight',
        'sunset': '🌅 Sunset',
        'forest': '🌲 Forest'
    };

    const themeIcons = {
        'light': '☀️',
        'dark': '🌙',
        'midnight': '🌌',
        'sunset': '🌅',
        'forest': '🌲'
    };

    if (btn) {
        btn.textContent = themeNames[theme] || '🎨 Theme';
    }

    if (btnMobile) {
        btnMobile.textContent = themeIcons[theme] || '🎨';
    }
};

const applyAccessibility = () => {
    const settings = store.getSettings();
    if (settings.dyslexiaFont) {
        document.body.classList.add('font-dyslexia');
    } else {
        document.body.classList.remove('font-dyslexia');
    }
};

applyTheme(store.getSettings().theme);
applyAccessibility();

// Check authentication and initialize app
const initializeApp = async () => {
    const container = document.getElementById('app-view');
    const loadingScreen = document.getElementById('loading-screen');
    if (!container) return;

    // Show loading screen
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
    }

    try {
        // Initialize Firebase if using it
        if (useFirebase) {
            try {
                await window.firebaseService.initialize();
                await authManager.init(); // Initialize auth manager to set up listeners
                
                // Set up auth state listener for auto-login
                window.firebaseService.onAuthStateChanged(async (user) => {
                    if (user) {
                        // User is authenticated, load data
                        if (store.initialize) {
                            await store.initialize();
                        }
                        loadUserData();
                        initializeMainApp();
                    } else {
                        // User is not authenticated, show login screen
                        if (typeof showLoginScreen === 'function') {
                            showLoginScreen();
                        } else {
                            initializeMainApp();
                        }
                    }
                });
            } catch (error) {
                console.error('Firebase initialization failed:', error);
                // Fallback to localStorage
                initializeMainApp();
            }
        } else {
            // Direct initialization for localStorage
            initializeMainApp();
        }
    } catch (error) {
        console.error('App initialization error:', error);
        // Ensure loading screen is hidden even on error
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }
};

// Load user data from authenticated account
const loadUserData = () => {
    const currentUser = authManager.getCurrentUser();
    if (!currentUser) return;

    // Update store with user data
    store.state.user = currentUser.user || store.state.user;
    store.state.subjects = currentUser.subjects || [];
    store.state.flashcards = currentUser.flashcards || [];
    store.state.sessions = currentUser.sessions || [];
    store.state.achievements = currentUser.achievements || [];
    store.state.countdowns = currentUser.countdowns || [];
    store.state.visionBoard = currentUser.visionBoard || [];
    store.state.badges = currentUser.badges || [];
    store.state.settings = currentUser.settings || store.state.settings;
    
    // Update account manager for backward compatibility
    accountManager.currentAccountId = currentUser.userId;
    localStorage.setItem('sb_current_account', currentUser.userId);
};

// Initialize main app (after authentication)
const initializeMainApp = async () => {
    const loadingScreen = document.getElementById('loading-screen');
    
    updateGreeting();
    applyTheme(store.getSettings().theme);
    applyAccessibility();
    
    // Initialize leaderboard for current user
    if (authManager.isAuthenticated()) {
        const currentUser = authManager.getCurrentUser();
        if (currentUser) {
            if (useFirebase && typeof window.FirebaseLeaderboardManager !== 'undefined') {
                const leaderboardManager = new FirebaseLeaderboardManager(store, authManager);
                await leaderboardManager.initializeUser(currentUser.userId, currentUser.username, currentUser.avatar);
                await leaderboardManager.syncCurrentUser();
            } else if (typeof window.LeaderboardManager !== 'undefined') {
                const leaderboardManager = new LeaderboardManager(store, authManager);
                leaderboardManager.initializeUser(currentUser.userId, currentUser.username, currentUser.avatar);
                leaderboardManager.syncCurrentUser();
            }
        }
    }
    
    // Initialize Router
    initializeRouter();
};

// Prompt for account login/creation (DEPRECATED - kept for backward compatibility)
const promptForAccount = () => {
    // This is now handled by initializeApp
    return;

    const allAccounts = accountManager.getAllAccounts();
    const accountsList = Object.values(allAccounts);

    const html = `
        <div id="account-modal" class="modal">
            <div class="modal-backdrop"></div>
            <div class="modal-content-premium" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>👤 Welcome to StudyBuddy!</h3>
                </div>
                <div class="modal-body" style="text-align: center;">
                    ${accountsList.length > 0 ? `
                        <h4 style="margin-bottom: 1rem;">Select Your Account</h4>
                        <div style="margin-bottom: 1.5rem;">
                            ${accountsList.map(acc => `
                                <div class="account-item" data-account-id="${acc.accountId}" style="
                                    padding: 1rem;
                                    margin-bottom: 0.5rem;
                                    border: 2px solid var(--border);
                                    border-radius: 8px;
                                    cursor: pointer;
                                    display: flex;
                                    align-items: center;
                                    gap: 1rem;
                                    transition: all 0.2s;
                                " onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">
                                    <span style="font-size: 2rem;">${acc.avatar}</span>
                                    <div style="text-align: left; flex: 1;">
                                        <div style="font-weight: 600;">${acc.username}</div>
                                        <div style="font-size: 0.85rem; color: var(--text-muted);">Level ${acc.user.level} • ${acc.user.xp} XP</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <div style="border-top: 1px solid var(--border); padding-top: 1rem; margin-top: 1rem;">
                            <p class="text-muted" style="margin-bottom: 0.5rem;">Or create a new account:</p>
                        </div>
                    ` : `
                        <p class="text-muted" style="margin-bottom: 1rem;">Create your account to get started!</p>
                    `}
                    <input type="text" id="new-username-input" placeholder="Enter your name" style="width: 80%; padding: 0.75rem; font-size: 1rem; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 1rem;" />
                    <button class="btn btn-primary" id="create-account-btn">Create Account</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    const modal = document.getElementById('account-modal');
    const input = document.getElementById('new-username-input');
    const createBtn = document.getElementById('create-account-btn');

    // Handle existing account selection
    document.querySelectorAll('.account-item').forEach(item => {
        item.addEventListener('click', () => {
            const accountId = item.dataset.accountId;
            const result = accountManager.loginAccount(accountId);
            if (result.success) {
                modal.remove();
                location.reload(); // Reload to load the account's data
            }
        });
    });

    // Handle new account creation
    createBtn.addEventListener('click', () => {
        const username = input.value.trim();
        if (username) {
            const result = accountManager.createAccount(username);
            if (result.success) {
                modal.remove();
                location.reload(); // Reload to load the new account's data
            } else {
                alert(result.message);
            }
        }
    });

    input.focus();
};

const updateGreeting = () => {
    const greetEl = document.getElementById('greeting');
    const currentUser = authManager.getCurrentUser();
    if (greetEl && currentUser) {
        greetEl.textContent = `Hello, ${currentUser.username || store.getUser().name}!`;
    } else if (greetEl) {
        greetEl.textContent = `Hello, ${store.getUser().name}!`;
    }
    
    // Update avatar in navbar
    const avatarEl = document.querySelector('.avatar-small');
    if (avatarEl && currentUser) {
        avatarEl.innerHTML = `<span>${currentUser.avatar || '🎓'}</span>`;
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// Theme Picker Modal
const openThemeModal = () => {
    const settings = store.getSettings();
    const currentTheme = settings.theme;
    const isDyslexic = settings.dyslexiaFont || false;
    const themes = [
        { id: 'light', name: 'Light Mode', icon: '☀️', color: '#ffffff', border: '#e2e8f0' },
        { id: 'dark', name: 'Dark Mode', icon: '🌙', color: '#1e293b', border: '#334155' },
        { id: 'midnight', name: 'Midnight', icon: '🌌', color: '#18181b', border: '#27272a' },
        { id: 'sunset', name: 'Sunset', icon: '🌅', color: '#fff1f2', border: '#fecdd3' },
        { id: 'forest', name: 'Forest', icon: '🌲', color: '#064e3b', border: '#14532d' }
    ];
    const html = `
        <div id="theme-modal" class="modal">
            <div class="modal-backdrop"></div>
            <div class="modal-content-premium" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>🎨 Personalize</h3>
                    <button class="modal-close" id="close-theme">×</button>
                </div>
                <div class="modal-body">
                    <h4 style="margin-bottom: 1rem;">Color Theme</h4>
                    <div class="grid-2" style="gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); margin-bottom: 2rem;">
                        ${themes.map(t => `
                            <div class="theme-option ${t.id === currentTheme ? 'active' : ''}" data-theme="${t.id}" 
                                 style="cursor: pointer; border: 2px solid ${t.id === currentTheme ? 'var(--primary)' : 'var(--border)'}; 
                                        border-radius: 12px; padding: 1rem; text-align: center; transition: all 0.2s;
                                        background: ${t.color}; color: ${t.id === 'light' || t.id === 'sunset' ? '#0f172a' : '#f8fafc'};">
                                <div style="font-size: 2rem; margin-bottom: 0.5rem;">${t.icon}</div>
                                <div style="font-weight: 600;">${t.name}</div>
                                ${t.id === currentTheme ? '<div style="color: var(--primary); font-size: 0.8rem; margin-top: 0.5rem;">Active</div>' : ''}
                            </div>
                        `).join('')}
                    </div>
                    <h4 style="margin-bottom: 1rem;">Accessibility</h4>
                    <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--bg-body); border-radius: 12px; border: 1px solid var(--border);">
                        <div style="font-size: 1.5rem;">Aa</div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600;">Dyslexia Friendly Font</div>
                            <div style="font-size: 0.85rem; color: var(--text-muted);">Easier to read font face</div>
                        </div>
                        <label class="switch" style="position: relative; display: inline-block; width: 50px; height: 26px;">
                            <input type="checkbox" id="dyslexia-toggle" ${isDyslexic ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                            <span class="slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--border); transition: .4s; border-radius: 34px;"></span>
                            <span class="slider-circle" style="position: absolute; content: ''; height: 18px; width: 18px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%;"></span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
        <style>
            input:checked + .slider { background-color: var(--primary); }
            input:checked + .slider .slider-circle { transform: translateX(24px); }
        </style>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    const modal = document.getElementById('theme-modal');
    const closeBtn = document.getElementById('close-theme');
    const backdrop = modal.querySelector('.modal-backdrop');
    const closeModal = () => modal.remove();
    closeBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.addEventListener('click', () => {
            const newTheme = opt.dataset.theme;
            store.state.settings.theme = newTheme;
            store.save('settings');
            applyTheme(newTheme);
            closeModal();
        });
    });
    document.getElementById('dyslexia-toggle').addEventListener('change', e => {
        store.state.settings.dyslexiaFont = e.target.checked;
        store.save('settings');
        applyAccessibility();
    });
};

document.getElementById('theme-btn').addEventListener('click', openThemeModal);
const mobileThemeBtn = document.getElementById('theme-btn-mobile');
if (mobileThemeBtn) {
    mobileThemeBtn.addEventListener('click', openThemeModal);
}

// Define Routes
const routes = {
    'dashboard': new DashboardView(store),
    'subjects': new SubjectsView(store),
    'timetable': new TimetableView(store),
    'flashcards': new FlashcardsView(store),
    'pomodoro': new PomodoroView(store),
    'analytics': new AnalyticsView(store),
    'countdowns': new CountdownsView(store),
    'achievements': new AchievementsView(store),
    'vision': new VisionBoardView(store),
    'studyGroups': new StudyGroupsView(store, authManager),
    'leaderboards': new LeaderboardsView(store, authManager),
    'account': new AccountSettingsView(store, authManager)
};

// Initialize Router
let router = null;

// Function to initialize router
const initializeRouter = () => {
    const loadingScreen = document.getElementById('loading-screen');
    
    if (!router && typeof Router !== 'undefined') {
        router = new Router(routes);
        // Connect Router to Voice Manager
        if (voiceManager) {
            voiceManager.router = router;
        }
        
        // Hide loading screen with a smooth transition
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }
    return router;
};

// Initialize router after authentication check
if (authManager.isAuthenticated()) {
    initializeRouter();
}

// Voice Command Button Listener
document.getElementById('voice-command-btn')?.addEventListener('click', () => {
    voiceManager.toggle();
});

// Voice Help Button Listener
document.getElementById('voice-help-btn')?.addEventListener('click', () => {
    voiceManager.showHelp();
});

// Voice Help Button Mobile Listener
document.getElementById('voice-help-btn-mobile')?.addEventListener('click', () => {
    voiceManager.showHelp();
});

// Initialize Ad Manager after page load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize ads (only if not in study session)
    setTimeout(() => {
        if (adManager && !adManager.isStudySessionActive()) {
            adManager.init();
        }
    }, 1000);
});

// Daily Activity Check-in Manager
class CheckInManager {
    constructor(store) {
        this.store = store;
        this.shownToday = {};
    }
    showCheckIn(type, options = {}) {
        const today = new Date().toISOString().split('T')[0];
        const key = `${today}_${type}`;
        if (this.shownToday[key]) return;
        this.shownToday[key] = true;
        const defaultOptions = {
            title: 'Daily Check-In',
            emoji: '📋',
            question: 'Did you complete this activity?',
            rewardXP: 50,
            rewardText: '+50 XP'
        };
        const config = { ...defaultOptions, ...options };
        const html = `
            <div id="checkin-${type}-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 2000;">
                <div class="modal-content-premium" style="animation: modalSlideIn 0.5s cubic-bezier(0.4,0,0.2,1);">
                    <div class="modal-header"><h3>${config.emoji} ${config.title}</h3></div>
                    <div class="modal-body" style="text-align:center;">
                        <div style="font-size:2.5rem;margin-bottom:1rem;">${config.emoji}</div>
                        <h2 style="margin-bottom:0.5rem;">${config.question}</h2>
                        <div style="display:flex;gap:1rem;align-items:center;justify-content:center;margin-bottom:2rem;padding:1.5rem;background:linear-gradient(135deg,rgba(99,102,241,0.1),rgba(14,165,233,0.1));border-radius:12px;border:2px solid var(--border);">
                            <div style="font-size:2rem;">⭐</div>
                            <div style="text-align:left;">
                                <div style="font-size:0.9rem;color:var(--text-muted);">Reward</div>
                                <div style="font-size:1.5rem;font-weight:800;color:var(--primary);">${config.rewardText}</div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-checkin-skip="${type}">Not Yet</button>
                        <button class="btn btn-primary" data-checkin-yes="${type}">Yes! 🎉</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        document.querySelector(`[data-checkin-yes="${type}"]`).addEventListener('click', () => {
            this.store.addXP(config.rewardXP);
            this.store.recordDailyActivity(type, 1);
            document.getElementById(`checkin-${type}-overlay`).remove();
            this.showRewardPopup(config.emoji, config.rewardText);
        });
        document.querySelector(`[data-checkin-skip="${type}"]`).addEventListener('click', () => {
            document.getElementById(`checkin-${type}-overlay`).remove();
        });
    }
    showRewardPopup(emoji, text) {
        const popupId = `reward-popup-${Date.now()}`;
        const html = `
            <div id="${popupId}" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:2001;animation:popupBounce 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards;opacity:1;transition:opacity 0.5s ease-out;">
                <div style="background:var(--bg-card);border-radius:16px;padding:2rem;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);border:2px solid var(--border);">
                    <div style="font-size:3rem;margin-bottom:1rem;animation:float 0.8s ease-in-out;">${emoji || '🎉'}</div>
                    <h3 style="margin-bottom:0.5rem;">Awesome!</h3>
                    <p style="color:var(--text-muted);margin-bottom:0;">You earned <strong style="color:var(--primary);font-size:1.2rem;">${text}</strong></p>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);

        const popup = document.getElementById(popupId);
        if (popup) {
            // Fade out after 2 seconds, then remove
            setTimeout(() => {
                popup.style.opacity = '0';
                setTimeout(() => {
                    popup.remove();
                }, 500); // Wait for fade animation to complete
            }, 2000);
        }
    }
}

const checkInManager = new CheckInManager(store);
window.checkInManager = checkInManager;

// Re-initialize ads when route changes (but not during study sessions)
// Hook into router after it's created
setTimeout(() => {
    if (router && router.handleRoute) {
        const originalHandleRoute = router.handleRoute.bind(router);
        router.handleRoute = async function () {
            await originalHandleRoute();
            // Add ads after view renders (if not in study session)
            setTimeout(() => {
                if (adManager && !adManager.isStudySessionActive()) {
                    // Remove old ads
                    adManager.removeAllAds();
                    // Add new ads based on current route
                    const hash = window.location.hash.slice(1) || 'dashboard';
                    const route = hash.split('/')[0];

                    if (route === 'dashboard') {
                        adManager.insertDashboardAds();
                    }
                    adManager.insertSidebarAd();
                }
            }, 500);
        };
    }
}, 100);
