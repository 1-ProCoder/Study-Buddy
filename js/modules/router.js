class Router {
    constructor(routes) {
        this.routes = routes;
        this.viewContainer = document.getElementById('app-view');
        this.pageTitle = document.getElementById('page-title');
        this.navLinks = document.querySelectorAll('.nav-link');

        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute(); // Handle initial load
    }

    async handleRoute() {
        try {
            // Check authentication for protected routes
            if (typeof authManager !== 'undefined' && !authManager.isAuthenticated()) {
                const authView = new AuthView(authManager, () => {
                    // Reload after successful auth
                    location.reload();
                });
                authView.render(this.viewContainer);
                return;
            }

            const hash = window.location.hash.slice(1) || 'dashboard';
            const [route, id, action] = hash.split('/');

            console.log(`Navigating to: ${route}`, 'Available routes:', Object.keys(this.routes)); // Debug log

            const view = this.routes[route];

            if (view) {
                // Update Active Link
                this.navLinks.forEach(link => {
                    link.classList.remove('active');
                    const href = link.getAttribute('href');
                    if (href === `#${route}` || href === `#${route}/`) {
                        link.classList.add('active');
                    }
                });

                // Update Title - handle camelCase routes
                const title = route
                    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
                    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
                    .trim();
                if (this.pageTitle) {
                    this.pageTitle.textContent = title;
                }

                // Render View
                if (route === 'flashcards' && id) {
                    // Handle Flashcard sub-routes
                    await view.renderDeckView(this.viewContainer, id, action);
                } else {
                    await view.render(this.viewContainer);
                }

                if (view.afterRender) await view.afterRender();
            } else {
                console.warn(`Route not found: ${route}`);
            }
        } catch (error) {
            console.error('Router Error:', error);
            this.viewContainer.innerHTML = `<div class="error-state"><h3>Something went wrong</h3><p>${error.message}</p></div>`;
        }
    }
}
