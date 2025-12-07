class StudyGroupsView {
    constructor(store, authManager) {
        this.store = store;
        this.authManager = authManager;
        this.firebaseService = window.firebaseService;
        this.useFirebase = window.firebaseConfig && 
                          window.firebaseConfig.apiKey !== "YOUR_API_KEY" &&
                          typeof window.firebaseService !== 'undefined';
    }

    async render(container) {
        let groups, userGroups, sharedResources;
        
        if (this.useFirebase) {
            // Use Firebase
            const currentUser = this.authManager.getCurrentUser();
            if (currentUser) {
                const groupsResult = await this.firebaseService.getStudyGroups(currentUser.userId);
                userGroups = groupsResult.success ? groupsResult.data : [];
                groups = userGroups; // For Firebase, userGroups is the full group data
                sharedResources = []; // Will be loaded per group
            } else {
                groups = [];
                userGroups = [];
                sharedResources = [];
            }
        } else {
            // Use localStorage
            groups = this.getGroups();
            userGroups = this.getUserGroups();
            sharedResources = this.getSharedResources();
        }

        container.innerHTML = `
            <div class="study-groups-container animate-fade-in">
                <div class="header-actions">
                    <h2>Study Groups</h2>
                    <div style="display: flex; gap: 1rem;">
                        <button id="join-group-btn" class="btn btn-secondary">Join Group</button>
                        <button id="create-group-btn" class="btn btn-primary">+ Create Group</button>
                    </div>
                </div>

                ${userGroups.length === 0 ? `
                    <div class="card" style="text-align: center; padding: 3rem; margin-top: 2rem;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">👥</div>
                        <h3 style="margin-bottom: 0.5rem;">No Study Groups Yet</h3>
                        <p class="text-muted" style="margin-bottom: 2rem;">Create or join a study group to start sharing flashcards and notes with classmates!</p>
                        <div style="display: flex; gap: 1rem; justify-content: center;">
                            <button class="btn btn-primary" onclick="document.getElementById('create-group-btn').click()">Create Group</button>
                            <button class="btn btn-secondary" onclick="document.getElementById('join-group-btn').click()">Join Group</button>
                        </div>
                    </div>
                ` : `
                    <div class="groups-grid" id="groups-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 2rem; margin-top: 2rem;">
                        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                            <div class="spinner" style="border: 4px solid var(--border); border-top: 4px solid var(--primary); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                            <p style="margin-top: 1rem; color: var(--text-muted);">Loading groups...</p>
                        </div>
                    </div>
                `}
            </div>

            ${this.renderCreateGroupModal()}
            ${this.renderJoinGroupModal()}
            ${this.renderShareModal()}
        `;

        this.attachEventListeners();
        
        // Load group cards asynchronously if using Firebase
        if (this.useFirebase && userGroups.length > 0) {
            this.loadGroupCards(userGroups, sharedResources);
            
            // Set up real-time listeners for Firebase groups
            userGroups.forEach(group => {
                this.firebaseService.onStudyGroupUpdate(group.id, (flashcards) => {
                    // Update UI when new flashcards are shared
                    this.loadGroupCards(userGroups, sharedResources);
                });
            });
        } else if (userGroups.length > 0) {
            // For localStorage, render immediately
            const grid = document.getElementById('groups-grid');
            if (grid) {
                const cards = userGroups.map(group => this.renderGroupCardSync(group, sharedResources));
                grid.innerHTML = cards.join('');
            }
        }
    }

    async loadGroupCards(userGroups, sharedResources) {
        const grid = document.getElementById('groups-grid');
        if (!grid) return;
        
        try {
            const cards = await Promise.all(
                userGroups.map(async group => await this.renderGroupCard(group, sharedResources))
            );
            grid.innerHTML = cards.join('');
            // Re-attach event listeners for the new cards
            this.attachGroupCardListeners();
        } catch (error) {
            console.error('Error loading group cards:', error);
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--danger);">Error loading groups. Please refresh.</div>';
        }
    }

    renderGroupCardSync(group, sharedResources) {
        // Synchronous version for localStorage
        const groupResources = sharedResources.filter(r => r.groupId === group.id);
        const members = group.members || [];
        const currentUser = this.authManager?.getCurrentUser() || this.store.getUser();
        const isOwner = group.createdBy === (currentUser.userId || currentUser.accountId);

        return `
            <div class="card group-card" data-group-id="${group.id}">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div>
                        <h3 style="margin-bottom: 0.5rem;">${group.name}</h3>
                        <p class="text-muted" style="font-size: 0.9rem; margin-bottom: 0.5rem;">${group.subject || 'General'}</p>
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                            <span style="font-size: 0.85rem; color: var(--text-muted);">Code: </span>
                            <code style="background: var(--bg-body); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.9rem; font-weight: 600; color: var(--primary);">${group.code}</code>
                            <button class="btn-icon-sm copy-code-btn" data-code="${group.code}" title="Copy code" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;">📋</button>
                        </div>
                    </div>
                    ${isOwner ? `
                        <button class="btn-icon-sm delete-group-btn" data-group-id="${group.id}" title="Delete group">🗑️</button>
                    ` : `
                        <button class="btn-icon-sm leave-group-btn" data-group-id="${group.id}" title="Leave group">👋</button>
                    `}
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <h4 style="font-size: 0.95rem; color: var(--text-muted);">Members (${members.length})</h4>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${members.map(member => `
                            <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: var(--bg-body); border-radius: 8px;">
                                <span style="font-size: 1.2rem;">${member.avatar || '👤'}</span>
                                <span style="font-size: 0.85rem; font-weight: 600;">${member.name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div style="border-top: 1px solid var(--border); padding-top: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <h4 style="font-size: 0.95rem; color: var(--text-muted);">Shared Resources (${groupResources.length})</h4>
                    </div>
                    ${groupResources.length === 0 ? `
                        <p class="text-muted" style="font-size: 0.85rem; text-align: center; padding: 1rem;">No resources shared yet</p>
                    ` : `
                        <div style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 300px; overflow-y: auto;">
                            ${groupResources.slice(0, 5).map(resource => this.renderResourceCard(resource)).join('')}
                            ${groupResources.length > 5 ? `
                                <button class="btn btn-secondary btn-sm" onclick="window.location.hash = '#studyGroups/${group.id}'" style="margin-top: 0.5rem;">View All (${groupResources.length})</button>
                            ` : ''}
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    async loadShareModalGroups() {
        const groupsList = document.getElementById('share-groups-list');
        if (!groupsList) return;

        let groups;
        if (this.useFirebase) {
            const currentUser = this.authManager.getCurrentUser();
            if (currentUser) {
                const groupsResult = await this.firebaseService.getStudyGroups(currentUser.userId);
                groups = groupsResult.success ? groupsResult.data : [];
            } else {
                groups = [];
            }
        } else {
            groups = this.getUserGroups();
        }

        if (groups.length === 0) {
            groupsList.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">No groups available. Create a group first!</div>';
            return;
        }

        groupsList.innerHTML = groups.map(group => `
            <label style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: var(--bg-body); border-radius: 8px; cursor: pointer; border: 2px solid var(--border); transition: all 0.2s;">
                <input type="checkbox" value="${group.id}" class="group-checkbox" style="width: auto;">
                <div style="flex: 1;">
                    <div style="font-weight: 600;">${group.name || group.groupName}</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted);">${group.subject || 'General'}</div>
                </div>
            </label>
        `).join('');
    }

    attachGroupCardListeners() {
        // Re-attach listeners for dynamically loaded cards
        document.querySelectorAll('.copy-code-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const code = btn.dataset.code;
                navigator.clipboard.writeText(code).then(() => {
                    btn.textContent = '✓';
                    setTimeout(() => {
                        btn.textContent = '📋';
                    }, 2000);
                });
            });
        });

        document.querySelectorAll('.delete-group-btn, .leave-group-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const groupId = btn.dataset.groupId;
                if (btn.classList.contains('delete-group-btn')) {
                    if (confirm('Are you sure you want to delete this group? This will remove it for all members.')) {
                        this.handleDeleteGroup(groupId);
                    }
                } else {
                    if (confirm('Are you sure you want to leave this group?')) {
                        this.handleLeaveGroup(groupId);
                    }
                }
            });
        });

        document.querySelectorAll('.add-to-collection-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const resourceId = btn.dataset.resourceId;
                this.handleAddToCollection(resourceId);
            });
        });
    }

    async renderGroupCard(group, sharedResources) {
        let groupResources = [];
        if (this.useFirebase) {
            // Load shared flashcards from Firebase
            try {
                const flashcardsResult = await this.firebaseService.getSharedFlashcards(group.id);
                if (flashcardsResult.success) {
                    groupResources = flashcardsResult.data.map(fc => ({
                        id: fc.id,
                        groupId: group.id,
                        type: 'flashcard',
                        title: fc.question,
                        content: fc.answer,
                        sharedBy: { name: fc.sharedBy },
                        sharedAt: fc.sharedAt?.toDate ? fc.sharedAt.toDate().toISOString() : (fc.sharedAt || new Date().toISOString())
                    }));
                }
            } catch (error) {
                console.error('Error loading shared flashcards:', error);
            }
        } else {
            groupResources = sharedResources.filter(r => r.groupId === group.id);
        }
        
        const members = group.members || [];
        const currentUser = this.authManager?.getCurrentUser() || this.store.getUser();
        const isOwner = group.createdBy === (currentUser.userId || currentUser.accountId);

        return `
            <div class="card group-card" data-group-id="${group.id}">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div>
                        <h3 style="margin-bottom: 0.5rem;">${group.name || group.groupName}</h3>
                        <p class="text-muted" style="font-size: 0.9rem; margin-bottom: 0.5rem;">${group.subject || 'General'}</p>
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                            <span style="font-size: 0.85rem; color: var(--text-muted);">Code: </span>
                            <code style="background: var(--bg-body); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.9rem; font-weight: 600; color: var(--primary);">${group.code || group.groupCode}</code>
                            <button class="btn-icon-sm copy-code-btn" data-code="${group.code}" title="Copy code" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;">📋</button>
                        </div>
                    </div>
                    ${isOwner ? `
                        <button class="btn-icon-sm delete-group-btn" data-group-id="${group.id}" title="Delete group">🗑️</button>
                    ` : `
                        <button class="btn-icon-sm leave-group-btn" data-group-id="${group.id}" title="Leave group">👋</button>
                    `}
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <h4 style="font-size: 0.95rem; color: var(--text-muted);">Members (${members.length})</h4>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${members.map(member => `
                            <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: var(--bg-body); border-radius: 8px;">
                                <span style="font-size: 1.2rem;">${member.avatar || '👤'}</span>
                                <span style="font-size: 0.85rem; font-weight: 600;">${member.name || member.username}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div style="border-top: 1px solid var(--border); padding-top: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <h4 style="font-size: 0.95rem; color: var(--text-muted);">Shared Resources (${groupResources.length})</h4>
                    </div>
                    ${groupResources.length === 0 ? `
                        <p class="text-muted" style="font-size: 0.85rem; text-align: center; padding: 1rem;">No resources shared yet</p>
                    ` : `
                        <div style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 300px; overflow-y: auto;">
                            ${groupResources.slice(0, 5).map(resource => this.renderResourceCard(resource)).join('')}
                            ${groupResources.length > 5 ? `
                                <button class="btn btn-secondary btn-sm" onclick="window.location.hash = '#studyGroups/${group.id}'" style="margin-top: 0.5rem;">View All (${groupResources.length})</button>
                            ` : ''}
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    renderResourceCard(resource) {
        const sharedBy = resource.sharedBy || {};
        const sharedDate = new Date(resource.sharedAt).toLocaleDateString();

        return `
            <div class="shared-resource-card" style="padding: 0.75rem; background: var(--bg-body); border-radius: 8px; border: 1px solid var(--border);">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <span style="font-size: 1.2rem;">${resource.type === 'flashcard' ? '🎴' : '📝'}</span>
                            <strong style="font-size: 0.9rem;">${resource.title}</strong>
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">
                            Shared by ${sharedBy.name || 'Unknown'} • ${sharedDate}
                        </div>
                    </div>
                    <button class="btn btn-primary btn-sm add-to-collection-btn" data-resource-id="${resource.id}" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">+ Add</button>
                </div>
            </div>
        `;
    }

    renderCreateGroupModal() {
        return `
            <div id="create-group-modal" class="modal hidden">
                <div class="modal-backdrop"></div>
                <div class="modal-content-premium" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>Create Study Group</h3>
                        <button class="modal-close" id="close-create-group">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Group Name</label>
                            <input type="text" id="group-name-input" placeholder="e.g., GCSE Maths Study Group" class="input-premium">
                        </div>
                        <div class="form-group">
                            <label>Subject</label>
                            <select id="group-subject-input" class="input-premium">
                                <option value="">General</option>
                                ${this.store.getSubjects().map(s => `
                                    <option value="${s.name}">${s.name}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Description (Optional)</label>
                            <textarea id="group-description-input" placeholder="What is this group for?" class="input-premium" rows="3"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="cancel-create-group">Cancel</button>
                        <button class="btn btn-primary" id="save-create-group">Create Group</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderJoinGroupModal() {
        return `
            <div id="join-group-modal" class="modal hidden">
                <div class="modal-backdrop"></div>
                <div class="modal-content-premium" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>Join Study Group</h3>
                        <button class="modal-close" id="close-join-group">×</button>
                    </div>
                    <div class="modal-body">
                        <p class="text-muted" style="margin-bottom: 1.5rem;">Enter the group code provided by your classmate or teacher.</p>
                        <div class="form-group">
                            <label>Group Code</label>
                            <input type="text" id="group-code-input" placeholder="Enter 6-digit code" class="input-premium" maxlength="6" style="text-transform: uppercase; font-size: 1.2rem; letter-spacing: 0.2em; text-align: center;">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="cancel-join-group">Cancel</button>
                        <button class="btn btn-primary" id="save-join-group">Join Group</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderShareModal() {
        // Groups will be loaded when modal is opened
        return `
            <div id="share-to-group-modal" class="modal hidden">
                <div class="modal-backdrop"></div>
                <div class="modal-content-premium" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>Share to Study Group</h3>
                        <button class="modal-close" id="close-share-modal">×</button>
                    </div>
                    <div class="modal-body">
                        <div id="share-resource-preview" style="margin-bottom: 1.5rem; padding: 1rem; background: var(--bg-body); border-radius: 8px;"></div>
                        <div class="form-group">
                            <label>Select Group(s)</label>
                            <div style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 300px; overflow-y: auto;">
                                ${groups.map(group => `
                                    <label style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: var(--bg-body); border-radius: 8px; cursor: pointer; border: 2px solid var(--border); transition: all 0.2s;">
                                        <input type="checkbox" value="${group.id}" class="group-checkbox" style="width: auto;">
                                        <div style="flex: 1;">
                                            <div style="font-weight: 600;">${group.name}</div>
                                            <div style="font-size: 0.85rem; color: var(--text-muted);">${group.subject || 'General'}</div>
                                        </div>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="cancel-share-modal">Cancel</button>
                        <button class="btn btn-primary" id="save-share-modal">Share</button>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Create Group
        document.getElementById('create-group-btn')?.addEventListener('click', () => {
            document.getElementById('create-group-modal').classList.remove('hidden');
        });

        document.getElementById('close-create-group')?.addEventListener('click', () => {
            document.getElementById('create-group-modal').classList.add('hidden');
        });

        document.getElementById('cancel-create-group')?.addEventListener('click', () => {
            document.getElementById('create-group-modal').classList.add('hidden');
        });

        document.getElementById('save-create-group')?.addEventListener('click', () => {
            this.handleCreateGroup();
        });

        // Join Group
        document.getElementById('join-group-btn')?.addEventListener('click', () => {
            document.getElementById('join-group-modal').classList.remove('hidden');
        });

        document.getElementById('close-join-group')?.addEventListener('click', () => {
            document.getElementById('join-group-modal').classList.add('hidden');
        });

        document.getElementById('cancel-join-group')?.addEventListener('click', () => {
            document.getElementById('join-group-modal').classList.add('hidden');
        });

        document.getElementById('save-join-group')?.addEventListener('click', () => {
            this.handleJoinGroup();
        });

        // Copy Code
        document.querySelectorAll('.copy-code-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const code = btn.dataset.code;
                navigator.clipboard.writeText(code).then(() => {
                    btn.textContent = '✓';
                    setTimeout(() => {
                        btn.textContent = '📋';
                    }, 2000);
                });
            });
        });

        // Delete/Leave Group
        document.querySelectorAll('.delete-group-btn, .leave-group-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const groupId = btn.dataset.groupId;
                if (btn.classList.contains('delete-group-btn')) {
                    if (confirm('Are you sure you want to delete this group? This will remove it for all members.')) {
                        this.handleDeleteGroup(groupId);
                    }
                } else {
                    if (confirm('Are you sure you want to leave this group?')) {
                        this.handleLeaveGroup(groupId);
                    }
                }
            });
        });

        // Add to Collection
        document.querySelectorAll('.add-to-collection-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const resourceId = btn.dataset.resourceId;
                this.handleAddToCollection(resourceId);
            });
        });

        // Share Modal
        document.getElementById('close-share-modal')?.addEventListener('click', () => {
            document.getElementById('share-to-group-modal').classList.add('hidden');
        });

        document.getElementById('cancel-share-modal')?.addEventListener('click', () => {
            document.getElementById('share-to-group-modal').classList.add('hidden');
        });

        document.getElementById('save-share-modal')?.addEventListener('click', () => {
            this.handleShare();
        });
    }

    async handleCreateGroup() {
        const name = document.getElementById('group-name-input').value.trim();
        const subject = document.getElementById('group-subject-input').value;
        const description = document.getElementById('group-description-input').value.trim();

        if (!name) {
            alert('Please enter a group name');
            return;
        }

        const currentUser = this.authManager?.getCurrentUser() || this.store.getUser();
        
        if (this.useFirebase) {
            // Use Firebase
            const result = await this.firebaseService.createStudyGroup(
                name,
                subject,
                description,
                currentUser.userId
            );
            
            if (result.success) {
                document.getElementById('create-group-modal').classList.add('hidden');
                await this.render(document.getElementById('app-view'));
            } else {
                alert(result.message || 'Failed to create group');
            }
        } else {
            // Use localStorage
            const code = this.generateGroupCode();
            const group = {
                id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name,
                subject,
                description,
                code: code.toUpperCase(),
                createdBy: currentUser.userId,
                createdAt: new Date().toISOString(),
                members: [{
                    userId: currentUser.userId,
                    name: currentUser.name || currentUser.username,
                    avatar: currentUser.avatar || '👤',
                    joinedAt: new Date().toISOString()
                }]
            };

            const groups = this.getGroups();
            groups.push(group);
            this.saveGroups(groups);

            // Add to user's groups
            const userGroups = this.getUserGroups();
            userGroups.push(group.id);
            this.saveUserGroups(userGroups);

            document.getElementById('create-group-modal').classList.add('hidden');
            this.render(document.getElementById('app-view'));
        }
    }

    async handleJoinGroup() {
        const code = document.getElementById('group-code-input').value.trim().toUpperCase();

        if (!code || code.length !== 6) {
            alert('Please enter a valid 6-digit group code');
            return;
        }

        const currentUser = this.authManager?.getCurrentUser() || this.store.getUser();
        
        if (this.useFirebase) {
            // Use Firebase
            const result = await this.firebaseService.joinStudyGroup(code, currentUser.userId);
            
            if (result.success) {
                document.getElementById('join-group-modal').classList.add('hidden');
                await this.render(document.getElementById('app-view'));
            } else {
                alert(result.message || 'Failed to join group');
            }
        } else {
            // Use localStorage
            const groups = this.getGroups();
            const group = groups.find(g => g.code === code);

            if (!group) {
                alert('Group not found. Please check the code and try again.');
                return;
            }

            const isMember = group.members.some(m => m.userId === currentUser.userId);

            if (isMember) {
                alert('You are already a member of this group.');
                return;
            }

            // Add user to group
            group.members.push({
                userId: currentUser.userId,
                name: currentUser.name || currentUser.username,
                avatar: currentUser.avatar || '👤',
                joinedAt: new Date().toISOString()
            });

            this.saveGroups(groups);

            // Add to user's groups
            const userGroups = this.getUserGroups();
            if (!userGroups.includes(group.id)) {
                userGroups.push(group.id);
                this.saveUserGroups(userGroups);
            }

            document.getElementById('join-group-modal').classList.add('hidden');
            this.render(document.getElementById('app-view'));
        }
    }

    handleDeleteGroup(groupId) {
        const groups = this.getGroups();
        const updatedGroups = groups.filter(g => g.id !== groupId);
        this.saveGroups(updatedGroups);

        // Remove from all users' groups
        const allAccounts = this.store.accountManager.getAllAccounts();
        Object.values(allAccounts).forEach(account => {
            if (account.studyGroups) {
                account.studyGroups = account.studyGroups.filter(id => id !== groupId);
                this.store.accountManager.updateAccount(account.accountId, { studyGroups: account.studyGroups });
            }
        });

        this.render(document.getElementById('app-view'));
    }

    handleLeaveGroup(groupId) {
        const groups = this.getGroups();
        const group = groups.find(g => g.id === groupId);
        if (group) {
            const currentUser = this.store.getUser();
            group.members = group.members.filter(m => m.userId !== currentUser.userId);
            this.saveGroups(groups);
        }

        const userGroups = this.getUserGroups();
        const updated = userGroups.filter(id => id !== groupId);
        this.saveUserGroups(updated);

        this.render(document.getElementById('app-view'));
    }

    handleAddToCollection(resourceId) {
        const resources = this.getSharedResources();
        const resource = resources.find(r => r.id === resourceId);

        if (!resource) return;

        if (resource.type === 'flashcard') {
            const decks = this.store.getDecks();
            const existingDeck = decks.find(d => d.id === resource.deckId);
            if (existingDeck) {
                // Add cards to existing deck or create new
                if (resource.cards) {
                    existingDeck.cards.push(...resource.cards);
                    this.store.saveDecks(decks);
                    alert('Flashcards added to your collection!');
                }
            }
        } else if (resource.type === 'note') {
            // Handle notes - you might want to create a notes system
            alert('Note added to your collection!');
        }
    }

    async handleShare() {
        const selectedGroups = Array.from(document.querySelectorAll('.group-checkbox:checked')).map(cb => cb.value);
        const shareData = window.currentShareData;

        if (selectedGroups.length === 0) {
            alert('Please select at least one group');
            return;
        }

        if (!shareData) {
            alert('No resource to share');
            return;
        }

        const currentUser = this.authManager?.getCurrentUser() || this.store.getUser();
        
        if (this.useFirebase) {
            // Use Firebase
            try {
                for (const groupId of selectedGroups) {
                    if (shareData.type === 'flashcard' && shareData.cards) {
                        // Share each flashcard
                        for (const card of shareData.cards) {
                            await this.firebaseService.shareFlashcardToGroup(
                                groupId,
                                {
                                    front: card.front || card.question,
                                    back: card.back || card.answer,
                                    subject: shareData.subject || ''
                                },
                                currentUser.username || currentUser.name
                            );
                        }
                    }
                }
                
                document.getElementById('share-to-group-modal').classList.add('hidden');
                window.currentShareData = null;
                
                // Show success message
                const feedback = document.createElement('div');
                feedback.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--primary); color: white; padding: 1rem 2rem; border-radius: 12px; z-index: 10001; box-shadow: 0 4px 12px rgba(0,0,0,0.2);';
                feedback.textContent = 'Shared successfully!';
                document.body.appendChild(feedback);
                setTimeout(() => feedback.remove(), 2000);
            } catch (error) {
                alert('Failed to share: ' + error.message);
            }
        } else {
            // Use localStorage
            const resources = this.getSharedResources();

            selectedGroups.forEach(groupId => {
                const resource = {
                    id: `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    groupId,
                    type: shareData.type,
                    title: shareData.title,
                    content: shareData.content,
                    cards: shareData.cards,
                    deckId: shareData.deckId,
                    sharedBy: {
                        userId: currentUser.userId,
                        name: currentUser.name || currentUser.username,
                        avatar: currentUser.avatar || '👤'
                    },
                    sharedAt: new Date().toISOString()
                };
                resources.push(resource);
            });

            this.saveSharedResources(resources);
            document.getElementById('share-to-group-modal').classList.add('hidden');
            window.currentShareData = null;

            // Show success message
            const feedback = document.createElement('div');
            feedback.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--primary); color: white; padding: 1rem 2rem; border-radius: 12px; z-index: 10001; box-shadow: 0 4px 12px rgba(0,0,0,0.2);';
            feedback.textContent = 'Shared successfully!';
            document.body.appendChild(feedback);
            setTimeout(() => feedback.remove(), 2000);
        }
    }

    generateGroupCode() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }

    // Storage methods
    getGroups() {
        const shared = localStorage.getItem('sb_shared_groups');
        return shared ? JSON.parse(shared) : [];
    }

    saveGroups(groups) {
        localStorage.setItem('sb_shared_groups', JSON.stringify(groups));
    }

    getUserGroups() {
        const currentAccount = this.store.accountManager.getCurrentAccount();
        if (!currentAccount) return [];
        const groupIds = currentAccount.studyGroups || [];
        const allGroups = this.getGroups();
        return allGroups.filter(g => groupIds.includes(g.id));
    }

    saveUserGroups(groupIds) {
        const currentAccount = this.store.accountManager.getCurrentAccount();
        if (currentAccount) {
            this.store.accountManager.updateAccount(currentAccount.accountId, { studyGroups: groupIds });
        }
    }

    getSharedResources() {
        const shared = localStorage.getItem('sb_shared_resources');
        return shared ? JSON.parse(shared) : [];
    }

    saveSharedResources(resources) {
        localStorage.setItem('sb_shared_resources', JSON.stringify(resources));
    }

    // Static method to open share modal
    static openShareModal(store, shareData) {
        window.currentShareData = shareData;
        const modal = document.getElementById('share-to-group-modal');
        if (modal) {
            const preview = document.getElementById('share-resource-preview');
            if (preview) {
                preview.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span style="font-size: 2rem;">${shareData.type === 'flashcard' ? '🎴' : '📝'}</span>
                        <div>
                            <div style="font-weight: 600; margin-bottom: 0.25rem;">${shareData.title}</div>
                            <div style="font-size: 0.85rem; color: var(--text-muted);">
                                ${shareData.type === 'flashcard' ? `${shareData.cards?.length || 0} cards` : 'Note'}
                            </div>
                        </div>
                    </div>
                `;
            }
            modal.classList.remove('hidden');
        }
    }
}

