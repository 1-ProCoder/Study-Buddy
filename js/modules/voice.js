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
}
