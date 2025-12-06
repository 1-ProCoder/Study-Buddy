class TimetableView {
    constructor(store) {
        this.store = store;
    }

    async render(container) {
        const timetable = this.store.getTimetable();
        let html = '';

        if (timetable) {
            html = this.renderTimetable(timetable);
        } else {
            const subjects = this.store.getSubjects();
            if (subjects.length === 0) {
                html = `
                <div class="card center-content">
                    <h3>No Subjects Found</h3>
                    <p>Please add some subjects in the 'Subjects' tab before creating a timetable.</p>
                    <a href="#subjects" class="btn btn-primary mt-2">Go to Subjects</a>
                </div>
            `;
            } else {
                html = `
            <div class="timetable-container">
                <div class="card form-card">
                    <h3>📅 Create Your Study Schedule</h3>
                    <p class="text-muted">Tell us your availability and we'll balance your study time.</p>
                    
                    <form id="timetable-form">
                        <div class="form-group">
                            <label>Exam Date / Goal Date</label>
                            <input type="date" id="exam-date" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Daily Study Hours</label>
                            <input type="number" id="daily-hours" min="1" max="12" value="2" required>
                        </div>

                        <div class="form-group">
                            <label>Select Subjects to Study</label>
                            <div class="checkbox-group">
                                ${subjects.map(s => `
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="subjects" value="${s.id}" checked>
                                        ${s.name}
                                    </label>
                                `).join('')}
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary full-width">Generate Timetable ✨</button>
                    </form>
                </div>
            </div>
        `;
            }
        }

        if (container) container.innerHTML = html;
        return html;
    }

    renderTimetable(timetable) {
        return `
            <div class="timetable-results animate-fade-in">
                <div class="header-actions">
                    <div>
                        <h3>Your Weekly Schedule</h3>
                        <p class="text-muted">A high-level view of your study plan — click Create New to regenerate.</p>
                    </div>
                    <div class="timetable-controls">
                        <div class="timetable-legend">
                            <div class="legend-item"><span class="legend-swatch" style="background: var(--primary)"></span> Core</div>
                            <div class="legend-item"><span class="legend-swatch" style="background: var(--accent)"></span> Review</div>
                        </div>
                        <button class="btn btn-secondary" id="add-event">+ Add Event</button>
                        <button class="btn btn-secondary" id="reset-timetable">Create New</button>
                    </div>
                </div>

                <div class="timetable-grid">
                    ${Object.entries(timetable.schedule).map(([day, slots]) => `
                        <div class="card day-card">
                            <h4 class="day-title">${day} <small class="text-muted">· ${slots.length} ${slots.length===1? 'slot':'slots'}</small></h4>
                            <div class="day-slots">
                                ${slots.length > 0 ? slots.map(slot => `
                                    <div class="slot" style="border-left: 6px solid ${slot.color}">
                                        <span class="slot-subject">${slot.subject}</span>
                                        <span class="slot-time">${slot.duration} mins</span>
                                    </div>
                                `).join('') : '<p class="text-muted">Rest Day 😴</p>'}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Add Event Modal -->
                <div id="event-modal" class="modal hidden">
                    <div class="modal-backdrop"></div>
                    <div class="modal-content-premium event-modal">
                        <div class="modal-header">
                            <h3>Add Timetable Event</h3>
                            <button class="modal-close" id="cancel-event">
                                ✕
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label>Day</label>
                                <select id="event-day">
                                    ${Object.keys(timetable.schedule).map(d => `<option value="${d}">${d}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Subject</label>
                                <input type="text" id="event-subject" placeholder="e.g. Mathematics">
                            </div>
                            <div class="form-group">
                                <label>Duration (mins)</label>
                                <input type="number" id="event-duration" value="60" min="10">
                            </div>
                            <div class="form-group">
                                <label>Color</label>
                                <input type="color" id="event-color" value="#6366f1">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" id="cancel-event-2">Cancel</button>
                            <button class="btn btn-primary" id="save-event">Add</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async afterRender() {
        const form = document.getElementById('timetable-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.generateTimetable();
            });
        }

        const resetBtn = document.getElementById('reset-timetable');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.store.saveTimetable(null);
                this.render().then(html => {
                    document.getElementById('app-view').innerHTML = html;
                    this.afterRender();
                });
            });
        }

        // Add Event modal handlers
        const getEventModal = () => document.getElementById('event-modal');
        const getModalContent = () => document.querySelector('#event-modal .modal-content-premium');

        const openEventModal = () => {
            let eventModal = getEventModal();
            if (!eventModal) {
                // If modal was removed for some reason, re-render to recreate it
                this.render().then(html => {
                    document.getElementById('app-view').innerHTML = html;
                    this.afterRender();
                    const recreated = getEventModal();
                    if (recreated) {
                        recreated.style.display = 'block';
                        recreated.classList.remove('hidden');
                        setTimeout(() => document.getElementById('event-subject')?.focus(), 100);
                    }
                });
                return;
            }
            eventModal.style.display = 'block';
            eventModal.classList.remove('hidden');
            setTimeout(() => document.getElementById('event-subject')?.focus(), 100);
        };

        const closeEventModal = () => {
            const eventModal = getEventModal();
            const modalContent = getModalContent();
            if (modalContent) {
                modalContent.style.animation = 'modalSlideOut 0.25s ease-out forwards';
                setTimeout(() => {
                    if (eventModal) {
                        eventModal.classList.add('hidden');
                        eventModal.style.display = 'none';
                    }
                    modalContent.style.animation = '';
                }, 250);
            } else if (eventModal) {
                eventModal.classList.add('hidden');
                eventModal.style.display = 'none';
            }
        };

        const addEventBtn = document.getElementById('add-event');
        addEventBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            openEventModal();
        });

        document.getElementById('cancel-event')?.addEventListener('click', (e) => {
            e.preventDefault();
            closeEventModal();
        });
        document.getElementById('cancel-event-2')?.addEventListener('click', (e) => {
            e.preventDefault();
            closeEventModal();
        });

        document.querySelector('#event-modal .modal-backdrop')?.addEventListener('click', (e) => {
            e.preventDefault();
            closeEventModal();
        });

        document.getElementById('save-event')?.addEventListener('click', (e) => {
            e.preventDefault();
            const day = document.getElementById('event-day')?.value;
            const subject = document.getElementById('event-subject')?.value.trim();
            const duration = parseInt(document.getElementById('event-duration')?.value) || 60;
            const color = document.getElementById('event-color')?.value || '#6366f1';

            if (!day || !subject) {
                alert('Please provide a day and subject name.');
                return;
            }

            const timetable = this.store.getTimetable();
            if (!timetable) return;

            timetable.schedule[day].push({ subject, duration, color });
            this.store.saveTimetable(timetable);
            // Re-render to update view
            this.render().then(html => {
                document.getElementById('app-view').innerHTML = html;
                this.afterRender();
            });
        });

        // Show timetable completion check-in
        setTimeout(() => {
            this.showTimetableCheckIn();
        }, 800);
    }

    showTimetableCheckIn() {
        if (!this.store.getTimetable() || !this.store.shouldShowTimetableCheckIn()) {
            return;
        }

        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const yesterdayFormatted = new Date(Date.now() - 86400000).toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric' 
        });

        const html = `
            <div id="timetable-checkin-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 2000;">
                <div class="modal-content-premium" style="animation: modalSlideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);">
                    <div class="modal-header">
                        <h3>📋 Schedule Check-In</h3>
                    </div>
                    <div class="modal-body" style="text-align: center;">
                        <div style="font-size: 2.5rem; margin-bottom: 1rem;">🎯</div>
                        <h2 style="margin-bottom: 0.5rem;">Did you follow your schedule?</h2>
                        <p class="text-muted" style="margin-bottom: 2rem;">Let us know if you completed ${yesterdayFormatted}'s study plan.</p>
                        
                        <div style="display: flex; gap: 1rem; align-items: center; justify-content: center; margin-bottom: 2rem; padding: 1.5rem; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(34, 197, 94, 0.1)); border-radius: 12px; border: 2px solid var(--border);">
                            <div style="font-size: 2rem;">🏆</div>
                            <div style="text-align: left;">
                                <div style="font-size: 0.9rem; color: var(--text-muted);">Reward for yes</div>
                                <div style="font-size: 1.5rem; font-weight: 800; color: #10b981;">+50 XP</div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="timetable-checkin-no">No</button>
                        <button class="btn btn-secondary" id="timetable-checkin-wait">Wait</button>
                        <button class="btn btn-primary" id="timetable-checkin-yes">Yes, I Did! 🎉</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', html);

        document.getElementById('timetable-checkin-yes')?.addEventListener('click', () => {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            this.store.recordTimetableCompletion(yesterday, true);
            this.store.markTimetableCheckInDone();
            document.getElementById('timetable-checkin-overlay').remove();
            this.showTimetableCompletionReward();
        });

        document.getElementById('timetable-checkin-no')?.addEventListener('click', () => {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            this.store.recordTimetableCompletion(yesterday, false);
            this.store.markTimetableCheckInDone();
            document.getElementById('timetable-checkin-overlay').remove();
        });

        document.getElementById('timetable-checkin-wait')?.addEventListener('click', () => {
            // Just close the popup but don't mark as done - can show again today
            document.getElementById('timetable-checkin-overlay').remove();
        });
    }

    showTimetableCompletionReward() {
        const html = `
            <div id="reward-popup" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 2001; animation: popupBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;">
                <div style="background: var(--bg-card); border-radius: 16px; padding: 2rem; text-align: center; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); border: 2px solid var(--border);">
                    <div style="font-size: 3rem; margin-bottom: 1rem; animation: float 0.8s ease-in-out;">🎉</div>
                    <h3 style="margin-bottom: 0.5rem;">Awesome Job!</h3>
                    <p style="color: var(--text-muted); margin-bottom: 1rem;">You stayed on track with your schedule.</p>
                    <p style="color: var(--text-muted); margin-bottom: 0;">You earned <strong style="color: #10b981; font-size: 1.2rem;">+50 XP</strong> 🏆</p>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        
        setTimeout(() => {
            document.getElementById('reward-popup')?.remove();
        }, 3000);
    }

    generateTimetable() {
        const subjects = this.store.getSubjects();
        const selectedIds = Array.from(document.querySelectorAll('input[name="subjects"]:checked')).map(cb => cb.value);
        const dailyHours = parseInt(document.getElementById('daily-hours').value);

        if (selectedIds.length === 0) {
            alert('Please select at least one subject.');
            return;
        }

        const activeSubjects = subjects.filter(s => selectedIds.includes(s.id));
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const schedule = {};

        // Simple Algorithm: Round Robin distribution
        // In a real app, this would be more complex based on difficulty/exam date

        days.forEach(day => {
            schedule[day] = [];
            let timeRemaining = dailyHours * 60; // minutes

            // Randomly pick subjects to fill the day
            // Shuffle subjects for variety
            const shuffled = [...activeSubjects].sort(() => 0.5 - Math.random());

            shuffled.forEach(sub => {
                if (timeRemaining >= 60) {
                    schedule[day].push({
                        subject: sub.name,
                        color: sub.color,
                        duration: 60
                    });
                    timeRemaining -= 60;
                } else if (timeRemaining > 0) {
                    schedule[day].push({
                        subject: sub.name,
                        color: sub.color,
                        duration: timeRemaining
                    });
                    timeRemaining = 0;
                }
            });
        });

        const timetable = {
            createdAt: new Date().toISOString(),
            schedule
        };

        this.store.saveTimetable(timetable);
        this.render().then(html => {
            document.getElementById('app-view').innerHTML = html;
            this.afterRender();
        });
    }
}
