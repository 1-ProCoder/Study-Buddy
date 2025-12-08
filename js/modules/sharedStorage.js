// Shared Storage API - Wrapper for localStorage with shared data support
// Mimics window.storage API with shared: true parameter
window.storage = {
    // Get data from storage
    get: function(key, shared = false) {
        try {
            const storageKey = shared ? `sb_shared_${key}` : `sb_${key}`;
            const data = localStorage.getItem(storageKey);
            if (!data || data === 'undefined' || data === 'null') {
                return shared ? [] : null;
            }
            return JSON.parse(data);
        } catch (e) {
            console.warn(`Error reading ${key} from storage:`, e);
            return shared ? [] : null;
        }
    },

    // Set data to storage
    set: function(key, value, shared = false) {
        try {
            const storageKey = shared ? `sb_shared_${key}` : `sb_${key}`;
            localStorage.setItem(storageKey, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error(`Error writing ${key} to storage:`, e);
            return false;
        }
    },

    // Remove data from storage
    remove: function(key, shared = false) {
        try {
            const storageKey = shared ? `sb_shared_${key}` : `sb_${key}`;
            localStorage.removeItem(storageKey);
            return true;
        } catch (e) {
            console.error(`Error removing ${key} from storage:`, e);
            return false;
        }
    },

    // Check if key exists
    has: function(key, shared = false) {
        const storageKey = shared ? `sb_shared_${key}` : `sb_${key}`;
        return localStorage.getItem(storageKey) !== null;
    }
};

