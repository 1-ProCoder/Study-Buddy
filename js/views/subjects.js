class SubjectsView {
    constructor(store) {
        this.store = store;
        this.activeSubjectId = null;
    }

    async render(container) {
        const subjects = this.store.getSubjects();
        let html = '';

        if (this.activeSubjectId) {
            html = this.renderSubjectDetails(subjects.find(s => s.id === this.activeSubjectId));
        } else {
            html = `
            <div class="subjects-container animate-fade-in">
                <div style="margin-bottom: 2rem;">
                    <h2 style="font-weight: 800; color: var(--text-main); margin-bottom: 0.5rem;">Your Subjects</h2>
                    <p class="text-muted">Organize your learning journey by subject and track your progress.</p>
                </div>

                ${subjects.length === 0 ? `
                    <div class="card" style="text-align: center; padding: 4rem 2rem;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">📚</div>
                        <h3 style="margin-bottom: 1rem;">No Subjects Yet</h3>
                        <p class="text-muted" style="margin-bottom: 2rem; max-width: 500px; margin-left: auto; margin-right: auto;">
                            Start by adding your first subject. Each subject can have multiple topics to help you stay organized and track your progress.
                        </p>
                        <button class="btn btn-primary" id="add-subject-btn" style="padding: 1rem 2rem; font-size:1rem;">
                            <span style="font-size: 1.2rem; margin-right: 0.5rem;">+</span> Add Your First Subject
                        </button>
                    </div>
                ` : `
                    <div style="display: flex; justify-content: flex-end; margin-bottom: 1.5rem;">
                        <button class="btn btn-primary" id="add-subject-btn">
                            <span style="font-size: 1.2rem; margin-right: 0.3rem;">+</span> New Subject
                        </button>
                    </div>

                    <div class="subjects-grid">
                        ${subjects.map(subject => {
                const progress = this.calculateProgress(subject);
                const totalTopics = subject.topics ? subject.topics.length : 0;
                const completedTopics = subject.topics ? subject.topics.filter(t => t.completed).length : 0;

                return `
                            <div class="subject-card-premium" data-id="${subject.id}" style="border-left: 4px solid ${subject.color};">
                                <div class="subject-card-header">
                                    <div class="subject-icon" style="background: ${subject.color}20; color: ${subject.color};">
                                        📖
                                    </div>
                                    <button class="delete-subject-btn" data-id="${subject.id}" title="Delete Subject">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                                        </svg>
                                    </button>
                                </div>
                                
                                <h3 class="subject-name">${subject.name}</h3>
                                
                                <div class="subject-stats">
                                    <div class="stat-item">
                                        <span class="stat-icon">📝</span>
                                        <span class="stat-text">${totalTopics} ${totalTopics === 1 ? 'Topic' : 'Topics'}</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-icon">✅</span>
                                        <span class="stat-text">${completedTopics} Completed</span>
                                    </div>
                                </div>

                                <div class="progress-section">
                                    <div class="progress-header">
                                        <span class="progress-label">Progress</span>
                                        <span class="progress-value">${progress}%</span>
                                    </div>
                                    <div class="progress-bar-container">
                                        <div class="progress-bar-fill" style="width: ${progress}%; background: ${subject.color};"></div>
                                    </div>
                                </div>

                                <div class="subject-card-footer">
                                    <span class="view-details">View Details →</span>
                                </div>
                            </div>
                        `;
            }).join('')}
                    </div>
                `}

                <!-- Add Subject Modal -->
                <div id="subject-modal" class="modal hidden">
                    <div class="modal-backdrop"></div>
                    <div class="modal-content-premium">
                        <div class="modal-header">
                            <h3>Add New Subject</h3>
                            <button class="modal-close" id="cancel-subject">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label>Subject Name</label>
                                <input type="text" id="subject-name" placeholder="e.g. Mathematics, Physics, History..." class="input-premium">
                            </div>
                            <div class="form-group">
                                <label>Color Theme</label>
                                <div class="color-picker-grid">
                                    <input type="radio" name="subject-color" value="#6366f1" id="color-1" checked>
                                    <label for="color-1" class="color-option" style="background: #6366f1;"></label>
                                    
                                    <input type="radio" name="subject-color" value="#0ea5e9" id="color-2">
                                    <label for="color-2" class="color-option" style="background: #0ea5e9;"></label>
                                    
                                    <input type="radio" name="subject-color" value="#10b981" id="color-3">
                                    <label for="color-3" class="color-option" style="background: #10b981;"></label>
                                    
                                    <input type="radio" name="subject-color" value="#f59e0b" id="color-4">
                                    <label for="color-4" class="color-option" style="background: #f59e0b;"></label>
                                    
                                    <input type="radio" name="subject-color" value="#ef4444" id="color-5">
                                    <label for="color-5" class="color-option" style="background: #ef4444;"></label>
                                    
                                    <input type="radio" name="subject-color" value="#8b5cf6" id="color-6">
                                    <label for="color-6" class="color-option" style="background: #8b5cf6;"></label>
                                    
                                    <input type="radio" name="subject-color" value="#ec4899" id="color-7">
                                    <label for="color-7" class="color-option" style="background: #ec4899;"></label>
                                    
                                    <input type="radio" name="subject-color" value="#06b6d4" id="color-8">
                                    <label for="color-8" class="color-option" style="background: #06b6d4;"></label>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" id="cancel-subject-2">Cancel</button>
                            <button class="btn btn-primary" id="save-subject">Create Subject</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        }

        if (container) container.innerHTML = html;
        return html;
    }

    renderSubjectDetails(subject) {
        if (!subject) {
            this.activeSubjectId = null;
            return this.render();
        }

        return `
            <div class="subject-details">
                <button class="btn btn-secondary mb-4" id="back-btn">← Back to Subjects</button>
                
                <div class="card details-header" style="border-top: 5px solid ${subject.color}">
                    <h2>${subject.name}</h2>
                    <div class="progress-container">
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${this.calculateProgress(subject)}%; background-color: ${subject.color}"></div>
                        </div>
                    </div>
                </div>

                <div class="topics-section">
                    <div class="header-actions">
                        <h3>Topics</h3>
                        <button class="btn btn-primary" id="add-topic-btn">+ Add Topic</button>
                    </div>
                    
                    <div class="topics-list" id="topics-list">
                        ${subject.topics && subject.topics.length > 0 ? subject.topics.map((topic, index) => `
                            <div class="card topic-card ${topic.completed ? 'completed' : ''}">
                                <div class="topic-check">
                                    <input type="checkbox" class="topic-checkbox" data-idx="${index}" ${topic.completed ? 'checked' : ''}>
                                </div>
                                <div class="topic-info">
                                    <div class="topic-main">
                                        <h4>${topic.name}</h4>
                                        <span class="badge ${topic.difficulty.toLowerCase()}">${topic.difficulty}</span>
                                    </div>
                                    <p class="topic-meta">⏱ ${topic.estimatedTime} mins</p>
                                    ${topic.notes ? `<p class="topic-notes">${topic.notes}</p>` : ''}
                                </div>
                                <button class="btn-icon delete-topic-btn" data-idx="${index}">×</button>
                            </div>
                        `).join('') : '<p class="empty-state">No topics added yet.</p>'}
                    </div>
                </div>

                <!-- Add Topic Modal -->
                <div id="topic-modal" class="modal hidden">
                    <div class="modal-content">
                        <h3>Add Topic</h3>
                        <input type="text" id="topic-name" placeholder="Topic Name">
                        <select id="topic-difficulty">
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                        </select>
                        <input type="number" id="topic-time" placeholder="Est. Time (mins)">
                        <textarea id="topic-notes" placeholder="Notes..."></textarea>
                        <div class="modal-actions">
                            <button class="btn btn-secondary" id="cancel-topic">Cancel</button>
                            <button class="btn btn-primary" id="save-topic">Save</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    calculateProgress(subject) {
        if (!subject.topics || subject.topics.length === 0) return 0;
        const completed = subject.topics.filter(t => t.completed).length;
        return Math.round((completed / subject.topics.length) * 100);
    }

    async afterRender() {
        if (this.activeSubjectId) {
            this.attachDetailsListeners();
        } else {
            this.attachMainListeners();
        }
    }

    attachMainListeners() {
        // Use functions that re-query modal elements so handlers always operate on current DOM
        const getModal = () => document.getElementById('subject-modal');
        const getModalContent = () => document.querySelector('.modal-content-premium');
        const getSubjectNameInput = () => document.getElementById('subject-name');

        // Helper function to close modal with animation
        const closeModal = () => {
            const modal = getModal();
            const modalContent = getModalContent();
            const subjectNameInput = getSubjectNameInput();
            if (modal && modalContent) {
                modalContent.style.animation = 'modalSlideOut 0.3s ease-out forwards';
                setTimeout(() => {
                    // Remove modal from DOM so it doesn't reappear unexpectedly
                    if (modal.parentNode) modal.parentNode.removeChild(modal);
                    modalContent.style.animation = '';
                    // Reset form
                    if (subjectNameInput) subjectNameInput.value = '';
                    const firstColor = document.getElementById('color-1');
                    if (firstColor) firstColor.checked = true;
                }, 300);
            }
        };

        // Show Modal with animation
        document.getElementById('add-subject-btn')?.addEventListener('click', () => {
            const modal = getModal();
            const subjectNameInput = getSubjectNameInput();
            if (!modal) {
                // Modal removed from DOM — re-render the view to recreate it, then open
                this.render().then(html => {
                    document.getElementById('app-view').innerHTML = html;
                    this.afterRender();
                    const newModal = getModal();
                    const newSubjectNameInput = getSubjectNameInput();
                    if (newModal) newModal.classList.remove('hidden');
                    setTimeout(() => {
                        if (newSubjectNameInput) newSubjectNameInput.focus();
                    }, 100);
                });
                return;
            }
            modal.classList.remove('hidden');
            setTimeout(() => {
                if (subjectNameInput) subjectNameInput.focus();
            }, 100);
        });

        // Close modal - X button
        document.getElementById('cancel-subject')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        });

        // Close modal - Cancel button in footer
        document.getElementById('cancel-subject-2')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        });

        // Close modal - Backdrop click (scoped to modal)
        const modal = getModal();
        modal?.querySelector('.modal-backdrop')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        });

        // Prevent modal content click from closing
        modal?.querySelector('.modal-content-premium')?.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Save Subject
        document.getElementById('save-subject')?.addEventListener('click', (e) => {
            e.preventDefault();
            const subjectNameInput = getSubjectNameInput();
            const name = subjectNameInput?.value.trim();
            const colorInput = document.querySelector('input[name="subject-color"]:checked');
            const color = colorInput ? colorInput.value : '#6366f1';

            if (name) {
                this.store.addSubject({
                    id: Date.now().toString(),
                    name,
                    color,
                    topics: []
                });
                this.store.save('subjects');

                // Show success feedback
                const btn = e.target;
                if (btn) {
                    btn.innerHTML = '✓ Created!';
                    btn.disabled = true;
                }

                setTimeout(() => {
                    closeModal();
                    this.render().then(html => {
                        document.getElementById('app-view').innerHTML = html;
                        this.afterRender();
                    });
                }, 500);
            } else {
                // Shake animation for empty input
                if (subjectNameInput) {
                    subjectNameInput.style.animation = 'shake 0.5s';
                    subjectNameInput.focus();
                    setTimeout(() => {
                        subjectNameInput.style.animation = '';
                    }, 500);
                }
            }
        });

        // Enter key to submit
        getSubjectNameInput()?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('save-subject')?.click();
            }
        });

        // Click Subject Card
        document.querySelectorAll('.subject-card-premium').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.delete-subject-btn')) {
                    this.activeSubjectId = card.dataset.id;
                    this.render().then(html => {
                        document.getElementById('app-view').innerHTML = html;
                        this.afterRender();
                    });
                }
            });
        });

        // Delete Subject
        document.querySelectorAll('.delete-subject-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Delete this subject and all its topics?')) {
                    this.store.deleteSubject(btn.dataset.id);
                    this.render().then(html => {
                        document.getElementById('app-view').innerHTML = html;
                        this.afterRender();
                    });
                }
            });
        });
    }

    attachDetailsListeners() {
        const subject = this.store.getSubjects().find(s => s.id === this.activeSubjectId);
        if (!subject) return;

        // Back Button
        document.getElementById('back-btn')?.addEventListener('click', () => {
            this.activeSubjectId = null;
            this.render().then(html => {
                document.getElementById('app-view').innerHTML = html;
                this.afterRender();
            });
        });

        // Add Topic Modal
        const modal = document.getElementById('topic-modal');
        document.getElementById('add-topic-btn')?.addEventListener('click', () => {
            modal.classList.remove('hidden');
        });
        document.getElementById('cancel-topic')?.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        // Save Topic
        document.getElementById('save-topic')?.addEventListener('click', () => {
            const name = document.getElementById('topic-name').value;
            const difficulty = document.getElementById('topic-difficulty').value;
            const time = document.getElementById('topic-time').value;
            const notes = document.getElementById('topic-notes').value;

            if (name) {
                subject.topics.push({
                    id: Date.now().toString(),
                    name,
                    difficulty,
                    estimatedTime: time || 30,
                    notes,
                    completed: false
                });
                this.store.updateSubject(subject);
                this.render().then(html => {
                    document.getElementById('app-view').innerHTML = html;
                    this.afterRender();
                });
            }
        });

        // Toggle Completion
        document.querySelectorAll('.topic-checkbox').forEach(box => {
            box.addEventListener('change', (e) => {
                const idx = e.target.dataset.idx;
                subject.topics[idx].completed = e.target.checked;
                this.store.updateSubject(subject);
                this.render().then(html => {
                    document.getElementById('app-view').innerHTML = html;
                    this.afterRender();
                });
            });
        });

        // Delete Topic
        document.querySelectorAll('.delete-topic-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = btn.dataset.idx;
                subject.topics.splice(idx, 1);
                this.store.updateSubject(subject);
                this.render().then(html => {
                    document.getElementById('app-view').innerHTML = html;
                    this.afterRender();
                });
            });
        });
    }
}