class PomodoroView {
    constructor(store) {
        this.store = store;
        this.timer = null;
        this.timeLeft = 25 * 60;
        this.totalTime = 25 * 60;
        this.isRunning = false;
        this.mode = 'focus';
        this.isZen = false;
        this.selectedSubjectId = null; // Store selected subject for current session
        this.sessionStartTime = null; // Track when session started
        this.sessionLogged = false; // Track if current session has been logged
        this.customDurations = {
            focus: 25,
            short: 5,
            long: 15
        };
    }

    async render(container) {
        container.innerHTML = `
            <div class="pomodoro-container animate-fade-in" style="max-width: 600px; margin: 0 auto; text-align: center;">
                <div class="mode-pills">
                    <button class="mode-pill ${this.mode === 'focus' ? 'active' : ''}" data-mode="focus">Focus</button>
                    <button class="mode-pill ${this.mode === 'short' ? 'active' : ''}" data-mode="short">Short Break</button>
                    <button class="mode-pill ${this.mode === 'long' ? 'active' : ''}" data-mode="long">Long Break</button>
                </div>

                <div class="timer-display-large" id="timer-display">
                    <span id="time-left">${this.formatTime(this.timeLeft)}</span>
                </div>

                <div style="display: flex; justify-content: center; gap: 1rem; margin-bottom: 3rem;">
                    <button id="start-btn" class="btn btn-primary" style="min-width: 120px;">${this.isRunning ? 'Pause' : 'Start'}</button>
                    <button id="reset-btn" class="btn btn-secondary">Reset</button>
                </div>

                <!-- Minimal Sound & Zen Controls -->
                <div class="card" style="text-align: left;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <span class="text-muted">Ambient Sound</span>
                        <select id="sound-select" style="width: auto; margin-bottom: 0; padding: 0.4rem;">
                            <option value="none">Off</option>
                            <option value="rain">Rain</option>
                            <option value="cafe">Cafe</option>
                            <option value="forest">Forest</option>
                        </select>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="text-muted">Distraction Free</span>
                        <button id="zen-mode-btn" class="btn btn-secondary btn-sm">Enter Zen Mode</button>
                    </div>
                </div>

                <!-- Hidden Audio Elements -->
                <audio id="audio-rain" loop src="https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg"></audio>
                <audio id="audio-cafe" loop src="https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg"></audio>
                <audio id="audio-forest" loop src="https://actions.google.com/sounds/v1/ambiences/forest_morning.ogg"></audio>
            </div>
        `;
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    async afterRender() {
        const display = document.getElementById('time-left');
        const startBtn = document.getElementById('start-btn');
        const resetBtn = document.getElementById('reset-btn');
        const zenBtn = document.getElementById('zen-mode-btn');
        const modeBtns = document.querySelectorAll('.mode-pill');
        const soundSelect = document.getElementById('sound-select');
        const sounds = document.querySelectorAll('audio');

        // Mode Switching
        // Mode Switching
        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.pauseTimer(); // Stop any running timer
                this.mode = btn.dataset.mode;
                this.resetTimer();
                this.render(document.getElementById('app-view')).then(() => this.afterRender());
            });
        });

        // Sound Logic
        soundSelect.addEventListener('change', (e) => {
            sounds.forEach(s => { s.pause(); s.currentTime = 0; });
            const soundName = e.target.value;
            if (soundName !== 'none') {
                const audio = document.getElementById(`audio-${soundName}`);
                if (audio) audio.play();
            }
        });

        // Zen Mode
        zenBtn.addEventListener('click', () => {
            this.isZen = !this.isZen;
            if (this.isZen) {
                document.body.classList.add('zen-mode');
                zenBtn.textContent = 'Exit Zen Mode';
            } else {
                document.body.classList.remove('zen-mode');
                zenBtn.textContent = 'Enter Zen Mode';
            }
        });

        // Timer Logic
        startBtn.addEventListener('click', () => {
            if (this.isRunning) {
                this.pauseTimer();
                startBtn.textContent = 'Start';
            } else {
                // If focus mode, ask for subject selection first
                if (this.mode === 'focus') {
                    this.showSubjectSelectionModal(() => {
                        // Subject selected, start timer
                        this.startTimer(display);
                        startBtn.textContent = 'Pause';
                    });
                } else {
                    // For breaks, start immediately
                    this.startTimer(display);
                    startBtn.textContent = 'Pause';
                }
            }
        });

        resetBtn.addEventListener('click', () => {
            // If timer was running, pause it first (which will log the session)
            if (this.isRunning) {
                this.pauseTimer();
            }
            this.resetTimer();
            this.updateDisplay(display);
            startBtn.textContent = 'Start';
            this.selectedSubjectId = null; // Reset subject selection on reset
            this.sessionStartTime = null;
            this.sessionLogged = false;
        });
    }

    startTimer(display) {
        this.isRunning = true;
        this.sessionStartTime = Date.now(); // Record when session started
        this.sessionLogged = false; // Reset logged flag
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay(display);
            if (this.timeLeft <= 0) {
                this.completeSession();
            }
        }, 1000);
    }

    pauseTimer() {
        this.isRunning = false;
        clearInterval(this.timer);
        
        // If it's a focus session and we've studied for at least 30 seconds, log it
        if (this.mode === 'focus' && this.sessionStartTime && this.selectedSubjectId !== undefined && !this.sessionLogged) {
            const elapsedSeconds = (Date.now() - this.sessionStartTime) / 1000;
            const elapsedMinutes = elapsedSeconds / 60;
            
            // Log if at least 30 seconds were studied (to avoid logging accidental starts)
            if (elapsedMinutes >= 0.5) {
                // Round to whole number of minutes
                const roundedMinutes = Math.round(elapsedMinutes);
                this.logCurrentSession(roundedMinutes);
                this.sessionLogged = true;
            }
        }
        this.sessionStartTime = null;
    }

    resetTimer() {
        if (this.mode === 'focus') this.totalTime = this.customDurations.focus * 60;
        else if (this.mode === 'short') this.totalTime = this.customDurations.short * 60;
        else if (this.mode === 'long') this.totalTime = this.customDurations.long * 60;
        this.timeLeft = this.totalTime;
    }

    updateDisplay(display) {
        if (display) display.textContent = this.formatTime(this.timeLeft);
    }

    completeSession() {
        this.pauseTimer();
        const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
        audio.play();

        if (this.mode === 'focus') {
            // Only log if we haven't already logged this session (from pause)
            if (!this.sessionLogged) {
                // Log the full session duration, rounded to whole number
                const actualDuration = Math.round(this.totalTime / 60); // Convert seconds to minutes and round
                this.store.logSession(actualDuration, this.selectedSubjectId);
            }
            this.store.addXP(50, 'pomodoro_session');
            
            // Show success message with subject name
            const subjects = this.store.getSubjects();
            const subjectName = this.selectedSubjectId 
                ? (subjects.find(s => s.id === this.selectedSubjectId)?.name || 'General')
                : 'General';
            
            this.showCompletionModal(subjectName);
            this.selectedSubjectId = null; // Reset for next session
            this.sessionLogged = false;
        } else {
            alert('Break over! Time to focus.');
        }

        this.resetTimer();
        const display = document.getElementById('time-left');
        this.updateDisplay(display);
        document.getElementById('start-btn').textContent = 'Start';
    }

    logCurrentSession(durationMinutes) {
        // Log the current session with actual time studied (already rounded to whole number)
        if (durationMinutes > 0) {
            this.store.logSession(durationMinutes, this.selectedSubjectId);
            // Note: updateChallengeProgress is already called in logSession
            console.log(`Logged session: ${durationMinutes} minutes for subject: ${this.selectedSubjectId || 'General'}`);
        }
    }

    showSubjectSelectionModal(onConfirm) {
        const subjects = this.store.getSubjects();
        
        // If no subjects, allow starting without subject
        if (subjects.length === 0) {
            this.selectedSubjectId = null;
            if (onConfirm) onConfirm();
            return;
        }

        const html = `
            <div id="subject-selection-modal" class="modal">
                <div class="modal-backdrop"></div>
                <div class="modal-content-premium" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>📚 Select Subject</h3>
                        <button class="modal-close" id="close-subject-modal">×</button>
                    </div>
                    <div class="modal-body">
                        <p class="text-muted" style="margin-bottom: 1.5rem;">Which subject are you focusing on?</p>
                        <div style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 400px; overflow-y: auto;">
                            ${subjects.map(subject => `
                                <button class="subject-option-btn" data-subject-id="${subject.id}" style="
                                    width: 100%;
                                    padding: 1rem;
                                    text-align: left;
                                    background: var(--bg-body);
                                    border: 2px solid var(--border);
                                    border-radius: var(--radius);
                                    cursor: pointer;
                                    transition: all 0.2s;
                                    display: flex;
                                    align-items: center;
                                    gap: 1rem;
                                ">
                                    <div style="
                                        width: 40px;
                                        height: 40px;
                                        border-radius: 50%;
                                        background: ${subject.color || 'var(--primary)'};
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        font-size: 1.2rem;
                                        flex-shrink: 0;
                                    ">${subject.icon || '📚'}</div>
                                    <div style="flex: 1;">
                                        <div style="font-weight: 600; color: var(--text-main);">${subject.name}</div>
                                        ${subject.topics ? `<div style="font-size: 0.85rem; color: var(--text-muted);">${subject.topics.length} topics</div>` : ''}
                                    </div>
                                </button>
                            `).join('')}
                            <button class="subject-option-btn" data-subject-id="null" style="
                                width: 100%;
                                padding: 1rem;
                                text-align: left;
                                background: var(--bg-body);
                                border: 2px solid var(--border);
                                border-radius: var(--radius);
                                cursor: pointer;
                                transition: all 0.2s;
                                display: flex;
                                align-items: center;
                                gap: 1rem;
                            ">
                                <div style="
                                    width: 40px;
                                    height: 40px;
                                    border-radius: 50%;
                                    background: var(--text-muted);
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-size: 1.2rem;
                                    flex-shrink: 0;
                                ">📝</div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: var(--text-main);">General Study</div>
                                    <div style="font-size: 0.85rem; color: var(--text-muted);">No specific subject</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);

        const modal = document.getElementById('subject-selection-modal');
        const subjectButtons = document.querySelectorAll('.subject-option-btn');
        const closeBtn = document.getElementById('close-subject-modal');

        const closeModal = () => {
            modal.remove();
        };

        subjectButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const subjectId = btn.dataset.subjectId === 'null' ? null : btn.dataset.subjectId;
                this.selectedSubjectId = subjectId;
                closeModal();
                if (onConfirm) onConfirm();
            });
            
            // Hover effects
            btn.addEventListener('mouseenter', () => {
                btn.style.borderColor = 'var(--primary)';
                btn.style.transform = 'translateX(4px)';
                btn.style.background = 'var(--bg-card)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.borderColor = 'var(--border)';
                btn.style.transform = 'translateX(0)';
                btn.style.background = 'var(--bg-body)';
            });
        });

        closeBtn.addEventListener('click', closeModal);
        document.querySelector('.modal-backdrop').addEventListener('click', closeModal);
    }

    showCompletionModal(subjectName) {
        const html = `
            <div id="session-complete-modal" class="modal">
                <div class="modal-backdrop"></div>
                <div class="modal-content-premium" style="max-width: 400px; text-align: center;">
                    <div class="modal-body" style="padding: 2rem;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
                        <h3 style="margin-bottom: 0.5rem;">Focus Session Complete!</h3>
                        <p class="text-muted" style="margin-bottom: 1.5rem;">You studied <strong>${subjectName}</strong></p>
                        <div style="
                            background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
                            color: white;
                            padding: 1rem;
                            border-radius: var(--radius);
                            margin-bottom: 1.5rem;
                        ">
                            <div style="font-size: 0.9rem; opacity: 0.9;">You earned</div>
                            <div style="font-size: 2rem; font-weight: 800;">+50 XP</div>
                        </div>
                        <button class="btn btn-primary" id="close-complete-modal" style="width: 100%;">Awesome!</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);

        const modal = document.getElementById('session-complete-modal');
        const closeBtn = document.getElementById('close-complete-modal');

        const closeModal = () => {
            modal.remove();
        };

        closeBtn.addEventListener('click', closeModal);
        document.querySelector('#session-complete-modal .modal-backdrop').addEventListener('click', closeModal);
        
        // Auto-close after 3 seconds
        setTimeout(closeModal, 3000);
    }
}
