/**
 * SEO-Optimized API Request Handler
 * Lightweight API management for dynamic content loading
 */

class RequestManager {
    constructor() {
        this.cache = new Map();
        this.requestQueue = [];
        this.isProcessing = false;
        this.retryAttempts = 3;
        this.timeout = 10000; // 10 seconds
        this.baseURL = window.location.origin;
    }

    // Initialize request manager
    init() {
        this.setupInterceptors();
        this.preloadCriticalData();
        this.setupOfflineHandling();
    }

    // Setup request interceptors for SEO optimization
    setupInterceptors() {
        // Override fetch to add SEO headers
        const originalFetch = window.fetch;
        window.fetch = async (url, options = {}) => {
            const seoHeaders = {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json, text/html, */*',
                'Cache-Control': 'public, max-age=300'
            };

            options.headers = { ...seoHeaders, ...options.headers };
            
            // Add request tracking
            this.trackRequest(url, 'fetch');
            
            return originalFetch(url, options);
        };
    }

    // Preload critical data for SEO
    async preloadCriticalData() {
        const criticalEndpoints = [
            '/api/deals/popular',
            '/api/categories',
            '/api/sitemap/recent'
        ];

        const preloadPromises = criticalEndpoints.map(endpoint => 
            this.get(endpoint, { priority: 'high', cache: true })
        );

        try {
            await Promise.allSettled(preloadPromises);
        } catch (error) {
            console.log('Preload completed with some failures');
        }
    }

    // GET request with SEO optimizations
    async get(url, options = {}) {
        const cacheKey = `GET:${url}`;
        
        // Check cache first
        if (options.cache && this.hasValidCache(cacheKey)) {
            return this.getFromCache(cacheKey);
        }

        try {
            const response = await this.makeRequest('GET', url, null, options);
            const data = await response.json();
            
            // Cache successful responses
            if (options.cache && response.ok) {
                this.setCache(cacheKey, data, options.cacheTime);
            }
            
            return data;
        } catch (error) {
            return this.handleRequestError(error, 'GET', url, options);
        }
    }

    // POST request for form submissions and updates
    async post(url, data, options = {}) {
        try {
            const response = await this.makeRequest('POST', url, data, options);
            return await response.json();
        } catch (error) {
            return this.handleRequestError(error, 'POST', url, options);
        }
    }

    // PUT request for updates
    async put(url, data, options = {}) {
        try {
            const response = await this.makeRequest('PUT', url, data, options);
            return await response.json();
        } catch (error) {
            return this.handleRequestError(error, 'PUT', url, options);
        }
    }

    // DELETE request
    async delete(url, options = {}) {
        try {
            const response = await this.makeRequest('DELETE', url, null, options);
            return response.ok;
        } catch (error) {
            return this.handleRequestError(error, 'DELETE', url, options);
        }
    }

    // Core request method
    async makeRequest(method, url, data, options = {}) {
        const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
        
        const requestOptions = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers
            },
            signal: AbortSignal.timeout(options.timeout || this.timeout)
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            requestOptions.body = JSON.stringify(data);
        }

        // Add retry logic
        let lastError;
        for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
            try {
                const response = await fetch(fullUrl, requestOptions);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return response;
            } catch (error) {
                lastError = error;
                
                // Don't retry on client errors (4xx)
                if (error.message.includes('HTTP 4')) {
                    break;
                }
                
                // Wait before retry
                if (attempt < this.retryAttempts - 1) {
                    await this.delay(Math.pow(2, attempt) * 1000);
                }
            }
        }
        
        throw lastError;
    }

    // Handle request errors gracefully
    handleRequestError(error, method, url, options) {
        console.error(`${method} ${url} failed:`, error.message);
        
        // Track error for analytics
        this.trackError(method, url, error.message);
        
        // Return cached data if available for GET requests
        if (method === 'GET') {
            const cacheKey = `GET:${url}`;
            const cached = this.getFromCache(cacheKey, true); // Allow stale cache
            if (cached) {
                return cached;
            }
        }
        
        // Return appropriate fallback
        if (options.fallback) {
            return options.fallback;
        }
        
        throw error;
    }

    // Cache management
    hasValidCache(key, maxAge = 300000) { // 5 minutes default
        const cached = this.cache.get(key);
        return cached && (Date.now() - cached.timestamp) < maxAge;
    }

    getFromCache(key, allowStale = false) {
        const cached = this.cache.get(key);
        if (cached) {
            if (allowStale || this.hasValidCache(key)) {
                return cached.data;
            }
        }
        return null;
    }

    setCache(key, data, maxAge = 300000) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            maxAge
        });
        
        // Clean old cache entries
        this.cleanCache();
    }

    cleanCache() {
        const now = Date.now();
        for (const [key, cached] of this.cache.entries()) {
            if (now - cached.timestamp > cached.maxAge) {
                this.cache.delete(key);
            }
        }
    }

    // Specific API methods for the coupon site
    async getDeal(dealId) {
        return this.get(`/api/deals/${dealId}`, { 
            cache: true, 
            cacheTime: 600000 // 10 minutes
        });
    }

    async getRelatedDeals(dealId, limit = 6, offset = 0) {
        return this.get(`/api/deals/${dealId}/related?limit=${limit}&offset=${offset}`, {
            cache: true,
            cacheTime: 300000 // 5 minutes
        });
    }

    async searchDeals(query, filters = {}) {
        const params = new URLSearchParams({ q: query, ...filters });
        return this.get(`/api/search?${params}`, {
            cache: true,
            cacheTime: 180000 // 3 minutes
        });
    }

    async getCategories() {
        return this.get('/api/categories', {
            cache: true,
            cacheTime: 1800000 // 30 minutes
        });
    }

    async getPopularDeals(limit = 10) {
        return this.get(`/api/deals/popular?limit=${limit}`, {
            cache: true,
            cacheTime: 600000 // 10 minutes
        });
    }

    async likeDeal(sourceId, relatedId) {
        return this.post(`/api/deals/${sourceId}/like/${relatedId}`);
    }

    async unlikeDeal(sourceId, relatedId) {
        return this.delete(`/api/deals/${sourceId}/like/${relatedId}`);
    }

    async updateDeal(dealId, data) {
        const result = await this.put(`/api/deals/${dealId}`, data);
        
        // Invalidate related cache
        this.invalidateCache(`GET:/api/deals/${dealId}`);
        this.invalidateCache('GET:/api/deals/popular');
        
        return result;
    }

    // Cache invalidation
    invalidateCache(key) {
        this.cache.delete(key);
    }

    invalidateCachePattern(pattern) {
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }

    // Offline handling
    setupOfflineHandling() {
        window.addEventListener('online', () => {
            this.processQueuedRequests();
        });

        window.addEventListener('offline', () => {
            this.showOfflineMessage();
        });
    }

    processQueuedRequests() {
        if (this.requestQueue.length > 0) {
            console.log(`Processing ${this.requestQueue.length} queued requests`);
            // Process queued requests when back online
            this.requestQueue.forEach(request => {
                this.makeRequest(request.method, request.url, request.data, request.options);
            });
            this.requestQueue = [];
        }
    }

    showOfflineMessage() {
        // Show user-friendly offline message
        const message = document.createElement('div');
        message.className = 'offline-message';
        message.innerHTML = '📡 You\'re offline. Some features may be limited.';
        message.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #ff6b35;
            color: white;
            padding: 10px;
            text-align: center;
            z-index: 10000;
        `;
        document.body.appendChild(message);
        
        setTimeout(() => message.remove(), 5000);
    }

    // Analytics and tracking
    trackRequest(url, method) {
        // Track API usage for optimization
        if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/analytics/requests', JSON.stringify({
                url,
                method,
                timestamp: Date.now(),
                userAgent: navigator.userAgent
            }));
        }
    }

    trackError(method, url, error) {
        if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/analytics/errors', JSON.stringify({
                method,
                url,
                error,
                timestamp: Date.now()
            }));
        }
    }

    // Utility methods
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get cache statistics
    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys())
        };
    }
}

// Initialize request manager
const requestManager = new RequestManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => requestManager.init());
} else {
    requestManager.init();
}

// Export for use in other modules
window.RequestManager = requestManager;
