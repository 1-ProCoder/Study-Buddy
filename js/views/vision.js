class VisionBoardView {
    constructor(store) {
        this.store = store;
    }

    async render(container) {
        const items = this.store.getVisionBoard();

        container.innerHTML = `
            <div class="vision-container fade-in">
                <div class="header-actions">
                    <div>
                        <h2>My Vision Board</h2>
                        <p class="text-muted">Pin your goals and dreams to stay motivated and focused.</p>
                    </div>
                    <button class="btn btn-primary" id="add-vision-btn">
                        <span class="icon">+</span> Add Goal
                    </button>
                </div>

                <div class="vision-grid">
                    ${items.length === 0 ? `
                        <div class="empty-state-full">
                            <div class="empty-icon">✨</div>
                            <h3>Your Vision Board is Empty</h3>
                            <p>Add goals and dreams to inspire yourself and track your ambitions.</p>
                        </div>
                    ` : ''}
                    ${items.map(item => `
                        <div class="vision-card-premium" style="background-image: url('${item.image}'); animation: fadeIn 0.6s ease-out">
                            <div class="vision-overlay-premium">
                                <div class="vision-content">
                                    <h3 class="vision-goal-text">${item.text}</h3>
                                </div>
                                <button class="btn-vision-delete" data-id="${item.id}" title="Delete goal">
                                    <span>×</span>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    async afterRender() {
        document.querySelectorAll('.btn-vision-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                this.store.removeFromVisionBoard(parseInt(btn.dataset.id));
                this.render(document.getElementById('app-view')).then(() => this.afterRender());
            });
        });

        document.getElementById('add-vision-btn')?.addEventListener('click', () => {
            const html = `
                <div id="vision-modal" class="modal">
                    <div class="modal-backdrop"></div>
                    <div class="modal-content-premium">
                        <div class="modal-header">
                            <h3>Add to Vision Board</h3>
                            <button class="modal-close" id="close-vision">×</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label>Your Goal</label>
                                <input type="text" id="vision-text" class="input-premium" placeholder="e.g., Get into Harvard" maxlength="100">
                                <small class="text-muted">Be specific and inspiring!</small>
                            </div>
                            <div class="form-group">
                                <label>Image URL</label>
                                <input type="text" id="vision-image" class="input-premium" placeholder="https://images.unsplash.com/...">
                                <small class="text-muted">Tip: Use Unsplash or Pexels for free images</small>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" id="cancel-vision">Cancel</button>
                            <button class="btn btn-primary" id="save-vision">Pin to Board</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', html);
            this.setupModalListeners();
        });
    }

    setupModalListeners() {
        const modal = document.getElementById('vision-modal');
        const backdrop = document.querySelector('.modal-backdrop');

        const closeModal = () => {
            modal.remove();
        };

        document.getElementById('cancel-vision')?.addEventListener('click', closeModal);
        document.getElementById('close-vision')?.addEventListener('click', closeModal);
        backdrop?.addEventListener('click', closeModal);

        document.getElementById('save-vision')?.addEventListener('click', () => {
            const text = document.getElementById('vision-text')?.value.trim();
            const image = document.getElementById('vision-image')?.value.trim() || 'https://images.unsplash.com/photo-1496449903678-68ddcb189a24?auto=format&fit=crop&w=500&q=60';

            if (text) {
                this.store.addToVisionBoard({ id: Date.now(), text, image });
                modal.remove();
                this.render(document.getElementById('app-view')).then(() => this.afterRender());
            }
        });
    }
}
