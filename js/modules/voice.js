class VoiceManager {
    constructor(store, router) {
        this.store = store;
        this.router = router;
        this.recognition = null;
        this.isListening = false;
        this.init();
    }

    init() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.lang = 'en-US';
            this.recognition.interimResults = false;

            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateUI(true);
                this.showFeedback('Listening...', 'info');
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.updateUI(false);
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                this.isListening = false;
                this.updateUI(false);
                this.showFeedback('Error listening. Try again.', 'error');
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript.toLowerCase();
                console.log('Voice command:', transcript);
                this.processCommand(transcript);
            };
        } else {
            console.warn('Speech recognition not supported');
        }
    }

    toggle() {
        if (!this.recognition) return;
        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }

    updateUI(listening) {
        const btn = document.getElementById('voice-command-btn');
        if (btn) {
            if (listening) {
                btn.classList.add('listening');
                btn.innerHTML = '🎙️ Listening...';
                btn.style.background = 'var(--danger)';
                btn.style.color = 'white';
            } else {
                btn.classList.remove('listening');
                btn.innerHTML = '🎙️ Voice Command';
                btn.style.background = '';
                btn.style.color = '';
            }
        }
    }

    showFeedback(message, type = 'info') {
        const existing = document.getElementById('voice-feedback');
        if (existing) existing.remove();

        const feedback = document.createElement('div');
        feedback.id = 'voice-feedback';
        feedback.style.position = 'fixed';
        feedback.style.bottom = '100px';
        feedback.style.left = '50%';
        feedback.style.transform = 'translateX(-50%)';
        feedback.style.padding = '1rem 2rem';
        feedback.style.borderRadius = '50px';
        feedback.style.background = type === 'error' ? 'var(--danger)' : 'var(--primary)';
        feedback.style.color = 'white';
        feedback.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        feedback.style.zIndex = '10000';
        feedback.style.animation = 'fadeIn 0.3s ease-out';
        feedback.textContent = message;

        document.body.appendChild(feedback);

        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transition = 'opacity 0.5s';
            setTimeout(() => feedback.remove(), 500);
        }, 2000);
    }

    processCommand(command) {
        // Pomodoro Commands
        if (command.includes('start timer') || command.includes('start focus')) {
            this.handleStartTimer();
        } else if (command.includes('stop timer') || command.includes('pause timer')) {
            this.handleStopTimer();
        } else if (command.includes('reset timer')) {
            this.handleResetTimer();
        }
        // Countdown Commands
        else if (command.includes('add countdown') || command.includes('new countdown') || command.includes('set countdown')) {
            this.handleAddCountdown();
        }
        // Navigation Commands
        else if (command.includes('go to dashboard')) {
            window.location.hash = '#dashboard';
            this.showFeedback('Navigating to Dashboard');
        } else if (command.includes('go to subjects')) {
            window.location.hash = '#subjects';
            this.showFeedback('Navigating to Subjects');
        }
        else {
            this.showFeedback(`Unknown command: "${command}"`, 'error');
        }
    }

    handleStartTimer() {
        // Ensure we are on the pomodoro page
        if (window.location.hash !== '#pomodoro') {
            window.location.hash = '#pomodoro';
            setTimeout(() => this.triggerTimerStart(), 500); // Wait for view to load
        } else {
            this.triggerTimerStart();
        }
    }

    triggerTimerStart() {
        const startBtn = document.getElementById('start-btn');
        if (startBtn && startBtn.textContent.toLowerCase() === 'start') {
            startBtn.click();
            this.showFeedback('Timer Started');
        } else {
            this.showFeedback('Timer already running');
        }
    }

    handleStopTimer() {
        if (window.location.hash !== '#pomodoro') return;
        const startBtn = document.getElementById('start-btn');
        if (startBtn && startBtn.textContent.toLowerCase() === 'pause') {
            startBtn.click();
            this.showFeedback('Timer Paused');
        }
    }

    handleResetTimer() {
        if (window.location.hash !== '#pomodoro') return;
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.click();
            this.showFeedback('Timer Reset');
        }
    }

    handleAddCountdown() {
        if (window.location.hash !== '#countdowns') {
            window.location.hash = '#countdowns';
            setTimeout(() => this.triggerAddCountdown(), 500);
        } else {
            this.triggerAddCountdown();
        }
    }

    triggerAddCountdown() {
        const addBtn = document.getElementById('add-countdown-btn');
        if (addBtn) {
            addBtn.click();
            this.showFeedback('Opening Countdown Creator');
        }
    }

    showHelp() {
        const html = `
            <div id="voice-help-modal" class="modal">
                <div class="modal-backdrop"></div>
                <div class="modal-content-premium" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header">
                        <h3>🎙️ Voice Commands Help</h3>
                        <button class="modal-close" id="close-voice-help">×</button>
                    </div>
                    <div class="modal-body">
                        <div style="margin-bottom: 2rem; padding: 1.5rem; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(14, 165, 233, 0.1)); border-radius: 12px; border: 2px solid var(--border);">
                            <h4 style="margin-bottom: 0.5rem; color: var(--primary);">How to Use Voice Commands</h4>
                            <p style="color: var(--text-muted); margin-bottom: 0;">Click the "Voice Command" button and speak clearly. Make sure your microphone is enabled in your browser settings.</p>
                        </div>

                        <h4 style="margin-bottom: 1rem; color: var(--text-main);">Available Commands</h4>
                        
                        <div style="display: flex; flex-direction: column; gap: 1rem;">
                            <!-- Timer Commands -->
                            <div class="card" style="padding: 1.5rem;">
                                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                                    <span style="font-size: 2rem;">⏱️</span>
                                    <h4 style="margin: 0;">Focus Timer Commands</h4>
                                </div>
                                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                                    <div style="padding: 0.75rem; background: var(--bg-body); border-radius: 8px;">
                                        <strong style="color: var(--primary);">"Start timer"</strong> or <strong style="color: var(--primary);">"Start focus"</strong>
                                        <div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.25rem;">Starts the Pomodoro timer</div>
                                    </div>
                                    <div style="padding: 0.75rem; background: var(--bg-body); border-radius: 8px;">
                                        <strong style="color: var(--primary);">"Stop timer"</strong> or <strong style="color: var(--primary);">"Pause timer"</strong>
                                        <div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.25rem;">Pauses the running timer</div>
                                    </div>
                                    <div style="padding: 0.75rem; background: var(--bg-body); border-radius: 8px;">
                                        <strong style="color: var(--primary);">"Reset timer"</strong>
                                        <div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.25rem;">Resets the timer to default</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Navigation Commands -->
                            <div class="card" style="padding: 1.5rem;">
                                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                                    <span style="font-size: 2rem;">🧭</span>
                                    <h4 style="margin: 0;">Navigation Commands</h4>
                                </div>
                                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                                    <div style="padding: 0.75rem; background: var(--bg-body); border-radius: 8px;">
                                        <strong style="color: var(--primary);">"Go to dashboard"</strong>
                                        <div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.25rem;">Navigates to the Dashboard</div>
                                    </div>
                                    <div style="padding: 0.75rem; background: var(--bg-body); border-radius: 8px;">
                                        <strong style="color: var(--primary);">"Go to subjects"</strong>
                                        <div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.25rem;">Navigates to Subjects page</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Countdown Commands -->
                            <div class="card" style="padding: 1.5rem;">
                                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                                    <span style="font-size: 2rem;">⏳</span>
                                    <h4 style="margin: 0;">Countdown Commands</h4>
                                </div>
                                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                                    <div style="padding: 0.75rem; background: var(--bg-body); border-radius: 8px;">
                                        <strong style="color: var(--primary);">"Add countdown"</strong> or <strong style="color: var(--primary);">"New countdown"</strong> or <strong style="color: var(--primary);">"Set countdown"</strong>
                                        <div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.25rem;">Opens the countdown creation form</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style="margin-top: 2rem; padding: 1.5rem; background: rgba(245, 158, 11, 0.1); border-radius: 12px; border: 2px solid rgba(245, 158, 11, 0.3);">
                            <div style="display: flex; align-items: start; gap: 1rem;">
                                <span style="font-size: 1.5rem;">💡</span>
                                <div>
                                    <strong style="color: #f59e0b;">Tips for Best Results:</strong>
                                    <ul style="margin-top: 0.5rem; padding-left: 1.5rem; color: var(--text-muted);">
                                        <li>Speak clearly and at a normal pace</li>
                                        <li>Ensure your microphone has proper permissions</li>
                                        <li>Use a quiet environment for better recognition</li>
                                        <li>Commands are case-insensitive</li>
                                        <li>You can use variations of the commands (e.g., "start timer" or "start focus")</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" id="close-voice-help-btn">Got it!</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', html);
        const modal = document.getElementById('voice-help-modal');
        const closeBtn = document.getElementById('close-voice-help');
        const closeBtnFooter = document.getElementById('close-voice-help-btn');
        const backdrop = modal.querySelector('.modal-backdrop');
        
        const closeModal = () => modal.remove();
        closeBtn.addEventListener('click', closeModal);
        closeBtnFooter.addEventListener('click', closeModal);
        backdrop.addEventListener('click', closeModal);
    }
}
