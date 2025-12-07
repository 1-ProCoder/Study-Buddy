class FlashcardsView {
    constructor(store) {
        this.store = store;
    }

    async render(container) {
        const decks = this.store.getDecks();

        container.innerHTML = `
            <div class="flashcards-container animate-fade-in">
                <div class="header-actions">
                    <h2>Flashcards</h2>
                    <button id="create-deck-btn" class="btn btn-primary">+ New Deck</button>
                </div>

                <div class="decks-grid">
                    ${decks.map(deck => `
                        <div class="deck-card-premium" onclick="window.location.hash = '#flashcards/${deck.id}'">
                            <div class="deck-card-top">
                                <div class="deck-icon">${deck.icon || '📚'}</div>
                                <div class="deck-menu">
                                    <button class="btn-icon-sm delete-deck-btn" data-id="${deck.id}" onclick="event.stopPropagation()">🗑️</button>
                                </div>
                            </div>
                            <div class="deck-info">
                                <h3 style="font-size: 1.4rem; margin-bottom: 0.75rem; color: var(--text-main);">${deck.title}</h3>
                                <p class="deck-meta" style="margin-bottom: 1rem;">
                                    <span class="card-count" style="font-size: 0.95rem; color: var(--text-muted);">🎴 ${deck.cards.length} cards</span>
                                </p>
                                <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                                    <span style="background: rgba(99, 102, 241, 0.15); color: var(--primary); padding: 0.3rem 0.8rem; border-radius: 8px; font-size: 0.8rem; font-weight: 600;">Review</span>
                                    <span style="background: rgba(14, 165, 233, 0.15); color: var(--accent); padding: 0.3rem 0.8rem; border-radius: 8px; font-size: 0.8rem; font-weight: 600;">Quiz</span>
                                </div>
                            </div>
                            <div class="deck-actions">
                                <button class="btn btn-primary btn-block" onclick="event.stopPropagation(); window.location.hash = '#flashcards/${deck.id}/study'" style="margin-bottom: 0.6rem;">📖 Study Now</button>
                                <button class="btn btn-secondary btn-block" onclick="event.stopPropagation(); window.location.hash = '#flashcards/${deck.id}/quiz'">🧪 Start Quiz</button>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Create Deck Modal -->
                <div id="create-deck-modal" class="modal hidden">
                    <div class="modal-content">
                        <h3>Create New Deck</h3>
                        <input type="text" id="new-deck-title" placeholder="Deck Title (e.g., Biology)">
                        <div class="modal-actions">
                            <button class="btn btn-secondary" id="cancel-deck">Cancel</button>
                            <button class="btn btn-primary" id="save-deck">Create</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async renderDeckView(container, deckId, mode = 'view') {
        const deck = this.store.getDecks().find(d => d.id === deckId);
        if (!deck) return this.render(container);

        if (mode === 'study') {
            this.renderStudyMode(container, deck);
        } else if (mode === 'quiz') {
            this.renderQuizMode(container, deck);
        } else {
            this.renderDeckDetails(container, deck);
        }
    }

    renderStudyMode(container, deck) {
        if (deck.cards.length === 0) {
            alert('Add some cards first!');
            window.location.hash = `#flashcards/${deck.id}`;
            return;
        }
        // Only study cards that are due (no nextReview or nextReview <= now)
        const now = new Date();
        const studyCards = deck.cards.filter(c => !c.nextReview || new Date(c.nextReview) <= now);
        if (studyCards.length === 0) {
            container.innerHTML = `
                <div class="card" style="text-align:center;">
                    <h3>No cards due for review</h3>
                    <p class="text-muted">All cards are scheduled for later. Check back soon or review the deck manually.</p>
                    <button class="btn btn-primary" onclick="window.location.hash='#flashcards/${deck.id}'">Back to Deck</button>
                </div>
            `;
            return;
        }

        let currentCardIndex = 0;
        let isFlipped = false;

        const showCard = () => {
            const card = studyCards[currentCardIndex];
            container.innerHTML = `
                <div class="review-wrapper animate-fade-in">
                    <div class="review-header">
                        <button class="btn btn-secondary" onclick="window.location.hash='#flashcards'">Exit Study</button>
                        <div class="review-progress">
                            <span>Card ${currentCardIndex + 1} / ${studyCards.length}</span>
                        </div>
                    </div>

                    <div class="flashcard-stage">
                        <div class="premium-flashcard ${isFlipped ? 'flipped' : ''}" id="study-card">
                            <div class="card-face front">
                                <div class="face-content">
                                    <span class="face-label">Front</span>
                                    <h3>${card.front}</h3>
                                    ${card.image ? `<img src="${card.image}" style="max-height: 150px; margin-top: 1rem; border-radius: 8px;">` : ''}
                                </div>
                            </div>
                            <div class="card-face back">
                                <div class="face-content">
                                    <span class="face-label">Back</span>
                                    <h3>${card.back}</h3>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="review-controls" id="study-controls">
                        <button class="btn btn-secondary" id="prev-btn" ${currentCardIndex === 0 ? 'disabled' : ''}>← Previous</button>
                        <button class="btn btn-primary btn-wide" id="flip-btn">Flip Card ↻</button>
                        <button class="btn btn-secondary" id="next-btn" ${currentCardIndex === studyCards.length - 1 ? 'disabled' : ''}>Next →</button>
                    </div>
                    <div id="rating-container" style="margin-top:1rem; text-align:center;"></div>
                    
                    <div style="text-align: center; margin-top: 1rem;">
                        <p class="text-muted">Space to flip • Arrows to navigate</p>
                    </div>
                </div>
            `;

            const scheduleNextReview = (cardObj, rating) => {
                // rating: 'again' -> 1 min, 'good' -> 5 min, 'master' -> 1 day
                const now = Date.now();
                let minutes = 5;
                if (rating === 'again') minutes = 1;
                else if (rating === 'good') minutes = 5;
                else if (rating === 'master') minutes = 60 * 24; // 1 day

                const wasMastered = cardObj.mastered || false;
                cardObj.nextReview = new Date(now + minutes * 60 * 1000).toISOString();
                // optional: store interval for analytics
                cardObj.intervalMinutes = minutes;
                
                // Mark as mastered if rating is 'master'
                if (rating === 'master') {
                    cardObj.mastered = true;
                    // Update leaderboard if card is newly mastered
                    if (!wasMastered && typeof window.LeaderboardManager !== 'undefined' && typeof authManager !== 'undefined' && authManager.isAuthenticated()) {
                        const currentUser = authManager.getCurrentUser();
                        if (currentUser) {
                            const leaderboardManager = new LeaderboardManager(this.store, authManager);
                            leaderboardManager.updateFlashcards(currentUser.userId, 1);
                        }
                    }
                }
                
                // persist
                this.store.saveDecks(this.store.getDecks());
            };

            const showRatingControls = () => {
                const container = document.getElementById('rating-container');
                if (!container) return;
                container.innerHTML = `
                    <div class="rating-grid">
                        <button class="btn-rating again" id="rate-again">🔁 Again (1m)</button>
                        <button class="btn-rating" id="rate-good">👍 Good (5m)</button>
                        <button class="btn-rating easy" id="rate-master">🌟 Master (1d)</button>
                    </div>
                `;

                document.getElementById('rate-again')?.addEventListener('click', () => {
                    scheduleNextReview(card, 'again');
                    // move next
                    if (currentCardIndex < studyCards.length - 1) {
                        currentCardIndex++;
                        isFlipped = false;
                        showCard();
                    } else {
                        // finished - update quiz challenge
                        this.store.updateChallengeProgress('quiz_complete', 1);
                        
                        if (typeof window.checkInManager !== 'undefined') {
                            window.checkInManager.showCheckIn('flashcards', {
                                title: 'Flashcard Session Complete',
                                emoji: '🎴',
                                question: 'Great job! Did you complete the flashcard review?',
                                rewardXP: 40,
                                rewardText: '+40 XP'
                            });
                        }
                        setTimeout(() => {
                            window.location.hash = `#flashcards/${deck.id}`;
                        }, 1500);
                    }
                });

                document.getElementById('rate-good')?.addEventListener('click', () => {
                    scheduleNextReview(card, 'good');
                    if (currentCardIndex < studyCards.length - 1) {
                        currentCardIndex++;
                        isFlipped = false;
                        showCard();
                    } else {
                        // finished - update quiz challenge
                        this.store.updateChallengeProgress('quiz_complete', 1);
                        
                        if (typeof window.checkInManager !== 'undefined') {
                            window.checkInManager.showCheckIn('flashcards', {
                                title: 'Flashcard Session Complete',
                                emoji: '🎴',
                                question: 'Great job! Did you complete the flashcard review?',
                                rewardXP: 40,
                                rewardText: '+40 XP'
                            });
                        }
                        setTimeout(() => {
                            window.location.hash = `#flashcards/${deck.id}`;
                        }, 1500);
                    }
                });

                document.getElementById('rate-master')?.addEventListener('click', async () => {
                    scheduleNextReview(card, 'master');
                    if (currentCardIndex < studyCards.length - 1) {
                        currentCardIndex++;
                        isFlipped = false;
                        showCard();
                    } else {
                        // Update quiz challenge progress
                        this.store.updateChallengeProgress('quiz_complete', 1);
                        
                        // Update leaderboard if card is newly mastered
                        const useFirebase = window.firebaseConfig && 
                                           window.firebaseConfig.apiKey !== "YOUR_API_KEY" &&
                                           typeof window.FirebaseLeaderboardManager !== 'undefined';
                        
                        if (typeof authManager !== 'undefined' && authManager.isAuthenticated()) {
                            const currentUser = authManager.getCurrentUser();
                            if (currentUser) {
                                if (useFirebase) {
                                    const leaderboardManager = new FirebaseLeaderboardManager(this.store, authManager);
                                    await leaderboardManager.updateFlashcards(currentUser.userId, 1);
                                } else if (typeof window.LeaderboardManager !== 'undefined') {
                                    const leaderboardManager = new LeaderboardManager(this.store, authManager);
                                    leaderboardManager.updateFlashcards(currentUser.userId, 1);
                                }
                            }
                        }
                        
                        if (typeof window.checkInManager !== 'undefined') {
                            window.checkInManager.showCheckIn('flashcards', {
                                title: 'Flashcard Session Complete',
                                emoji: '🎴',
                                question: 'Great job! Did you complete the flashcard review?',
                                rewardXP: 40,
                                rewardText: '+40 XP'
                            });
                        }
                        setTimeout(() => {
                            window.location.hash = `#flashcards/${deck.id}`;
                        }, 1500);
                    }
                });
            };

            // Flip handlers
            document.getElementById('flip-btn').addEventListener('click', () => {
                isFlipped = !isFlipped;
                document.getElementById('study-card').classList.toggle('flipped');
                if (isFlipped) showRatingControls();
                else document.getElementById('rating-container').innerHTML = '';
            });

            document.getElementById('study-card').addEventListener('click', () => {
                isFlipped = !isFlipped;
                document.getElementById('study-card').classList.toggle('flipped');
                if (isFlipped) showRatingControls();
                else document.getElementById('rating-container').innerHTML = '';
            });

            document.getElementById('prev-btn').addEventListener('click', () => {
                if (currentCardIndex > 0) {
                    currentCardIndex--;
                    isFlipped = false;
                    showCard();
                }
            });

            document.getElementById('next-btn').addEventListener('click', () => {
                if (currentCardIndex < deck.cards.length - 1) {
                    currentCardIndex++;
                    isFlipped = false;
                    showCard();
                }
            });

            // Keyboard navigation
            document.onkeydown = (e) => {
                if (e.code === 'Space') {
                    e.preventDefault(); // Prevent scrolling
                    isFlipped = !isFlipped;
                    document.getElementById('study-card').classList.toggle('flipped');
                } else if (e.code === 'ArrowLeft' && currentCardIndex > 0) {
                    currentCardIndex--;
                    isFlipped = false;
                    showCard();
                } else if (e.code === 'ArrowRight' && currentCardIndex < deck.cards.length - 1) {
                    currentCardIndex++;
                    isFlipped = false;
                    showCard();
                }
            };
        };

        // Cleanup event listener when leaving view
        const originalOnKeyDown = document.onkeydown;
        // We can't easily hook into "unmount" here without a framework, 
        // but the next render call will likely overwrite document.onkeydown or the DOM will change.
        // A safer way in a SPA without a framework is to handle this in the router or ensure we don't leak.
        // For now, we'll just set it.

        showCard();
    }

    renderQuizMode(container, deck) {
        if (deck.cards.length === 0) {
            alert('Add some cards first!');
            window.location.hash = `#flashcards/${deck.id}`;
            return;
        }

        let currentCardIndex = 0;
        let score = 0;

        const showCard = () => {
            const card = deck.cards[currentCardIndex];
            container.innerHTML = `
                <div class="review-wrapper animate-fade-in">
                    <div class="review-header">
                        <button class="btn btn-secondary" onclick="window.location.hash='#flashcards'">Exit Quiz</button>
                        <div class="review-progress">
                            <span>Question ${currentCardIndex + 1} / ${deck.cards.length}</span>
                        </div>
                    </div>

                    <div class="flashcard-stage">
                        <div class="premium-flashcard" id="quiz-card">
                            <div class="card-face front">
                                <div class="face-content">
                                    <span class="face-label">Question</span>
                                    <h3>${card.front}</h3>
                                    ${card.image ? `<img src="${card.image}" style="max-height: 150px; margin-top: 1rem; border-radius: 8px;">` : ''}
                                </div>
                            </div>
                            <div class="card-face back">
                                <div class="face-content">
                                    <span class="face-label">Answer</span>
                                    <h3>${card.back}</h3>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="review-controls" id="quiz-controls">
                        <button class="btn btn-primary btn-wide" id="show-answer-btn">Show Answer</button>
                    </div>
                </div>
            `;

            document.getElementById('show-answer-btn').addEventListener('click', () => {
                document.getElementById('quiz-card').classList.add('flipped');
                const controls = document.getElementById('quiz-controls');
                controls.innerHTML = `
                    <div class="rating-grid">
                        <button class="btn-rating again" id="wrong-btn">❌ Incorrect</button>
                        <button class="btn-rating easy" id="correct-btn">✅ Correct</button>
                    </div>
                `;

                document.getElementById('wrong-btn').addEventListener('click', () => nextCard(false));
                document.getElementById('correct-btn').addEventListener('click', () => nextCard(true));
            });
        };

        const nextCard = (isCorrect) => {
            if (isCorrect) score++;
            currentCardIndex++;
            if (currentCardIndex < deck.cards.length) {
                showCard();
            } else {
                const percentage = Math.round((score / deck.cards.length) * 100);
                const xpEarned = score * 10;
                this.store.addXP(xpEarned);
                
                // Update quiz challenge progress
                this.store.updateChallengeProgress('quiz_complete', 1);

                container.innerHTML = `
                    <div class="card" style="text-align: center; max-width: 500px; margin: 2rem auto;">
                        <h2>Quiz Complete! 🎉</h2>
                        <div class="stat-icon" style="margin: 2rem auto;">🏆</div>
                        <h3>You scored ${score} / ${deck.cards.length}</h3>
                        <p>(${percentage}%)</p>
                        <p style="color: var(--primary); font-weight: bold; margin-top: 1rem;">+${xpEarned} XP Earned</p>
                        <button class="btn btn-primary" style="margin-top: 2rem;" onclick="window.location.hash='#flashcards'">Back to Decks</button>
                    </div>
                `;
            }
        };

        showCard();
    }

    renderDeckDetails(container, deck) {
        container.innerHTML = `
            <div class="flashcards-container animate-fade-in">
                <div class="header-actions">
                    <button class="btn btn-secondary" onclick="window.location.hash = '#flashcards'">← Back</button>
                    <h2>${deck.title}</h2>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-secondary" id="share-deck-btn" style="display: flex; align-items: center; gap: 0.5rem;">👥 Share</button>
                        <button class="btn btn-primary" id="add-card-btn">+ New Card</button>
                    </div>
                </div>

                <div class="cards-list" style="margin-top: 2rem;">
                    ${deck.cards.length === 0 ? `
                        <div class="card center-content" style="text-align: center; padding: 3rem;">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">🎴</div>
                            <h3>No cards yet</h3>
                            <p class="text-muted">Click "New Card" to add your first flashcard!</p>
                        </div>
                    ` : deck.cards.map((card, index) => `
                        <div class="card" style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), transparent); border-left: 4px solid var(--primary);">
                            <div style="flex: 1;">
                                <strong style="color: var(--primary); font-size: 1rem;">Q: ${card.front}</strong>
                                <p class="text-muted" style="margin-top: 0.5rem;">A: ${card.back}</p>
                                ${card.image ? `<span style="font-size: 0.8rem; color: var(--accent);">🖼️ Has Image</span>` : ''}
                            </div>
                            <button class="btn-icon-sm delete-card-btn" data-index="${index}" style="background: rgba(239, 68, 68, 0.1); border: none; cursor: pointer; padding: 0.6rem; border-radius: 8px; font-size: 1.2rem; transition: all 0.2s;">🗑️</button>
                        </div>
                    `).join('')}
                </div>

                <!-- Add Card Modal -->
                <div id="add-card-modal" class="modal hidden">
                    <div class="modal-backdrop"></div>
                    <div class="modal-content-premium" style="animation: modalSlideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);">
                        <div class="modal-header">
                            <h3>🎴 Add New Card</h3>
                            <button class="modal-close" id="close-card-modal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted);">✕</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">Question (Front)</label>
                                <textarea id="card-front" placeholder="Enter the question or prompt..." style="width: 100%; min-height: 80px; padding: 1rem; border: 2px solid var(--border); border-radius: 12px; font-family: inherit; font-size: 1rem; resize: vertical;"></textarea>
                            </div>
                            <div class="form-group" style="margin-top: 1.5rem;">
                                <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">Answer (Back)</label>
                                <textarea id="card-back" placeholder="Enter the answer or explanation..." style="width: 100%; min-height: 80px; padding: 1rem; border: 2px solid var(--border); border-radius: 12px; font-family: inherit; font-size: 1rem; resize: vertical;"></textarea>
                            </div>
                            <div class="form-group" style="margin-top: 1.5rem;">
                                <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">Image URL (Optional)</label>
                                <input type="text" id="card-image" placeholder="https://example.com/image.jpg" style="width: 100%; padding: 0.75rem 1rem; border: 2px solid var(--border); border-radius: 12px; font-size: 1rem;">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" id="cancel-card">Cancel</button>
                            <button class="btn btn-primary" id="confirm-add-card">Add Card ✓</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Open modal
        const modal = document.getElementById('add-card-modal');
        document.getElementById('add-card-btn').addEventListener('click', () => {
            modal.classList.remove('hidden');
            document.getElementById('card-front').focus();
        });

        // Close modal
        const closeModal = () => {
            modal.classList.add('hidden');
            document.getElementById('card-front').value = '';
            document.getElementById('card-back').value = '';
            document.getElementById('card-image').value = '';
        };

        document.getElementById('close-card-modal').addEventListener('click', closeModal);
        document.getElementById('cancel-card').addEventListener('click', closeModal);
        document.querySelector('#add-card-modal .modal-backdrop')?.addEventListener('click', closeModal);

        // Add card
        document.getElementById('confirm-add-card').addEventListener('click', () => {
            const front = document.getElementById('card-front').value.trim();
            const back = document.getElementById('card-back').value.trim();
            const image = document.getElementById('card-image').value.trim();

            if (front && back) {
                deck.cards.push({ front, back, image, id: Date.now() });
                this.store.saveDecks(this.store.getDecks());
                closeModal();
                this.renderDeckDetails(container, deck);
            } else {
                alert('Please fill in both question and answer fields.');
            }
        });

        // Share deck
        document.getElementById('share-deck-btn')?.addEventListener('click', () => {
            if (typeof StudyGroupsView !== 'undefined') {
                StudyGroupsView.openShareModal(this.store, {
                    type: 'flashcard',
                    title: deck.title,
                    cards: deck.cards,
                    deckId: deck.id
                });
            } else {
                alert('Study Groups feature is loading...');
            }
        });

        // Delete card
        document.querySelectorAll('.delete-card-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.target.dataset.index;
                if (confirm('Delete this card?')) {
                    deck.cards.splice(index, 1);
                    this.store.saveDecks(this.store.getDecks());
                    this.renderDeckDetails(container, deck);
                }
            });
        });
    }

    async afterRender() {
        const modal = document.getElementById('create-deck-modal');
        document.getElementById('create-deck-btn')?.addEventListener('click', () => modal.classList.remove('hidden'));
        document.getElementById('cancel-deck')?.addEventListener('click', () => modal.classList.add('hidden'));

        document.getElementById('save-deck')?.addEventListener('click', () => {
            const title = document.getElementById('new-deck-title').value;
            if (title) {
                this.store.saveDecks([...this.store.getDecks(), { id: Date.now().toString(), title, cards: [] }]);
                modal.classList.add('hidden');
                this.render(document.getElementById('app-view')).then(() => this.afterRender());
            }
        });

        document.querySelectorAll('.delete-deck-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Delete this deck?')) {
                    const decks = this.store.getDecks().filter(d => d.id !== btn.dataset.id);
                    this.store.saveDecks(decks);
                    this.render(document.getElementById('app-view')).then(() => this.afterRender());
                }
            });
        });
    }
}
