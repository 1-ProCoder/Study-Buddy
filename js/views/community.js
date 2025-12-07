class AchievementsView {
    constructor(store) {
        this.store = store;
    }

    async render(container) {
        const user = this.store.getUser();
        const achievements = this.store.getAchievements();
        const badges = this.store.getBadges();

        container.innerHTML = `
            <div class="achievements-container fade-in">
                <div class="header-actions">
                    <div>
                        <h2>🏆 Achievements</h2>
                        <p class="text-muted">Track your accomplishments and unlock new milestones.</p>
                    </div>
                </div>

                <!-- Achievements Section -->
                <div class="card" style="margin-bottom: 2rem;">
                    <h3 style="margin-bottom: 1.5rem;">🎖️ My Achievements (${achievements.length})</h3>
                    ${achievements.length === 0 ? `
                        <div style="text-align: center; padding: 3rem;">
                            <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;">🏆</div>
                            <p class="text-muted" style="font-size: 1.1rem;">No achievements unlocked yet.</p>
                            <p class="text-muted" style="margin-top: 0.5rem;">Complete study sessions, earn XP, and reach milestones to unlock achievements!</p>
                        </div>
                    ` : `
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">
                            ${achievements.map(achievement => `
                                <div class="achievement-item" style="
                                    padding: 1.5rem;
                                    background: var(--bg-body);
                                    border-radius: var(--radius);
                                    border: 2px solid var(--primary);
                                    text-align: center;
                                    transition: all 0.3s;
                                ">
                                    <div style="font-size: 3rem; margin-bottom: 0.5rem;">${achievement.icon || '🏆'}</div>
                                    <div style="font-weight: 600; color: var(--text-main); margin-bottom: 0.25rem;">${achievement.title || achievement.name || 'Achievement'}</div>
                                    <div style="font-size: 0.85rem; color: var(--text-muted);">
                                        ${achievement.date ? new Date(achievement.date).toLocaleDateString() : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>

                <!-- Badges Section with Scrollable Layout -->
                <div class="card">
                    <h3 style="margin-bottom: 1.5rem;">🏅 Badges (${badges.length})</h3>
                    <div class="badges-showcase-scrollable" style="
                        display: flex;
                        gap: 1rem;
                        overflow-x: auto;
                        overflow-y: hidden;
                        padding: 0.5rem 0;
                        scrollbar-width: thin;
                        scrollbar-color: var(--border) transparent;
                    ">
                        ${badges.length === 0 ? `
                            <div style="text-align: center; padding: 2rem; width: 100%;">
                                <p class="text-muted">Complete challenges to unlock badges!</p>
                            </div>
                        ` : `
                            ${badges.map(b => `
                                <div class="badge-item-unlocked" title="${b.name}" style="
                                    flex-shrink: 0;
                                    min-width: 120px;
                                    padding: 1rem;
                                    background: var(--bg-body);
                                    border-radius: var(--radius);
                                    border: 1px solid var(--border);
                                    text-align: center;
                                    transition: all 0.2s;
                                ">
                                    <div class="badge-icon" style="font-size: 2.5rem; margin-bottom: 0.5rem;">${b.icon}</div>
                                    <div class="badge-name" style="font-weight: 600; font-size: 0.9rem; color: var(--text-main);">${b.name}</div>
                                </div>
                            `).join('')}
                        `}
                    </div>
                </div>

                <!-- Badge Progress Section -->
                <div class="card" style="margin-top: 2rem;">
                    <h3 style="margin-bottom: 1.5rem;">🎯 Badge Progress</h3>
                    <div class="badge-progress-list" style="max-height: 500px; overflow-y: auto;">
                        ${this.getAllBadgesWithProgress().map((badge, idx) => {
            const isUnlocked = badges.find(b => b.id === badge.id);
            return `
                                    <div class="badge-progress-item">
                                        <div class="badge-progress-header">
                                            <span class="badge-progress-icon ${isUnlocked ? 'unlocked' : ''}">${badge.icon}</span>
                                            <div class="badge-progress-info">
                                                <div class="badge-progress-name">${badge.name}</div>
                                                <div class="badge-progress-req">${badge.requirement}</div>
                                            </div>
                                        </div>
                                        <div class="badge-progress-bar">
                                            <div class="badge-progress-fill" style="width: ${isUnlocked ? 100 : badge.progress}%"></div>
                                        </div>
                                        <div class="badge-progress-text">${isUnlocked ? '✓ Unlocked' : badge.progress + '%'}</div>
                                    </div>
                                `;
        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    getAllBadgesWithProgress() {
        return this.store.getAllBadges().map(badge => {
            const progressData = this.store.getBadgeProgress(badge.id);
            return {
                ...badge,
                progress: progressData?.progress || 0,
                isUnlocked: progressData?.isUnlocked || false
            };
        });
    }

    async afterRender() {
        // Add hover effects to achievement items
        document.querySelectorAll('.achievement-item').forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.style.transform = 'translateY(-4px)';
                item.style.boxShadow = 'var(--shadow-lg)';
            });
            item.addEventListener('mouseleave', () => {
                item.style.transform = 'translateY(0)';
                item.style.boxShadow = 'none';
            });
        });

        // Add hover effects to badge items
        document.querySelectorAll('.badge-item-unlocked').forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.style.transform = 'scale(1.05)';
                item.style.borderColor = 'var(--primary)';
            });
            item.addEventListener('mouseleave', () => {
                item.style.transform = 'scale(1)';
                item.style.borderColor = 'var(--border)';
            });
        });
    }
}
