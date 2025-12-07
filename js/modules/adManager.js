// Ad Manager - Handles ad placement and display
class AdManager {
    constructor() {
        this.adContainers = [];
        this.adEnabled = true; // Toggle ads on/off
    }

    // Create ad container with proper styling
    createAdContainer(type = 'banner', position = 'bottom') {
        if (!this.adEnabled) return null;

        const container = document.createElement('div');
        container.className = `ad-container ad-${type} ad-${position}`;
        container.setAttribute('data-ad-type', type);
        container.setAttribute('data-ad-position', position);
        
        // Add "Ad" label for transparency
        const adLabel = document.createElement('div');
        adLabel.className = 'ad-label';
        adLabel.textContent = 'Advertisement';
        
        // Ad content placeholder
        const adContent = document.createElement('div');
        adContent.className = 'ad-content';
        adContent.innerHTML = this.getAdPlaceholder(type);
        
        container.appendChild(adLabel);
        container.appendChild(adContent);
        
        return container;
    }

    // Get placeholder content (replace with actual ad code)
    getAdPlaceholder(type) {
        const placeholders = {
            banner: `
                <div style="width: 100%; height: 100px; background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
                    <div style="text-align: center;">
                        <div style="font-size: 0.9rem; opacity: 0.9;">Sponsored Content</div>
                        <div style="font-size: 0.75rem; opacity: 0.7; margin-top: 4px;">300x100 Ad Space</div>
                    </div>
                </div>
            `,
            sidebar: `
                <div style="width: 100%; min-height: 250px; background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
                    <div style="text-align: center;">
                        <div style="font-size: 0.9rem; opacity: 0.9;">Sponsored Content</div>
                        <div style="font-size: 0.75rem; opacity: 0.7; margin-top: 4px;">160x600 Ad Space</div>
                    </div>
                </div>
            `,
            inline: `
                <div style="width: 100%; height: 90px; background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
                    <div style="text-align: center;">
                        <div style="font-size: 0.85rem; opacity: 0.9;">Sponsored Content</div>
                        <div style="font-size: 0.7rem; opacity: 0.7; margin-top: 4px;">728x90 Ad Space</div>
                    </div>
                </div>
            `,
            small: `
                <div style="width: 100%; height: 60px; background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
                    <div style="text-align: center;">
                        <div style="font-size: 0.8rem; opacity: 0.9;">Sponsored</div>
                    </div>
                </div>
            `
        };
        
        return placeholders[type] || placeholders.banner;
    }

    // Insert ad into specific location
    insertAd(selector, type = 'banner', position = 'after') {
        if (!this.adEnabled) return;
        
        const target = document.querySelector(selector);
        if (!target) return;

        const adContainer = this.createAdContainer(type, position);
        if (!adContainer) return;

        if (position === 'after') {
            target.insertAdjacentElement('afterend', adContainer);
        } else if (position === 'before') {
            target.insertAdjacentElement('beforebegin', adContainer);
        } else if (position === 'inside') {
            target.appendChild(adContainer);
        }

        this.adContainers.push(adContainer);
        return adContainer;
    }

    // Load actual ad (Google AdSense, etc.)
    loadAd(container, adUnitId, adFormat = 'auto') {
        if (!this.adEnabled || !container) return;

        // Placeholder for actual ad loading
        // Example for Google AdSense:
        /*
        (adsbygoogle = window.adsbygoogle || []).push({
            google_ad_client: "ca-pub-XXXXXXXXXX",
            enable_page_level_ads: false
        });
        */

        // For now, we'll use placeholder
        const adContent = container.querySelector('.ad-content');
        if (adContent) {
            // Replace with actual ad code here
            console.log(`Loading ad: ${adUnitId} in format: ${adFormat}`);
        }
    }

    // Remove all ads
    removeAllAds() {
        this.adContainers.forEach(ad => ad.remove());
        this.adContainers = [];
    }

    // Toggle ads on/off
    toggleAds(enabled) {
        this.adEnabled = enabled;
        if (!enabled) {
            this.removeAllAds();
        }
    }

    // Initialize ads on page load
    init() {
        // Don't show ads during active study sessions
        if (this.isStudySessionActive()) {
            return;
        }

        // Add ads to strategic locations
        this.insertSidebarAd();
        this.insertDashboardAds();
    }

    // Check if study session is active
    isStudySessionActive() {
        // Check if pomodoro timer is running
        return document.querySelector('.pomodoro-active') !== null;
    }

    // Insert sidebar ad
    insertSidebarAd() {
        const sidebar = document.querySelector('.sidebar nav');
        if (sidebar) {
            const adContainer = this.createAdContainer('sidebar', 'bottom');
            if (adContainer) {
                sidebar.parentElement.appendChild(adContainer);
                this.adContainers.push(adContainer);
            }
        }
    }

    // Insert dashboard ads
    insertDashboardAds() {
        // Ad after stats cards
        setTimeout(() => {
            const statsRow = document.querySelector('.grid-3');
            if (statsRow) {
                this.insertAd('.grid-3', 'inline', 'after');
            }
        }, 500);
    }
}

// Export for use in other files
window.AdManager = AdManager;

