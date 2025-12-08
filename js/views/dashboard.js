class DashboardView {
    constructor(store) {
        this.store = store;
    }

    async render(container) {
        const user = this.store.getUser();
        const subjects = this.store.getSubjects();
        const sessions = this.store.getSessions();
        const challenges = this.store.getDailyChallenges();
        const papers = this.store.getPapers();

        // Calculate stats - ensure whole numbers
        const totalStudyTime = Math.round(sessions.reduce((acc, s) => acc + (s.duration || 0), 0));
        const hours = Math.floor(totalStudyTime / 60);
        const minutes = totalStudyTime % 60;

        // XP is now pure cumulative, no levels

        // Motivational Quotes
        const quotes = [
            { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
            { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
            { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
            { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
            { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
            { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
            { text: "Study while others are sleeping; work while others are loafing.", author: "William Arthur Ward" },
            { text: "Your limitation—it's only your imagination.", author: "Unknown" },
            { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" }
        ];
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

        container.innerHTML = `
            <div class="dashboard-container animate-fade-in">
                <div style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: flex-end;">
                    <div>
                        <h2 style="font-weight: 800; color: var(--text-main); font-size: 2.5rem; margin-bottom: 0.5rem;">Good ${this.getTimeOfDay()}, ${user.name.split(' ')[0]}</h2>
                        <p class="text-muted" style="font-size: 1.1rem;">Keep growing your XP every day.</p>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em;">Total XP</div>
                        <div style="font-weight: 800; font-size: 1.8rem; color: var(--primary);">${user.xp || 0}</div>
                    </div>
                </div>

                <!-- Motivational Quote -->
                <div class="card" style="margin-bottom: 2rem; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark, #4338ca) 100%); color: white; padding: 1.5rem; border: none;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="font-size: 2.5rem;">💡</div>
                        <div>
                            <p style="font-size: 1.1rem; font-style: italic; margin-bottom: 0.5rem; color: rgba(255,255,255,0.95);">"${randomQuote.text}"</p>
                            <p style="font-size: 0.9rem; color: rgba(255,255,255,0.8); margin: 0;">— ${randomQuote.author}</p>
                        </div>
                    </div>
                </div>

                <!-- Gamification Stats Row -->
                <div class="grid-3" style="margin-bottom: 2rem;">
                    <div class="card stat-card">
                        <div style="font-size: 2.5rem;">🔥</div>
                        <div>
                            <p class="stat-label">Daily Streak</p>
                            <p class="stat-value">${user.streak} <span style="font-size: 1rem; color: var(--text-muted); font-weight: 400;">days</span></p>
                        </div>
                    </div>
                    <div class="card stat-card">
                        <div style="font-size: 2.5rem;">⏱️</div>
                        <div>
                            <p class="stat-label">Total Focus</p>
                            <p class="stat-value">${hours}h ${minutes}m</p>
                        </div>
                    </div>
                    <div class="card stat-card">
                        <div style="font-size: 2.5rem;">🏆</div>
                        <div>
                            <p class="stat-label">Achievements</p>
                            <p class="stat-value">${this.store.getAchievements().length}</p>
                        </div>
                    </div>
                </div>

                <div class="grid-2">
                    <!-- Daily Challenges -->
                    <div class="card">
                        <h4 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            🎯 Daily Challenges
                        </h4>
                        <div style="display: flex; flex-direction: column; gap: 1rem;">
                            ${challenges.map(c => `
                                <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--bg-body); border-radius: var(--radius); border: 1px solid ${c.completed ? 'var(--success)' : 'var(--border)'}; opacity: ${c.completed ? 0.7 : 1};">
                                    <div style="width: 24px; height: 24px; border-radius: 50%; border: 2px solid ${c.completed ? 'var(--success)' : 'var(--text-muted)'}; display: flex; align-items: center; justify-content: center; color: var(--success);">
                                        ${c.completed ? '✓' : ''}
                                    </div>
                                    <div style="flex: 1;">
                                        <div style="font-weight: 600; ${c.completed ? 'text-decoration: line-through;' : ''}">${c.text}</div>
                                        <div style="font-size: 0.8rem; color: var(--text-muted);">Reward: ${c.xp} XP</div>
                                    </div>
                                    ${!c.completed ? `<div style="font-size: 0.85rem; font-weight: 600; color: var(--primary);">${Math.round(c.current || 0)}/${c.target}</div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Quick Actions -->
                    <div class="card">
                        <h4 style="margin-bottom: 1.5rem;">🚀 Quick Actions</h4>
                        <div style="display: grid; gap: 1rem;">
                            <button class="btn btn-primary btn-block" onclick="window.location.hash='#pomodoro'" style="justify-content: space-between; padding: 1rem;">
                                <span>⏱️ Start Focus Session</span>
                                <span>→</span>
                            </button>
                            <button class="btn btn-secondary btn-block" onclick="window.location.hash='#flashcards'" style="justify-content: space-between; padding: 1rem;">
                                <span>🎴 Review Flashcards</span>
                                <span>→</span>
                            </button>
                            <button class="btn btn-secondary btn-block" onclick="window.location.hash='#subjects'" style="justify-content: space-between; padding: 1rem;">
                                <span>📚 Manage Subjects</span>
                                <span>→</span>
                            </button>
                            <button class="btn btn-secondary btn-block" onclick="window.location.hash='#analytics'" style="justify-content: space-between; padding: 1rem;">
                                <span>📊 View Analytics</span>
                                <span>→</span>
                            </button>
                            <button class="btn btn-secondary btn-block" id="brain-break-btn" style="justify-content: space-between; padding: 1rem; border-color: var(--success); color: var(--success);">
                                <span>🧘 Brain Break</span>
                                <span>→</span>
                            </button>
                        </div>
                    </div>
                </div>

                ${subjects.length === 0 ? `
                    <div class="card" style="margin-top: 2rem; text-align: center; padding: 2rem;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">🚀</div>
                        <h3 style="margin-bottom: 1rem;">Get Started with Your Learning Journey!</h3>
                        <p class="text-muted" style="margin-bottom: 1.5rem;">Add your first subject to begin tracking your progress and unlock the full power of StudyBuddy.</p>
                        <button class="btn btn-primary" onclick="window.location.hash='#subjects'">Add Your First Subject</button>
                    </div>
                ` : ''}
                
                <!-- Past Paper Results -->
                <div class="card" style="margin-top: 2rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h3 style="margin: 0;">📝 Past Paper Results</h3>
                        <span style="font-size: 0.9rem; color: var(--text-muted); background: var(--bg-body); padding: 0.25rem 0.75rem; border-radius: 20px;">${papers.length} Records</span>
                    </div>
                    
                    <!-- Add New Result Form -->
                    <div style="background: var(--bg-body); padding: 1.5rem; border-radius: var(--radius); margin-bottom: 2rem; border: 1px solid var(--border);">
                        <h4 style="margin-bottom: 1rem; font-size: 1rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Add New Result</h4>
                        <form id="past-paper-form" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; align-items: end;">
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">Subject</label>
                                <select id="pp-subject" required style="width: 100%; padding: 0.75rem; border: 2px solid var(--border); border-radius: var(--radius); background: var(--bg-card); color: var(--text-main); transition: border-color 0.2s;">
                                    <option value="">Select Subject...</option>
                                    ${subjects.map(s => `<option value="${s.name}">${s.name}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">Year</label>
                                <input type="number" id="pp-year" placeholder="e.g. 2024" required style="width: 100%; padding: 0.75rem; border: 2px solid var(--border); border-radius: var(--radius); background: var(--bg-card); color: var(--text-main);">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">Paper Type</label>
                                <input type="text" id="pp-type" placeholder="e.g. Unit 1 / Paper 2" required style="width: 100%; padding: 0.75rem; border: 2px solid var(--border); border-radius: var(--radius); background: var(--bg-card); color: var(--text-main);">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">Grade / Score</label>
                                <input type="text" id="pp-grade" placeholder="e.g. A* or 95%" required style="width: 100%; padding: 0.75rem; border: 2px solid var(--border); border-radius: var(--radius); background: var(--bg-card); color: var(--text-main);">
                            </div>
                            <button type="submit" class="btn btn-primary" style="height: 48px; margin-top: auto; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                                <span>💾</span> Save Result
                            </button>
                        </form>
                    </div>

                    <!-- Results List -->
                    <div style="margin-top: 1rem;">
                        ${papers.length === 0 ? `
                            <div style="text-align: center; padding: 3rem; background: var(--bg-body); border-radius: var(--radius); border: 2px dashed var(--border);">
                                <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5; animation: float 3s ease-in-out infinite;">📝</div>
                                <h4 style="margin-bottom: 0.5rem;">No results recorded yet</h4>
                                <p style="font-size: 0.9rem; color: var(--text-muted);">Add your first past paper result above to start tracking your academic progress!</p>
                            </div>
                        ` : `
                            <div style="display: grid; gap: 0.75rem;">
                                ${papers.sort((a, b) => new Date(b.date) - new Date(a.date)).map(p => `
                                    <div class="paper-item" style="display: flex; align-items: center; justify-content: space-between; padding: 1.25rem; background: var(--bg-body); border-radius: var(--radius); border: 1px solid var(--border); transition: all 0.2s ease; position: relative; overflow: hidden;">
                                        <!-- Decorative side accent -->
                                        <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 5px; background: var(--primary);"></div>
                                        
                                        <div style="display: flex; align-items: center; gap: 1rem; padding-left: 1rem;">
                                            <div>
                                                <div style="font-weight: 700; color: var(--text-main); font-size: 1.1rem; margin-bottom: 0.25rem;">${p.subject}</div>
                                                <div style="font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.75rem;">
                                                    <span style="background: var(--bg-card); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border);">📅 ${p.year}</span>
                                                    <span style="background: var(--bg-card); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border);">📄 ${p.type}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style="display: flex; align-items: center; gap: 1.5rem;">
                                            <div style="text-align: right; padding-right: 1rem; border-right: 1px solid var(--border);">
                                                <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600; letter-spacing: 0.05em; margin-bottom: 2px;">Grade</div>
                                                <div style="font-size: 1.5rem; font-weight: 800; color: var(--primary); line-height: 1;">${p.grade}</div>
                                            </div>
                                            
                                            <button class="btn btn-secondary delete-paper-btn" data-id="${p.id}" style="
                                                padding: 0.5rem; 
                                                width: 36px; height: 36px; 
                                                display: flex; align-items: center; justify-content: center;
                                                border-radius: 50%;
                                                color: var(--danger); 
                                                border-color: transparent; 
                                                background: rgba(239, 68, 68, 0.1);
                                                transition: all 0.2s;
                                            " title="Delete Result">
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            <style>
                                .paper-item:hover {
                                    transform: translateX(4px);
                                    border-color: var(--primary);
                                    background: var(--bg-card);
                                    box-shadow: var(--shadow-sm);
                                }
                                .delete-paper-btn:hover {
                                    background: var(--danger) !important;
                                    color: white !important;
                                    transform: scale(1.1);
                                }
                            </style>
                        `}
                    </div>
                </div>

                <!-- Ad Container - Non-intrusive placement after main content -->
                <div id="dashboard-ad-container"></div>
            </div>
        `;
    }

    getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Morning';
        if (hour < 18) return 'Afternoon';
        return 'Evening';
    }

    async afterRender() {
        // Silently auto-claim free daily XP once per day on dashboard load (no popup)
        const showCheckIn = () => {
            if (!this.store.state.checkin_today) {
                this.showDailyCheckInPopup();
            }
        };

        if (typeof this.store.canClaimDailyXP === 'function' && this.store.canClaimDailyXP()) {
            this.store.claimDailyXP();
        }

        setTimeout(showCheckIn, 500);

        // Check and unlock badges
        this.store.checkBadgeProgress();

        // Brain Break Button Listener
        document.getElementById('brain-break-btn')?.addEventListener('click', () => {
            this.startBreathingExercise();
        });

        // Add ad container after content loads (non-intrusive)
        setTimeout(() => {
            const adContainer = document.getElementById('dashboard-ad-container');
            if (adContainer && window.adManager && !window.adManager.isStudySessionActive()) {
                const ad = window.adManager.createAdContainer('inline', 'bottom');
                if (ad) {
                    adContainer.appendChild(ad);
                }
            }
        }, 500);

        // Past Paper Form Handler
        const ppForm = document.getElementById('past-paper-form');
        if (ppForm) {
            ppForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const subject = document.getElementById('pp-subject').value;
                const year = document.getElementById('pp-year').value;
                const type = document.getElementById('pp-type').value;
                const grade = document.getElementById('pp-grade').value;

                if (subject && year && type && grade) {
                    this.store.addPaper({
                        id: Date.now().toString(),
                        subject,
                        year,
                        type,
                        grade,
                        date: new Date().toISOString()
                    });

                    // Refresh view
                    await this.render(document.getElementById('app-view'));
                    this.afterRender();
                }
            });
        }

        // Delete Paper Handlers
        document.querySelectorAll('.delete-paper-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.closest('button').dataset.id;
                if (confirm('Are you sure you want to delete this result?')) {
                    this.store.deletePaper(id);
                    // Refresh view
                    await this.render(document.getElementById('app-view'));
                    this.afterRender();
                }
            });
        });
    }

    startBreathingExercise() {
        const html = `
            <div id="breathing-modal" class="modal">
                <div class="modal-backdrop"></div>
                <div class="modal-content-premium" style="text-align: center;">
                    <div class="modal-header">
                        <h3>🧘 Brain Break: Box Breathing</h3>
                        <button class="modal-close" id="close-breathing">×</button>
                    </div>
                    <div class="modal-body">
                        <div id="breathing-circle" style="
                            width: 150px; height: 150px; 
                            background: var(--primary); 
                            border-radius: 50%; 
                            margin: 2rem auto;
                            display: flex; align-items: center; justify-content: center;
                            color: white; font-weight: 800; font-size: 1.5rem;
                            transition: all 4s ease-in-out;
                            box-shadow: 0 0 20px var(--primary);
                        ">Inhale</div>
                        <p id="breathing-text" style="font-size: 1.2rem; font-weight: 600;">Breathe In...</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" id="close-breathing-btn">Done</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);

        const circle = document.getElementById('breathing-circle');
        const text = document.getElementById('breathing-text');

        let phase = 0; // 0: Inhale, 1: Hold, 2: Exhale, 3: Hold
        const phases = [
            { text: "Breathe In...", scale: 1.5, label: "Inhale" },
            { text: "Hold...", scale: 1.5, label: "Hold" },
            { text: "Breathe Out...", scale: 1.0, label: "Exhale" },
            { text: "Hold...", scale: 1.0, label: "Hold" }
        ];

        const interval = setInterval(() => {
            if (!document.getElementById('breathing-modal')) {
                clearInterval(interval);
                return;
            }
            phase = (phase + 1) % 4;
            const p = phases[phase];
            text.textContent = p.text;
            circle.textContent = p.label;
            circle.style.transform = `scale(${p.scale})`;
        }, 4000);

        // Initial animation
        setTimeout(() => {
            circle.style.transform = 'scale(1.5)';
        }, 100);

        const closeModal = () => {
            clearInterval(interval);
            document.getElementById('breathing-modal').remove();
        };

        document.getElementById('close-breathing').addEventListener('click', closeModal);
        document.getElementById('close-breathing-btn').addEventListener('click', closeModal);
        document.querySelector('.modal-backdrop').addEventListener('click', closeModal);
    }

    showDailyXPPopup(callback) {
        // Only show if not already claimed today
        if (this.store.canClaimDailyXP() && !document.getElementById('daily-xp-overlay')) {
            const html = `
                <div id="daily-xp-overlay" class="modal-backdrop" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 2000;">
                    <div class="modal-content-premium" style="animation: modalSlideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);">
                        <div class="modal-header">
                            <h3>🎁 Daily Reward</h3>
                        </div>
                        <div class="modal-body" style="text-align: center;">
                            <div style="font-size: 3.5rem; margin-bottom: 1.5rem; animation: float 0.8s ease-in-out;">🌟</div>
                            <h2 style="margin-bottom: 0.5rem;">Free XP Available!</h2>
                            <p class="text-muted" style="margin-bottom: 2rem;">Claim your daily reward for logging in!</p>
                            <div style="display: flex; gap: 1rem; align-items: center; justify-content: center; margin-bottom: 2rem; padding: 1.5rem; background: linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(245, 158, 11, 0.1)); border-radius: 12px; border: 2px solid var(--border);">
                                <div style="font-size: 2rem;">💎</div>
                                <div style="text-align: left;">
                                    <div style="font-size: 0.9rem; color: var(--text-muted);">You'll earn</div>
                                    <div style="font-size: 1.5rem; font-weight: 800; color: #f59e0b;">+10 XP</div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" id="skip-daily-xp">Maybe Later</button>
                            <button class="btn btn-primary" id="claim-daily-xp">Claim Reward!</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', html);

            document.getElementById('claim-daily-xp')?.addEventListener('click', () => {
                this.store.claimDailyXP();
                document.getElementById('daily-xp-overlay').remove();
                this.showDailyXPSuccess();
                if (callback) callback();
            });

            document.getElementById('skip-daily-xp')?.addEventListener('click', () => {
                document.getElementById('daily-xp-overlay').remove();
                if (callback) callback();
            });
        } else {
            if (callback) callback();
        }
    }

    showDailyXPSuccess() {
        const html = `
            <div id="daily-xp-success" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 2001; animation: popupBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;">
                <div style="background: var(--bg-card); border-radius: 16px; padding: 2rem; text-align: center; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); border: 2px solid var(--border);">
                    <div style="font-size: 3rem; margin-bottom: 1rem; animation: float 0.8s ease-in-out;">💰</div>
                    <h3 style="margin-bottom: 0.5rem;">Daily Reward Claimed!</h3>
                    <p style="color: var(--text-muted); margin-bottom: 1rem;">You earned <strong style="color: #f59e0b; font-size: 1.2rem;">+10 XP</strong></p>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);

        setTimeout(() => {
            document.getElementById('daily-xp-success')?.remove();
        }, 2500);
    }

    showDailyCheckInPopup() {
        const user = this.store.getUser();
        const today = new Date().toISOString().split('T')[0];
        const lastPopup = this.store.state.last_checkin_popup;

        // Only show the check-in popup once per day
        if (!this.store.state.checkin_today && lastPopup !== today) {
            // Mark that we've shown today's popup
            this.store.state.last_checkin_popup = today;
            this.store.save('last_checkin_popup');
            const html = `
                <div id="checkin-overlay" class="modal-backdrop" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 2000;">
                    <div class="modal-content-premium" style="animation: modalSlideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);">
                        <div class="modal-header">
                            <h3>🎯 Daily Check-In</h3>
                        </div>
                        <div class="modal-body" style="text-align: center;">
                            <div style="font-size: 3.5rem; margin-bottom: 1.5rem;">✨</div>
                            <h2 style="margin-bottom: 0.5rem;">Welcome back, ${user.name}!</h2>
                            <p class="text-muted" style="margin-bottom: 2rem;">Check in to start your day and earn your daily bonus!</p>
                            <div style="display: flex; gap: 1rem; align-items: center; justify-content: center; margin-bottom: 2rem; padding: 1.5rem; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(14, 165, 233, 0.1)); border-radius: 12px; border: 2px solid var(--border);">
                                <div style="font-size: 2rem;">⭐</div>
                                <div style="text-align: left;">
                                    <div style="font-size: 0.9rem; color: var(--text-muted);">You'll earn</div>
                                    <div style="font-size: 1.5rem; font-weight: 800; color: var(--primary);">25 XP</div>
                                </div>
                            </div>
                            <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.5rem;">Streak: <strong style="color: #ef4444; font-size: 1.1rem;">🔥 ${user.streak}</strong></p>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" id="skip-checkin">Skip</button>
                            <button class="btn btn-primary" id="confirm-checkin">Check In!</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', html);

            document.getElementById('confirm-checkin')?.addEventListener('click', () => {
                this.store.completeDailyCheckIn();
                document.getElementById('checkin-overlay').remove();

                // Show success message
                this.showCheckInSuccess();
            });

            document.getElementById('skip-checkin')?.addEventListener('click', () => {
                document.getElementById('checkin-overlay').remove();
            });
        }
    }

    showCheckInSuccess() {
        const html = `
            <div id="success-popup" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 2001; animation: popupBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;">
                <div style="background: var(--bg-card); border-radius: 16px; padding: 2rem; text-align: center; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); border: 2px solid var(--border);">
                    <div style="font-size: 3rem; margin-bottom: 1rem; animation: float 0.8s ease-in-out;">🎉</div>
                    <h3 style="margin-bottom: 0.5rem;">Check-In Successful!</h3>
                    <p style="color: var(--text-muted); margin-bottom: 1rem;">You earned <strong style="color: var(--primary); font-size: 1.2rem;">+25 XP</strong></p>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);

        setTimeout(() => {
            document.getElementById('success-popup')?.remove();
        }, 2500);
    }
}
