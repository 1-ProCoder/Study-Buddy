class CountdownsView {
    constructor(store) {
        this.store = store;
    }

    async render(container) {
        const countdowns = this.store.getCountdowns();
        const now = new Date();

        const html = `
            <div class="countdowns-container fade-in">
                <div class="header-actions">
                    <div>
                        <h2>Countdown Timers</h2>
                        <p class="text-muted">Track important dates for exams, tests, and events.</p>
                    </div>
                    <button class="btn btn-primary" id="add-countdown-btn">
                        <span class="icon">+</span> New Countdown
                    </button>
                </div>

                <div class="countdowns-grid">
                    ${countdowns.length === 0 ? `
                        <div class="empty-state-full">
                            <div class="empty-icon">⏰</div>
                            <h3>No Countdowns Yet</h3>
                            <p>Add a countdown to track your important dates.</p>
                        </div>
                    ` : ''}
                    ${countdowns.map(countdown => {
            const rawDate = countdown.date;
            const targetDate = rawDate ? new Date(rawDate) : null;
            const isValidDate = targetDate && !isNaN(targetDate.getTime());
            const timeRemaining = isValidDate ? this.calculateTimeRemaining(now, targetDate) : { days: 0, hours: 0, minutes: 0 };
            const isPast = isValidDate ? targetDate < now : false;
            const daysPercentage = Math.max(0, Math.min(100, (timeRemaining.days / 30) * 100));

            const shortDateLabel = isValidDate
                ? targetDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
                : 'Invalid date';

            const longDateLabel = isValidDate
                ? targetDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                : 'Invalid date';

            return `
                            <div class="countdown-card-premium ${isPast ? 'past' : ''}" style="animation: fadeIn 0.6s ease-out">
                                <div class="countdown-premium-header">
                                    <div class="countdown-title-section">
                                        <h3 class="countdown-title">${countdown.title}</h3>
                                        <span class="countdown-type-badge ${countdown.type}">${countdown.type}</span>
                                    </div>
                                    <button class="btn-countdown-delete" data-id="${countdown.id}" title="Delete">
                                        <span>×</span>
                                    </button>
                                </div>
                                
                                <p class="countdown-date">${shortDateLabel}</p>
                                
                                ${isPast ? `
                                    <div class="countdown-past-state">
                                        <div class="past-badge">✓ Event Passed</div>
                                        <p>Completed on ${longDateLabel}</p>
                                    </div>
                                ` : `
                                    <div class="countdown-time-display">
                                        <div class="time-unit-premium">
                                            <span class="time-value-large">${timeRemaining.days}</span>
                                            <span class="time-label-premium">Days</span>
                                        </div>
                                        <div class="time-separator">:</div>
                                        <div class="time-unit-premium">
                                            <span class="time-value-large">${String(timeRemaining.hours).padStart(2, '0')}</span>
                                            <span class="time-label-premium">Hours</span>
                                        </div>
                                        <div class="time-separator">:</div>
                                        <div class="time-unit-premium">
                                            <span class="time-value-large">${String(timeRemaining.minutes).padStart(2, '0')}</span>
                                            <span class="time-label-premium">Mins</span>
                                        </div>
                                    </div>
                                    <div class="countdown-progress-bar">
                                        <div class="progress-fill" style="width: ${daysPercentage}%"></div>
                                    </div>
                                `}
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;

        if (container) container.innerHTML = html;
        return html;
    }

    calculateTimeRemaining(now, target) {
        const diff = target - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        return { days, hours, minutes };
    }

    async afterRender() {
        // Setup delete buttons for countdowns
        document.querySelectorAll('.btn-countdown-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                this.store.deleteCountdown(btn.dataset.id);
                this.render().then(html => {
                    document.getElementById('app-view').innerHTML = html;
                    this.afterRender();
                });
            });
        });

        // Open modal
        document.getElementById('add-countdown-btn')?.addEventListener('click', () => {
            const html = `
                <div id="countdown-modal" class="modal">
                    <div class="modal-backdrop"></div>
                    <div class="modal-content-premium">
                        <div class="modal-header">
                            <h3>Create Countdown</h3>
                            <button class="modal-close" id="close-countdown">×</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label>Title</label>
                                <input type="text" id="countdown-title" class="input-premium" placeholder="e.g. Biology Final Exam">
                            </div>
                            <div class="form-group">
                                <label>Type</label>
                                <select id="countdown-type" class="input-premium">
                                    <option value="exam">Exam</option>
                                    <option value="test">Test</option>
                                    <option value="event">Event</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Date & Time</label>
                                <input type="datetime-local" id="countdown-date" class="input-premium">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" id="cancel-countdown">Cancel</button>
                            <button class="btn btn-primary" id="save-countdown">Create Countdown</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', html);
            this.setupModalListeners();
        });
    }

    setupModalListeners() {
        const modal = document.getElementById('countdown-modal');
        const backdrop = document.querySelector('.modal-backdrop');

        // Close modal - cancel, X button, or backdrop click
        const closeModal = () => {
            modal.remove();
        };

        document.getElementById('cancel-countdown')?.addEventListener('click', closeModal);
        document.getElementById('close-countdown')?.addEventListener('click', closeModal);
        backdrop?.addEventListener('click', closeModal);

        // Save countdown
        document.getElementById('save-countdown')?.addEventListener('click', async () => {
            const title = document.getElementById('countdown-title').value.trim();
            const type = document.getElementById('countdown-type').value;
            const date = document.getElementById('countdown-date').value;

            if (title && date) {
                // Ensure the date is valid and in the future
                const selectedDate = new Date(date);
                const now = new Date();
                
                if (selectedDate <= now) {
                    alert('Please select a future date for the countdown.');
                    return;
                }
                
                const countdownObj = {
                    id: Date.now().toString(),
                    title,
                    type,
                    date: selectedDate.toISOString()
                };

                // Support both local Store (addCountdown) and FirebaseStore (saveCountdown)
                if (typeof this.store.addCountdown === 'function') {
                    this.store.addCountdown(countdownObj);
                } else if (typeof this.store.saveCountdown === 'function') {
                    await this.store.saveCountdown(countdownObj);
                } else {
                    console.error('No countdown save method available on store');
                }

                modal.remove();
                this.render().then(html => {
                    document.getElementById('app-view').innerHTML = html;
                    this.afterRender();
                });
            } else {
                alert('Please fill in all fields.');
            }
        });
    }
}
