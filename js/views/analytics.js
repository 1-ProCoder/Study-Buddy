class AnalyticsView {
    constructor(store) {
        this.store = store;
    }

    async render(container) {
        // Show loading state
        container.innerHTML = '<div style="text-align: center; padding: 3rem;"><div class="spinner" style="border: 4px solid var(--border); border-top: 4px solid var(--primary); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div><p style="margin-top: 1rem; color: var(--text-muted);">Loading analytics...</p></div>';
        
        const sessions = this.store.getSessions() || [];
        const subjects = this.store.getSubjects() || [];
        const user = this.store.getUser();

        // Calculate data for charts
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - 6 + i); // Last 7 days including today
            return d.toISOString().split('T')[0];
        });

        const studyTimeData = last7Days.map(date => {
            return Math.round(sessions
                .filter(s => s.timestamp && s.timestamp.startsWith(date))
                .reduce((acc, s) => acc + (s.duration || 0), 0));
        });

        const totalStudyTime = Math.round(sessions.reduce((acc, s) => acc + (s.duration || 0), 0));
        const hours = Math.floor(totalStudyTime / 60);
        const minutes = totalStudyTime % 60;
        const totalSessions = sessions.length;
        const weeklyMinutes = studyTimeData.length > 0 ? Math.round(studyTimeData.reduce((a, b) => a + b, 0)) : 0;
        const weeklyHours = Math.floor(weeklyMinutes / 60);

        // Subject Distribution (real data)
        const subjectMap = {};
        // Initialize all subjects with zero duration
        subjects.forEach(sub => {
            subjectMap[sub.id] = { name: sub.name, duration: 0 };
        });
        // Accumulate session durations per subject if session has subjectId
        sessions.forEach(sess => {
            if (sess.subjectId && subjectMap[sess.subjectId]) {
                subjectMap[sess.subjectId].duration += Math.round(sess.duration || 0);
            }
        });
        // Convert to arrays for chart
        const subjectData = Object.values(subjectMap).map(item => item.duration);
        const subjectLabels = Object.values(subjectMap).map(item => item.name);
        // If no data, fallback to a placeholder
        const hasSubjectData = subjectData.some(d => d > 0);
        const finalSubjectLabels = hasSubjectData ? subjectLabels : ['No Subjects'];
        const finalSubjectValues = hasSubjectData ? subjectData : [1];


        // Compute top subjects by study time
        const topSubjects = Object.values(subjectMap).sort((a, b) => b.duration - a.duration).slice(0, 5);

        // Recent sessions (most recent 8)
        const recentSessions = sessions.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 8);

        // Flashcards due (count across decks)
        const decks = this.store.getDecks ? this.store.getDecks() : [];
        let flashcardsDue = 0;
        const nowISO = new Date().toISOString();
        decks.forEach(d => {
            (d.cards || []).forEach(c => {
                if (!c.nextReview || (c.nextReview && c.nextReview <= nowISO)) flashcardsDue++;
            });
        });

        container.innerHTML = `
            <div class="analytics-container animate-fade-in">
                <!-- Hero Header -->
                <div class="card" style="margin-bottom: 2rem; padding: 1.75rem; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark, #4338ca) 100%); color: white; border: none;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1.5rem; flex-wrap: wrap;">
                        <div>
                            <h2 style="font-weight: 800; margin-bottom: 0.5rem; font-size: 1.9rem;">Analytics & Insights</h2>
                            <p style="margin: 0; opacity: 0.9;">See how your focus, streaks and subjects are progressing over time.</p>
                        </div>
                        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                            <div style="padding: 0.5rem 0.9rem; border-radius: 999px; background: rgba(15,23,42,0.25); font-size: 0.85rem; display:flex; align-items:center; gap:0.35rem;">
                                <span>⏱️</span>
                                <span>${hours}h ${minutes}m total</span>
                            </div>
                            <div style="padding: 0.5rem 0.9rem; border-radius: 999px; background: rgba(15,23,42,0.25); font-size: 0.85rem; display:flex; align-items:center; gap:0.35rem;">
                                <span>🔥</span>
                                <span>${user.streak} day streak</span>
                            </div>
                            <div style="padding: 0.5rem 0.9rem; border-radius: 999px; background: rgba(15,23,42,0.25); font-size: 0.85rem; display:flex; align-items:center; gap:0.35rem;">
                                <span>📚</span>
                                <span>${totalSessions} sessions logged</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Key Stats Row -->
                <div class="grid-3" style="margin-bottom: 2rem; gap: 1.5rem;">
                    <div class="card stat-card" style="position: relative; overflow: hidden;">
                        <div style="position:absolute; right:-12px; top:-12px; width:48px; height:48px; border-radius:50%; background: rgba(99,102,241,0.08);"></div>
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">📈</div>
                        <div>
                            <p class="stat-label">Weekly Focus</p>
                            <p class="stat-value">${weeklyHours} <span style="font-size: 1rem; color: var(--text-muted); font-weight: 400;">hours</span></p>
                            <p class="text-muted" style="font-size: 0.8rem; margin-top: 0.25rem;">Last 7 days of study time</p>
                        </div>
                    </div>
                    <div class="card stat-card" style="position: relative; overflow: hidden;">
                        <div style="position:absolute; right:-12px; top:-12px; width:48px; height:48px; border-radius:50%; background: rgba(248,113,113,0.08);"></div>
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔥</div>
                        <div>
                            <p class="stat-label">Current Streak</p>
                            <p class="stat-value">${user.streak} <span style="font-size: 1rem; color: var(--text-muted); font-weight: 400;">days</span></p>
                            <p class="text-muted" style="font-size: 0.8rem; margin-top: 0.25rem;">Keep logging in daily to grow this.</p>
                        </div>
                    </div>
                    <div class="card stat-card" style="position: relative; overflow: hidden;">
                        <div style="position:absolute; right:-12px; top:-12px; width:48px; height:48px; border-radius:50%; background: rgba(45,212,191,0.08);"></div>
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎓</div>
                        <div>
                            <p class="stat-label">Total Focus Time</p>
                            <p class="stat-value">${hours}h ${minutes}m</p>
                            <p class="text-muted" style="font-size: 0.8rem; margin-top: 0.25rem;">All sessions combined.</p>
                        </div>
                    </div>
                </div>

                <!-- Charts Row -->
                <div class="grid-2" style="margin-bottom: 2rem; gap: 1.5rem;">
                    <div class="card chart-card">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
                            <div>
                                <h4 style="margin: 0;">📊 Study Time (Last 7 Days)</h4>
                                <p class="text-muted" style="margin: 0; font-size: 0.85rem;">See which days you focused the most.</p>
                            </div>
                            <span style="font-size: 0.8rem; color: var(--text-muted); padding: 0.25rem 0.6rem; border-radius: 999px; background: var(--bg-body);">Minutes</span>
                        </div>
                        <div style="height: 280px;">
                            <canvas id="studyTimeChart"></canvas>
                        </div>
                    </div>
                    <div class="card chart-card">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
                            <div>
                                <h4 style="margin: 0;">🎯 Subject Distribution</h4>
                                <p class="text-muted" style="margin: 0; font-size: 0.85rem;">How your time is split between subjects.</p>
                            </div>
                            <span style="font-size: 0.8rem; color: var(--text-muted); padding: 0.25rem 0.6rem; border-radius: 999px; background: var(--bg-body);">By time</span>
                        </div>
                        <div style="height: 280px; display: flex; justify-content: center;">
                            <canvas id="subjectDistChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Heatmap & AI Insights -->
                <div class="grid-2" style="gap: 1.5rem;">
                    <div class="card">
                        <h4 style="margin-bottom: 0.75rem;">Study Heatmap (Last 30 Days)</h4>
                        <p class="text-muted" style="margin-bottom: 0.75rem; font-size: 0.85rem;">Darker squares mean more minutes studied on that day.</p>
                        <div id="heatmap-container" style="display: flex; gap: 4px; flex-wrap: wrap; max-width: 800px;">
                            <!-- Heatmap generated in afterRender -->
                        </div>
                    </div>

                    <div class="card">
                        <h4 style="margin-bottom: 0.75rem;">💡 Smart Insights</h4>
                        <ul style="margin-top: 0.5rem; padding-left: 1.5rem; display: flex; flex-direction: column; gap: 0.55rem; font-size: 0.95rem;">
                            <li>You're most productive on <strong>${this.getPeakDay(sessions)}</strong>.</li>
                            <li>Your average session length is <strong>${this.getAverageSessionLength(sessions)} minutes</strong>.</li>
                            <li>Top subject this week: <strong>${topSubjects.length ? topSubjects[0].name : 'N/A'}</strong>.</li>
                            <li>${user.streak > 3 ? 'You are on fire! Keep the streak alive! 🔥' : 'Consistency is key. Try to study for at least 15 mins every day.'}</li>
                        </ul>
                    </div>
                </div>

                <!-- Lists & Details -->
                <div class="grid-2" style="margin-top: 1.75rem; gap: 1.5rem;">
                    <div class="card">
                        <h4 style="margin-bottom: 0.75rem;">Top Subjects</h4>
                        ${topSubjects.length ? `
                            <div style="display:flex; flex-direction:column; gap:0.4rem;">
                                ${topSubjects.map(s => `
                                    <div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem 0; border-bottom:1px solid var(--border);">
                                        <div>
                                            <div style="font-weight:600;">${s.name}</div>
                                            <div class="text-muted" style="font-size:0.8rem;">${Math.round(s.duration/60)} min studied</div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p class="text-muted">No subject study data yet. Start a focus session with a subject selected.</p>'}
                        <div style="margin-top:1rem; font-size: 0.9rem; color: var(--text-muted); padding:0.65rem 0.9rem; border-radius: 999px; background: var(--bg-body); display:inline-flex; align-items:center; gap:0.4rem;">
                            <span>🧠</span>
                            <span>Flashcards due: <strong>${flashcardsDue}</strong></span>
                        </div>
                    </div>

                    <div class="card">
                        <h4 style="margin-bottom: 0.75rem;">Recent Sessions</h4>
                        ${recentSessions.length ? `
                            <div style="display:flex; flex-direction:column; gap:0.6rem; max-height:260px; overflow-y:auto; padding-right:0.25rem;">
                                ${recentSessions.map(s => `
                                    <div style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0; border-bottom:1px solid var(--border);">
                                        <div>
                                            <div style="font-weight:600;">${s.subjectId ? (subjects.find(x=>x.id===s.subjectId)?.name || 'Unknown') : 'General'}</div>
                                            <div class="text-muted" style="font-size:0.8rem;">${new Date(s.timestamp).toLocaleString()}</div>
                                        </div>
                                        <div style="font-weight:700; color:var(--text-muted);">${Math.round(s.duration || 0)}m</div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p class="text-muted">No recent study sessions.</p>'}
                    </div>
                </div>

                <!-- Subject Study Time Bar Chart -->
                <div class="card" style="margin-top: 2rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
                        <div>
                            <h4 style="margin: 0;">📊 Study Time by Subject</h4>
                            <p class="text-muted" style="margin: 0; font-size: 0.85rem;">Breakdown of all minutes per subject.</p>
                        </div>
                        <span style="font-size: 0.8rem; color: var(--text-muted); padding: 0.25rem 0.6rem; border-radius: 999px; background: var(--bg-body);">Total minutes</span>
                    </div>
                    <div style="height: 350px;">
                        <canvas id="subjectTimeChart"></canvas>
                    </div>
                </div>
            </div>
        `;
    }

    getPeakDay(sessions) {
        if (sessions.length === 0) return 'N/A';
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const counts = new Array(7).fill(0);
        sessions.forEach(s => {
            const day = new Date(s.timestamp).getDay();
            counts[day]++;
        });
        const maxDay = counts.indexOf(Math.max(...counts));
        return days[maxDay];
    }

    getAverageSessionLength(sessions) {
        if (sessions.length === 0) return 0;
        const total = Math.round(sessions.reduce((acc, s) => acc + (s.duration || 0), 0));
        return Math.round(total / sessions.length);
    }

    async afterRender() {
        const container = document.getElementById('app-view');
        
        // Check if Chart.js is available
        if (typeof Chart === 'undefined' || Chart === null) {
            console.warn('Chart.js not loaded - using table view');
            // Get data for table view
            const sessions = this.store.getSessions() || [];
            const subjects = this.store.getSubjects() || [];
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - 6 + i);
                return d.toISOString().split('T')[0];
            });
            const studyTimeData = last7Days.map(date => {
                return Math.round(sessions
                    .filter(s => s.timestamp && s.timestamp.startsWith(date))
                    .reduce((acc, s) => acc + (s.duration || 0), 0));
            });
            const subjectMap = {};
            subjects.forEach(sub => {
                subjectMap[sub.id] = { name: sub.name, duration: 0 };
            });
            sessions.forEach(sess => {
                if (sess.subjectId && subjectMap[sess.subjectId]) {
                    subjectMap[sess.subjectId].duration += Math.round(sess.duration || 0);
                }
            });
            const topSubjects = Object.values(subjectMap).sort((a, b) => b.duration - a.duration).slice(0, 5);
            const totalStudyTime = Math.round(sessions.reduce((acc, s) => acc + (s.duration || 0), 0));
            this.renderDataTables(container, studyTimeData, subjectMap, topSubjects, totalStudyTime);
            return;
        }

        // Configure Chart.js to not use storage (fixes tracking prevention issues)
        try {
            if (Chart.defaults) {
                Chart.defaults.plugins.legend.display = true;
                // Disable any storage usage
                if (Chart.plugins) {
                    Chart.plugins.register = Chart.plugins.register || function() {};
                }
            }
        } catch (e) {
            console.warn('Chart.js configuration error:', e);
            return;
        }

        const sessions = this.store.getSessions() || [];
        const subjects = this.store.getSubjects() || [];

        // Prepare Data
        const last7DaysLabels = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - 6 + i);
            return d.toLocaleDateString('en-US', { weekday: 'short' });
        });

        const last7DaysDates = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - 6 + i);
            return d.toISOString().split('T')[0];
        });

        const studyTimeData = last7DaysDates.map(date => {
            return sessions
                .filter(s => s.timestamp && s.timestamp.startsWith(date))
                .reduce((acc, s) => acc + s.duration, 0);
        });

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
            document.documentElement.getAttribute('data-theme') === 'midnight' ||
            document.documentElement.getAttribute('data-theme') === 'forest';

        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
        const textColor = isDark ? '#94a3b8' : '#64748b';
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();

        const ctxTime = document.getElementById('studyTimeChart');
        if (ctxTime) {
            // Show message if no data
            if (studyTimeData.every(d => d === 0)) {
                ctxTime.parentElement.innerHTML = '<p class="text-muted" style="text-align: center; padding: 40px;">No study sessions logged yet. Start a Pomodoro session to see your data here.</p>';
            } else {
                try {
                    if (typeof Chart === 'undefined' || Chart === null) {
                        console.warn('Chart.js not available for time chart');
                        return;
                    }
                    new Chart(ctxTime.getContext('2d'), {
                        type: 'bar',
                        data: {
                            labels: last7DaysLabels,
                            datasets: [{
                                label: 'Minutes Studied',
                                data: studyTimeData,
                                backgroundColor: primaryColor,
                                borderRadius: 8,
                                borderSkipped: false,
                                hoverBackgroundColor: '#4f46e5'
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            interaction: {
                                intersect: false,
                                mode: 'index'
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    grid: { color: gridColor, drawBorder: false },
                                    ticks: { color: textColor, font: { size: 12 } }
                                },
                                x: {
                                    grid: { display: false, drawBorder: false },
                                    ticks: { color: textColor, font: { size: 12 } }
                                }
                            },
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    backgroundColor: 'rgba(0,0,0,0.8)',
                                    padding: 12,
                                    titleFont: { size: 14 },
                                    bodyFont: { size: 13 },
                                    borderColor: primaryColor,
                                    borderWidth: 1
                                }
                            }
                        }
                    });
                } catch (error) {
                    console.error('Error creating study time chart:', error);
                    ctxTime.parentElement.innerHTML = '<p class="text-muted" style="text-align: center; padding: 40px;">Unable to load chart. Please refresh the page.</p>';
                }
            }
        }

        // Subject Chart (real data)
        const ctxSub = document.getElementById('subjectDistChart');
        if (ctxSub) {
            // Build subject map
            const subjectMap = {};
            subjects.forEach(sub => {
                subjectMap[sub.id] = { name: sub.name, duration: 0 };
            });
            sessions.forEach(sess => {
                if (sess.subjectId && subjectMap[sess.subjectId]) {
                    subjectMap[sess.subjectId].duration += Math.round(sess.duration || 0);
                }
            });
            const realSubjectLabels = Object.values(subjectMap).map(item => item.name);
            const realSubjectValues = Object.values(subjectMap).map(item => item.duration);
            const hasData = realSubjectValues.some(v => v > 0);
            
            if (!hasData) {
                ctxSub.parentElement.innerHTML = '<p class="text-muted" style="text-align: center; padding: 40px;">No subject data yet. Start a Pomodoro session with a subject to see the distribution.</p>';
            } else {
                const chartLabels = realSubjectLabels;
                const chartValues = realSubjectValues;
                try {
                    if (typeof Chart === 'undefined' || Chart === null) {
                        console.warn('Chart.js not available for subject chart');
                        return;
                    }
                    new Chart(ctxSub.getContext('2d'), {
                        type: 'doughnut',
                        data: {
                            labels: chartLabels,
                            datasets: [{
                                data: chartValues,
                                backgroundColor: [
                                    '#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'
                                ],
                                borderWidth: 2,
                                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim()
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            cutout: '60%',
                            interaction: {
                                intersect: false
                            },
                            plugins: {
                                legend: {
                                    position: 'bottom',
                                    labels: { color: textColor, boxWidth: 12, usePointStyle: true, padding: 15, font: { size: 12 } }
                                },
                                tooltip: {
                                    backgroundColor: 'rgba(0,0,0,0.8)',
                                    padding: 12,
                                    titleFont: { size: 14 },
                                    bodyFont: { size: 13 },
                                    callbacks: {
                                        label: function(context) {
                                            return context.label + ': ' + context.parsed + ' mins';
                                        }
                                    }
                                }
                            }
                        }
                    });
                } catch (error) {
                    console.error('Error creating subject chart:', error);
                    ctxSub.parentElement.innerHTML = '<p class="text-muted" style="text-align: center; padding: 40px;">Unable to load chart. Please refresh the page.</p>';
                }
            }
        }


        // Generate Heatmap
        const heatmapContainer = document.getElementById('heatmap-container');
        if (!heatmapContainer) return;
        
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];

            const minutes = Math.round((sessions || [])
                .filter(s => s && s.timestamp && s.timestamp.startsWith(dateStr))
                .reduce((acc, s) => acc + (s.duration || 0), 0));

            let opacity = 0.1;
            if (minutes > 0) opacity = 0.3;
            if (minutes > 30) opacity = 0.6;
            if (minutes > 60) opacity = 0.8;
            if (minutes > 120) opacity = 1.0;

            const box = document.createElement('div');
            box.style.width = '24px';
            box.style.height = '24px';
            box.style.borderRadius = '4px';
            box.style.backgroundColor = primaryColor;
            box.style.opacity = minutes === 0 ? '0.1' : opacity;
            box.style.cursor = 'pointer';
            box.title = `${dateStr}: ${minutes} mins`;
            box.style.transition = 'all 0.2s';

            if (minutes === 0) box.style.backgroundColor = 'var(--text-muted)';

            box.addEventListener('mouseenter', () => { box.style.transform = 'scale(1.2)'; });
            box.addEventListener('mouseleave', () => { box.style.transform = 'scale(1)'; });

            heatmapContainer.appendChild(box);
        }

        // Subject Study Time Bar Chart
        const ctxSubjectTime = document.getElementById('subjectTimeChart');
        if (ctxSubjectTime) {
            // Build subject study time data - include all subjects that have sessions
            const subjectTimeMap = {};
            
            // First, add all subjects from the subjects list
            subjects.forEach(sub => {
                subjectTimeMap[sub.id] = {
                    name: sub.name,
                    duration: 0,
                    color: sub.color || primaryColor
                };
            });
            
            // Add "General" for sessions without subject
            subjectTimeMap['general'] = {
                name: 'General',
                duration: 0,
                color: '#94a3b8'
            };

            // Accumulate study time per subject from all sessions
            sessions.forEach(sess => {
                // Ensure duration is a whole number
                const duration = Math.round(sess.duration || 0);
                if (duration > 0) {
                    if (sess.subjectId && subjectTimeMap[sess.subjectId]) {
                        subjectTimeMap[sess.subjectId].duration += duration;
                    } else {
                        // Session without subject or subject doesn't exist anymore
                        subjectTimeMap['general'].duration += duration;
                    }
                }
            });

            // Filter out subjects with no study time and sort by duration
            // Keep all subjects with duration > 0 (including 1 minute)
            const subjectTimeData = Object.values(subjectTimeMap)
                .filter(item => item.duration > 0)
                .sort((a, b) => b.duration - a.duration);

            if (subjectTimeData.length === 0) {
                ctxSubjectTime.parentElement.innerHTML = '<p class="text-muted" style="text-align: center; padding: 40px;">No subject study data yet. Start a focus session and select a subject to see your study time breakdown.</p>';
            } else {
                const chartLabels = subjectTimeData.map(item => item.name);
                const chartValues = subjectTimeData.map(item => item.duration);
                const chartColors = subjectTimeData.map(item => item.color);

                try {
                    if (typeof Chart === 'undefined' || Chart === null) {
                        console.warn('Chart.js not available for subject time chart');
                        return;
                    }
                    new Chart(ctxSubjectTime.getContext('2d'), {
                        type: 'bar',
                        data: {
                            labels: chartLabels,
                            datasets: [{
                                label: 'Minutes Studied',
                                data: chartValues,
                                backgroundColor: chartColors,
                                borderRadius: 8,
                                borderSkipped: false,
                                borderWidth: 0,
                                minBarLength: 5 // Ensure even 1 minute shows as a visible bar
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            indexAxis: 'y', // Horizontal bar chart
                            scales: {
                                x: {
                                    beginAtZero: true,
                                    min: 0,
                                    grid: { color: gridColor, drawBorder: false },
                                    ticks: { 
                                        color: textColor, 
                                        font: { size: 12 },
                                        stepSize: 1, // Show every minute
                                        callback: function(value) {
                                            // Always show minutes, even for small values
                                            if (value === 0) return '0';
                                            if (value < 1) return value.toFixed(1) + ' min';
                                            return Math.round(value) + ' min';
                                        }
                                    }
                                },
                                y: {
                                    grid: { display: false, drawBorder: false },
                                    ticks: { color: textColor, font: { size: 12 } }
                                }
                            },
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    backgroundColor: 'rgba(0,0,0,0.8)',
                                    padding: 12,
                                    titleFont: { size: 14 },
                                    bodyFont: { size: 13 },
                                    borderColor: primaryColor,
                                    borderWidth: 1,
                                    callbacks: {
                                        label: function(context) {
                                            const minutes = context.parsed.x;
                                            // Always show in minutes for clarity
                                            if (minutes < 1) {
                                                return Math.round(minutes * 60) + ' seconds';
                                            }
                                            const hours = Math.floor(minutes / 60);
                                            const mins = Math.round(minutes % 60);
                                            if (hours > 0) {
                                                return `${hours}h ${mins}m (${Math.round(minutes)} min total)`;
                                            }
                                            return `${Math.round(minutes)} minute${Math.round(minutes) !== 1 ? 's' : ''}`;
                                        }
                                    }
                                }
                            }
                        }
                    });
                } catch (error) {
                    console.error('Error creating subject time chart:', error);
                    ctxSubjectTime.parentElement.innerHTML = '<p class="text-muted" style="text-align: center; padding: 40px;">Unable to load chart. Please refresh the page.</p>';
                }
            }
        }
    }

    // Fallback: Render data in table format when Chart.js is not available
    renderDataTables(container, studyTimeData, subjectMap, topSubjects, totalStudyTime) {
        const hours = Math.floor(totalStudyTime / 60);
        const minutes = totalStudyTime % 60;
        
        // Find the analytics container or create a new one
        let analyticsContainer = container.querySelector('.analytics-container');
        if (!analyticsContainer) {
            analyticsContainer = container;
        }
        
        const tableHTML = `
            <div class="card" style="margin-top: 2rem;">
                <h3 style="margin-bottom: 1rem; color: var(--text-muted);">📅 Study Time - Last 7 Days</h3>
                <p class="text-muted" style="margin-bottom: 1rem; font-size: 0.9rem;">
                    Charts are disabled (tracking prevention). Data shown in tables below.
                </p>
                <table class="data-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: var(--bg-body);">
                            <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid var(--border);">Date</th>
                            <th style="padding: 0.75rem; text-align: right; border-bottom: 2px solid var(--border);">Minutes</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${studyTimeData.map((minutes, index) => {
                            const date = new Date();
                            date.setDate(date.getDate() - 6 + index);
                            const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                            return `
                                <tr style="border-bottom: 1px solid var(--border);">
                                    <td style="padding: 0.75rem;">${dateStr}</td>
                                    <td style="padding: 0.75rem; text-align: right; font-weight: 600;">${minutes}m</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <div class="card" style="margin-top: 2rem;">
                <h3 style="margin-bottom: 1rem;">📚 Top Subjects by Study Time</h3>
                ${topSubjects.length > 0 ? `
                    <table class="data-table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: var(--bg-body);">
                                <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid var(--border);">Subject</th>
                                <th style="padding: 0.75rem; text-align: right; border-bottom: 2px solid var(--border);">Study Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${topSubjects.map(subject => {
                                const hours = Math.floor(subject.duration / 60);
                                const mins = subject.duration % 60;
                                return `
                                    <tr style="border-bottom: 1px solid var(--border);">
                                        <td style="padding: 0.75rem;">${subject.name}</td>
                                        <td style="padding: 0.75rem; text-align: right; font-weight: 600;">${hours}h ${mins}m</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                ` : `
                    <p class="text-muted" style="text-align: center; padding: 2rem;">No subject data available yet. Start studying to see your progress!</p>
                `}
            </div>
        `;
        
        // Append tables to the container
        analyticsContainer.insertAdjacentHTML('beforeend', tableHTML);
    }
}
