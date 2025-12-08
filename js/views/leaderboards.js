// Enhanced Leaderboards View with Shared Storage
class LeaderboardsView {
    constructor(store, authManager) {
        this.store = store;
        this.authManager = authManager;
        
        // Use Firebase leaderboard manager if available, otherwise use localStorage
        const useFirebase = window.firebaseConfig && 
                           window.firebaseConfig.apiKey !== "YOUR_API_KEY" &&
                           typeof window.FirebaseLeaderboardManager !== 'undefined';
        
        if (useFirebase) {
            this.leaderboardManager = new FirebaseLeaderboardManager(store, authManager);
        } else {
            this.leaderboardManager = new LeaderboardManager(store, authManager);
        }
        
        this.currentCategory = 'totalXP';
        this.currentTimeFilter = 'alltime';
        this.currentSubjectFilter = '';
    }

    async render(container) {
        // Sync current user stats
        if (this.leaderboardManager.syncCurrentUser) {
            await this.leaderboardManager.syncCurrentUser();
        }

        container.innerHTML = `
            <div class="leaderboards-container animate-fade-in">
                <div class="header-actions">
                    <h2>🏆 Leaderboards</h2>
                    <div style="display: flex; gap: 1rem; align-items: center;">
                        <span id="last-updated" style="font-size: 0.85rem; color: var(--text-muted);">Loading...</span>
                        <button id="refresh-leaderboard-btn" class="btn btn-secondary" style="padding: 0.5rem 1rem;">🔄 Refresh</button>
                    </div>
                </div>

                <!-- Category Tabs -->
                <div class="leaderboard-category-tabs" style="display: flex; gap: 0.5rem; margin: 2rem 0; border-bottom: 2px solid var(--border); padding-bottom: 0.5rem; overflow-x: auto;">
                    <button class="leaderboard-category-tab active" data-category="totalXP">⭐ Total XP</button>
                    <button class="leaderboard-category-tab" data-category="studyTime">📊 Study Time</button>
                    <button class="leaderboard-category-tab" data-category="studyStreak">🔥 Streaks</button>
                    <button class="leaderboard-category-tab" data-category="studySessions">⏱️ Sessions</button>
                    <button class="leaderboard-category-tab" data-category="flashcardsCompleted">🎴 Flashcards</button>
                </div>

                <!-- Time Filter Tabs -->
                <div class="leaderboard-time-tabs" style="display: flex; gap: 0.5rem; margin-bottom: 2rem; flex-wrap: wrap;">
                    <button class="leaderboard-time-tab active" data-time="alltime">All Time</button>
                    <button class="leaderboard-time-tab" data-time="month">This Month</button>
                    <button class="leaderboard-time-tab" data-time="week">This Week</button>
                    <button class="leaderboard-time-tab" data-time="today">Today</button>
                </div>

                <!-- Filters -->
                <div class="leaderboard-filters" style="display: flex; gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap; align-items: center;">
                    <select id="subject-filter" class="input-premium" style="width: auto; min-width: 200px;">
                        <option value="">All Subjects</option>
                        ${this.store.getSubjects().map(s => `
                            <option value="${s.name}">${s.name}</option>
                        `).join('')}
                    </select>
                    <input type="text" id="search-users" placeholder="🔍 Search users..." class="input-premium" style="width: auto; min-width: 200px;">
                </div>

                <!-- Current User Rank Card -->
                <div id="current-user-rank-card" style="margin-bottom: 2rem;"></div>

                <!-- Leaderboard Content -->
                <div id="leaderboard-content">
                    <div style="text-align: center; padding: 3rem;">
                        <div class="spinner" style="border: 4px solid var(--border); border-top: 4px solid var(--primary); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                        <p style="margin-top: 1rem; color: var(--text-muted);">Loading leaderboard...</p>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
        this.renderLeaderboard();
        
        // Start auto-refresh every 30 seconds
        this.leaderboardManager.startAutoRefresh(() => {
            this.renderLeaderboard();
        }, 30000);
    }

    async renderLeaderboard() {
        const currentUser = this.authManager?.getCurrentUser() || this.store.getUser();
        const searchQuery = document.getElementById('search-users')?.value.toLowerCase() || '';
        
        // Get leaderboard data (async if using Firebase)
        let users;
        if (this.leaderboardManager.getLeaderboard.constructor.name === 'AsyncFunction' || 
            this.leaderboardManager.getLeaderboard instanceof Promise) {
            users = await this.leaderboardManager.getLeaderboard(
                this.currentCategory,
                this.currentTimeFilter,
                this.currentSubjectFilter
            );
        } else {
            users = this.leaderboardManager.getLeaderboard(
                this.currentCategory,
                this.currentTimeFilter,
                this.currentSubjectFilter
            );
        }

        // Apply search filter
        if (searchQuery) {
            users = users.filter(u => 
                u.username.toLowerCase().includes(searchQuery)
            );
        }

        // Get current user's position
        const currentUserId = currentUser.userId || currentUser.accountId;
        const currentUserIndex = users.findIndex(u => u.userId === currentUserId);
        const currentUserRank = currentUserIndex !== -1 ? currentUserIndex + 1 : null;
        const currentUserData = currentUserIndex !== -1 ? users[currentUserIndex] : null;

        // Render current user card
        const currentUserCard = document.getElementById('current-user-rank-card');
        if (currentUserCard) {
            if (currentUserRank && currentUserData) {
                currentUserCard.innerHTML = `
                    <div class="card" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(14, 165, 233, 0.1)); border: 2px solid var(--primary); animation: pulseGlow 2s ease-in-out infinite;">
                        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <div style="font-size: 3rem;">${currentUserData.avatar || '🎓'}</div>
                                <div>
                                    <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.25rem;">Your Rank</div>
                                    <div style="font-size: 2rem; font-weight: 800; color: var(--primary);">#${currentUserRank}</div>
                                    <div style="font-size: 0.9rem; color: var(--text-muted);">${currentUserData.username}</div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.25rem;">Your Score</div>
                                <div style="font-size: 1.8rem; font-weight: 700; color: var(--primary);">
                                    ${this.formatScore(currentUserData, this.currentCategory)}
                                </div>
                                <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">
                                    ${this.getCategoryLabel(this.currentCategory)}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                currentUserCard.innerHTML = `
                    <div class="card" style="background: var(--bg-body); border: 1px dashed var(--border); text-align: center; padding: 2rem;">
                        <p style="color: var(--text-muted);">Start studying to appear on the leaderboard!</p>
                    </div>
                `;
            }
        }

        // Render leaderboard
        const content = document.getElementById('leaderboard-content');
        if (!content) return;

        if (users.length === 0) {
            content.innerHTML = `
                <div class="card" style="text-align: center; padding: 3rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🏆</div>
                    <h3>No Rankings Yet</h3>
                    <p class="text-muted">Be the first to start studying and claim the top spot!</p>
                </div>
            `;
            return;
        }

        // Top 3 podium
        const top3 = users.slice(0, 3);
        const rest = users.slice(3);

        content.innerHTML = `
            ${top3.length > 0 ? `
                <div class="podium-container" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem;">
                    ${top3.map((user, index) => this.renderPodiumUser(user, index + 1)).join('')}
                </div>
            ` : ''}
            <div class="leaderboard-list">
                ${rest.map((user, index) => this.renderLeaderboardUser(user, index + 4, currentUserId)).join('')}
            </div>
        `;

        // Update last updated timestamp
        const lastUpdatedEl = document.getElementById('last-updated');
        if (lastUpdatedEl) {
            const now = new Date();
            lastUpdatedEl.textContent = `Last updated: ${now.toLocaleTimeString()}`;
        }
    }

    renderPodiumUser(user, rank) {
        const medals = ['🥇', '🥈', '🥉'];
        const colors = ['#fbbf24', '#94a3b8', '#b45309'];
        const heights = ['120px', '100px', '80px'];

        return `
            <div class="podium-user" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1rem;
                padding: 1.5rem;
                background: var(--bg-card);
                border-radius: 16px;
                border: 3px solid ${colors[rank - 1]};
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
                transition: transform 0.3s ease;
            ">
                <div style="font-size: 3.5rem;">${medals[rank - 1]}</div>
                <div style="font-size: 2.5rem; font-weight: 800; color: ${colors[rank - 1]};">#${rank}</div>
                <div style="font-size: 2rem;">${user.avatar || '👤'}</div>
                <div style="font-weight: 700; font-size: 1.1rem; text-align: center;">${user.username}</div>
                <div style="font-size: 1.3rem; font-weight: 600; color: var(--primary); text-align: center;">
                    ${this.formatScore(user, this.currentCategory)}
                </div>
                <div style="font-size: 0.85rem; color: var(--text-muted); text-align: center;">
                    ${this.getCategoryLabel(this.currentCategory)}
                </div>
            </div>
        `;
    }

    renderLeaderboardUser(user, rank, currentUserId) {
        const isCurrentUser = user.userId === currentUserId;
        const trend = this.getTrend(user);

        return `
            <div class="leaderboard-item ${isCurrentUser ? 'current-user' : ''}" style="
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1rem 1.5rem;
                background: ${isCurrentUser ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-card)'};
                border-radius: 12px;
                border: ${isCurrentUser ? '2px solid var(--primary)' : '1px solid var(--border)'};
                margin-bottom: 0.75rem;
                transition: all 0.2s ease;
            ">
                <div class="rank" style="
                    width: 45px;
                    height: 45px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                    font-size: 1.1rem;
                    border-radius: 50%;
                    background: ${rank <= 3 ? 'var(--primary)' : 'var(--bg-body)'};
                    color: ${rank <= 3 ? 'white' : 'var(--text-main)'};
                    flex-shrink: 0;
                ">${rank}</div>
                <div style="font-size: 1.8rem; flex-shrink: 0;">${user.avatar || '👤'}</div>
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                        <strong style="font-size: 1rem; overflow: hidden; text-overflow: ellipsis;">${user.username}</strong>
                        ${isCurrentUser ? '<span style="background: var(--primary); color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; white-space: nowrap;">You</span>' : ''}
                        ${trend ? `<span style="color: ${trend > 0 ? 'var(--success)' : trend < 0 ? 'var(--danger)' : 'var(--text-muted)'}; font-size: 0.85rem; white-space: nowrap;">${trend > 0 ? '↑' : trend < 0 ? '↓' : '—'} ${Math.abs(trend)}</span>` : ''}
                    </div>
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
                        ${this.getUserStatsText(user)}
                    </div>
                </div>
                <div style="text-align: right; flex-shrink: 0;">
                    <div style="font-size: 1.2rem; font-weight: 700; color: var(--primary);">
                        ${this.formatScore(user, this.currentCategory)}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">
                        ${this.getCategoryLabel(this.currentCategory)}
                    </div>
                </div>
            </div>
        `;
    }

    formatScore(user, category) {
        switch (category) {
            case 'studyTime':
                const hours = Math.floor((user.studyTime || 0) / 60);
                const minutes = (user.studyTime || 0) % 60;
                return `${hours}h ${minutes}m`;
            case 'studyStreak':
                return `${user.studyStreak || 0} days`;
            case 'studySessions':
                return `${user.studySessions || 0} sessions`;
            case 'flashcardsCompleted':
                return `${user.flashcardsCompleted || 0} cards`;
            case 'totalXP':
            default:
                return `${user.totalXP || 0} XP`;
        }
    }

    getCategoryLabel(category) {
        const labels = {
            totalXP: 'Total XP',
            studyTime: 'Study Time',
            studyStreak: 'Day Streak',
            studySessions: 'Sessions',
            flashcardsCompleted: 'Flashcards'
        };
        return labels[category] || 'Score';
    }

    getUserStatsText(user) {
        const parts = [];
        if (user.studyTime) {
            const hours = Math.floor(user.studyTime / 60);
            if (hours > 0) parts.push(`${hours}h`);
        }
        if (user.studyStreak) parts.push(`${user.studyStreak} day streak`);
        if (user.totalXP) parts.push(`${user.totalXP} XP`);
        return parts.length > 0 ? parts.join(' • ') : 'New user';
    }

    getTrend(user) {
        // Simple trend calculation - could be enhanced with historical data
        // For now, return null (no trend data)
        return null;
    }

    attachEventListeners() {
        // Category tabs
        document.querySelectorAll('.leaderboard-category-tab').forEach(tab => {
            tab.addEventListener('click', async () => {
                document.querySelectorAll('.leaderboard-category-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentCategory = tab.dataset.category;
                await this.renderLeaderboard();
            });
        });

        // Time filter tabs
        document.querySelectorAll('.leaderboard-time-tab').forEach(tab => {
            tab.addEventListener('click', async () => {
                document.querySelectorAll('.leaderboard-time-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentTimeFilter = tab.dataset.time;
                await this.renderLeaderboard();
            });
        });

        // Subject filter
        document.getElementById('subject-filter')?.addEventListener('change', async (e) => {
            this.currentSubjectFilter = e.target.value;
            await this.renderLeaderboard();
        });

        // Search
        document.getElementById('search-users')?.addEventListener('input', async () => {
            await this.renderLeaderboard();
        });

        // Refresh button
        document.getElementById('refresh-leaderboard-btn')?.addEventListener('click', async () => {
            if (this.leaderboardManager.syncCurrentUser) {
                await this.leaderboardManager.syncCurrentUser();
            }
            await this.renderLeaderboard();
        });

        // Set up real-time listener if using Firebase
        if (this.leaderboardManager.onLeaderboardUpdate) {
            this.leaderboardManager.onLeaderboardUpdate((users) => {
                // Update leaderboard when data changes
                this.currentCategory = document.querySelector('.leaderboard-category-tab.active')?.dataset.category || 'totalXP';
                this.currentTimeFilter = document.querySelector('.leaderboard-time-tab.active')?.dataset.time || 'alltime';
                this.currentSubjectFilter = document.getElementById('subject-filter')?.value || '';
                this.renderLeaderboard();
            });
        }
    }
}

// Export for use in other files
window.LeaderboardsView = LeaderboardsView;

