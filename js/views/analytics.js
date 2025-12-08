class AnalyticsView {
    constructor(store) {
        this.store = store;
    }

    async render(container) {
        container.innerHTML = `<div class="loading-spinner">Loading analytics...</div>`;
        
        const sessions = this.store.getSessions() || [];
        const subjects = this.store.getSubjects() || [];
        const user = this.store.getUser();

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

        const totalStudyTime = Math.round(sessions.reduce((acc, s) => acc + (s.duration || 0), 0));

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
        const recentSessions = sessions.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 8);
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
                <div class="analytics-header">
                    <h2 class="analytics-title">Analytics & Insights</h2>
                    <p class="text-muted">Track your progress and optimize your study habits.</p>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">📈</div>
                        <div>
                            <p class="stat-label">Weekly Focus</p>
                            <p class="stat-value">${studyTimeData.length > 0 ? Math.round(studyTimeData.reduce((a, b) => a + b, 0) / 60) : 0} <span class="stat-unit">hours</span></p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🔥</div>
                        <div>
                            <p class="stat-label">Current Streak</p>
                            <p class="stat-value">${user.streak} <span class="stat-unit">days</span></p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🎓</div>
                        <div>
                            <p class="stat-label">Total Hours</p>
                            <p class="stat-value">${Math.floor(totalStudyTime / 60)} <span class="stat-unit">hours</span></p>
                        </div>
                    </div>
                </div>

                <div class="charts-grid">
                    <div class="chart-card">
                        <div class="card-header">
                            <h4 class="card-title">📊 Study Time (Last 7 Days)</h4>
                            <span class="chart-unit">minutes</span>
                        </div>
                        <div class="chart-container">
                            <canvas id="studyTimeChart"></canvas>
                        </div>
                    </div>
                    <div class="chart-card">
                        <div class="card-header">
                            <h4 class="card-title">🎯 Subject Distribution</h4>
                            <span class="chart-unit">by time</span>
                        </div>
                        <div class="chart-container">
                            <canvas id="subjectDistChart"></canvas>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <h4 class="card-title">Study Heatmap (Last 30 Days)</h4>
                    <div id="heatmap-container" class="heatmap-container"></div>
                </div>

                <div class="card ai-insights-card">
                    <h4 class="card-title">💡 AI Insights</h4>
                    <ul class="insights-list">
                        <li>You're most productive on <strong>${this.getPeakDay(sessions)}</strong>.</li>
                        <li>Your average session length is <strong>${this.getAverageSessionLength(sessions)} minutes</strong>.</li>
                        <li>Top subject this week: <strong>${topSubjects.length ? topSubjects[0].name : 'N/A'}</strong>.</li>
                        <li>${user.streak > 3 ? 'You are on fire! Keep the streak alive!' : 'Consistency is key. Try to study for at least 15 mins every day.'}</li>
                    </ul>
                </div>

                <div class="details-grid">
                    <div class="card">
                        <h4 class="card-title">Top Subjects</h4>
                        ${topSubjects.length ? `<ul class="top-subjects-list">${topSubjects.map(s => `<li><strong>${s.name}</strong> — ${Math.round(s.duration/60)} mins</li>`).join('')}</ul>` : '<p class="text-muted">No subject study data yet.</p>'}
                        <div class="flashcards-due">Flashcards due: <strong>${flashcardsDue}</strong></div>
                    </div>

                    <div class="card">
                        <h4 class="card-title">Recent Sessions</h4>
                        ${recentSessions.length ? `<div class="recent-sessions-list">${recentSessions.map(s => `<div class="session-item"><div><strong>${s.subjectId ? (subjects.find(x=>x.id===s.subjectId)?.name || 'Unknown') : 'General'}</strong><div class="text-muted session-timestamp">${new Date(s.timestamp).toLocaleString()}</div></div><div class="session-duration">${Math.round(s.duration || 0)}m</div></div>`).join('')}</div>` : '<p class="text-muted">No recent study sessions.</p>'}
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h4 class="card-title">📊 Study Time by Subject</h4>
                        <span class="chart-unit">total minutes</span>
                    </div>
                    <div class="chart-container-large">
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
        
        if (typeof Chart === 'undefined' || Chart === null) {
            console.warn('Chart.js not loaded - using table view');
            this.renderDataTables(container, this.store.getSessions() || [], this.store.getSubjects() || []);
            return;
        }

        try {
            if (Chart.defaults) {
                Chart.defaults.plugins.legend.display = true;
            }
        } catch (e) {
            console.warn('Chart.js configuration error:', e);
            return;
        }

        const sessions = this.store.getSessions() || [];
        const subjects = this.store.getSubjects() || [];

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
            if (studyTimeData.every(d => d === 0)) {
                ctxTime.parentElement.innerHTML = '<p class="text-muted empty-chart-message">No study sessions logged yet. Start a Pomodoro session to see your data here.</p>';
            } else {
                try {
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
                            interaction: { intersect: false, mode: 'index' },
                            scales: {
                                y: { beginAtZero: true, grid: { color: gridColor, drawBorder: false }, ticks: { color: textColor, font: { size: 12 } } },
                                x: { grid: { display: false, drawBorder: false }, ticks: { color: textColor, font: { size: 12 } } }
                            },
                            plugins: {
                                legend: { display: false },
                                tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', padding: 12, titleFont: { size: 14 }, bodyFont: { size: 13 }, borderColor: primaryColor, borderWidth: 1 }
                            }
                        }
                    });
                } catch (error) {
                    console.error('Error creating study time chart:', error);
                    ctxTime.parentElement.innerHTML = '<p class="text-muted empty-chart-message">Unable to load chart. Please refresh the page.</p>';
                }
            }
        }

        const ctxSub = document.getElementById('subjectDistChart');
        if (ctxSub) {
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
                ctxSub.parentElement.innerHTML = '<p class="text-muted empty-chart-message">No subject data yet. Start a Pomodoro session with a subject to see the distribution.</p>';
            } else {
                try {
                    new Chart(ctxSub.getContext('2d'), {
                        type: 'doughnut',
                        data: {
                            labels: realSubjectLabels,
                            datasets: [{
                                data: realSubjectValues,
                                backgroundColor: ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
                                borderWidth: 2,
                                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim()
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            cutout: '60%',
                            plugins: {
                                legend: { position: 'bottom', labels: { color: textColor, boxWidth: 12, usePointStyle: true, padding: 15, font: { size: 12 } } },
                                tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', padding: 12, titleFont: { size: 14 }, bodyFont: { size: 13 }, callbacks: { label: (context) => context.label + ': ' + context.parsed + ' mins' } }
                            }
                        }
                    });
                } catch (error) {
                    console.error('Error creating subject chart:', error);
                    ctxSub.parentElement.innerHTML = '<p class="text-muted empty-chart-message">Unable to load chart. Please refresh the page.</p>';
                }
            }
        }

        const heatmapContainer = document.getElementById('heatmap-container');
        if (!heatmapContainer) return;
        
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];

            const minutes = Math.round((sessions || []).filter(s => s && s.timestamp && s.timestamp.startsWith(dateStr)).reduce((acc, s) => acc + (s.duration || 0), 0));

            let opacity = 0.1;
            if (minutes > 0) opacity = 0.3;
            if (minutes > 30) opacity = 0.6;
            if (minutes > 60) opacity = 0.8;
            if (minutes > 120) opacity = 1.0;

            const box = document.createElement('div');
            box.className = 'heatmap-box';
            box.style.backgroundColor = primaryColor;
            box.style.opacity = minutes === 0 ? '0.1' : opacity;
            box.title = `${dateStr}: ${minutes} mins`;
            if (minutes === 0) box.style.backgroundColor = 'var(--text-muted)';

            heatmapContainer.appendChild(box);
        }

        const ctxSubjectTime = document.getElementById('subjectTimeChart');
        if (ctxSubjectTime) {
            const subjectTimeMap = {};
            subjects.forEach(sub => { subjectTimeMap[sub.id] = { name: sub.name, duration: 0, color: sub.color || primaryColor }; });
            subjectTimeMap['general'] = { name: 'General', duration: 0, color: '#94a3b8' };

            sessions.forEach(sess => {
                const duration = Math.round(sess.duration || 0);
                if (duration > 0) {
                    if (sess.subjectId && subjectTimeMap[sess.subjectId]) {
                        subjectTimeMap[sess.subjectId].duration += duration;
                    } else {
                        subjectTimeMap['general'].duration += duration;
                    }
                }
            });

            const subjectTimeData = Object.values(subjectTimeMap).filter(item => item.duration > 0).sort((a, b) => b.duration - a.duration);

            if (subjectTimeData.length === 0) {
                ctxSubjectTime.parentElement.innerHTML = '<p class="text-muted empty-chart-message">No subject study data yet. Start a focus session and select a subject to see your study time breakdown.</p>';
            } else {
                try {
                    new Chart(ctxSubjectTime.getContext('2d'), {
                        type: 'bar',
                        data: {
                            labels: subjectTimeData.map(item => item.name),
                            datasets: [{
                                label: 'Minutes Studied',
                                data: subjectTimeData.map(item => item.duration),
                                backgroundColor: subjectTimeData.map(item => item.color),
                                borderRadius: 8,
                                borderSkipped: false,
                                minBarLength: 5
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            indexAxis: 'y',
                            scales: {
                                x: { beginAtZero: true, min: 0, grid: { color: gridColor, drawBorder: false }, ticks: { color: textColor, font: { size: 12 }, stepSize: 1, callback: (value) => Math.round(value) + ' min' } },
                                y: { grid: { display: false, drawBorder: false }, ticks: { color: textColor, font: { size: 12 } } }
                            },
                            plugins: {
                                legend: { display: false },
                                tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', padding: 12, titleFont: { size: 14 }, bodyFont: { size: 13 }, borderColor: primaryColor, borderWidth: 1, callbacks: { label: (context) => Math.round(context.parsed.x) + ' minutes' } }
                            }
                        }
                    });
                } catch (error) {
                    console.error('Error creating subject time chart:', error);
                    ctxSubjectTime.parentElement.innerHTML = '<p class="text-muted empty-chart-message">Unable to load chart. Please refresh the page.</p>';
                }
            }
        }
    }

    renderDataTables(container, sessions, subjects) {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - 6 + i);
            return d.toISOString().split('T')[0];
        });
        const studyTimeData = last7Days.map(date => {
            return Math.round(sessions.filter(s => s.timestamp && s.timestamp.startsWith(date)).reduce((acc, s) => acc + (s.duration || 0), 0));
        });

        const subjectMap = {};
        subjects.forEach(sub => { subjectMap[sub.id] = { name: sub.name, duration: 0 }; });
        sessions.forEach(sess => {
            if (sess.subjectId && subjectMap[sess.subjectId]) {
                subjectMap[sess.subjectId].duration += Math.round(sess.duration || 0);
            }
        });
        const topSubjects = Object.values(subjectMap).sort((a, b) => b.duration - a.duration).slice(0, 5);

        const tableHTML = `
            <div class="card" style="margin-top: 2rem;">
                <h3 class="card-title">📅 Study Time - Last 7 Days</h3>
                <p class="text-muted">Charts are disabled. Data shown in tables below.</p>
                <table class="data-table">
                    <thead><tr><th>Date</th><th>Minutes</th></tr></thead>
                    <tbody>
                        ${studyTimeData.map((minutes, index) => {
                            const date = new Date();
                            date.setDate(date.getDate() - 6 + index);
                            return `<tr><td>${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td><td>${minutes}m</td></tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <div class="card" style="margin-top: 2rem;">
                <h3 class="card-title">📚 Top Subjects by Study Time</h3>
                ${topSubjects.length > 0 ? `
                    <table class="data-table">
                        <thead><tr><th>Subject</th><th>Study Time</th></tr></thead>
                        <tbody>
                            ${topSubjects.map(subject => {
                                const hours = Math.floor(subject.duration / 60);
                                const mins = subject.duration % 60;
                                return `<tr><td>${subject.name}</td><td>${hours}h ${mins}m</td></tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                ` : `<p class="text-muted">No subject data available yet.</p>`}
            </div>
        `;
        
        container.querySelector('.analytics-container').insertAdjacentHTML('beforeend', tableHTML);
    }
}
