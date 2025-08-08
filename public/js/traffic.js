/**
 * SEO-Optimized Traffic Analytics
 * Lightweight analytics for SEO performance tracking
 */

class TrafficAnalytics {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.pageLoadTime = Date.now();
        this.interactions = [];
        this.scrollDepth = 0;
        this.maxScrollDepth = 0;
        this.isActive = true;
        this.lastActivity = Date.now();
        this.bounceThreshold = 30000; // 30 seconds
    }

    // Initialize traffic analytics
    init() {
        this.trackPageView();
        this.setupScrollTracking();
        this.setupClickTracking();
        this.setupEngagementTracking();
        this.setupPerformanceTracking();
        this.setupExitTracking();
    }

    // Track page view for SEO
    trackPageView() {
        const pageData = {
            url: window.location.href,
            pathname: window.location.pathname,
            title: document.title,
            referrer: document.referrer,
            sessionId: this.sessionId,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            connection: this.getConnectionInfo()
        };

        // Track organic search traffic
        if (this.isOrganicTraffic()) {
            pageData.trafficSource = 'organic';
            pageData.searchEngine = this.getSearchEngine();
            pageData.keywords = this.extractKeywords();
        }

        this.sendAnalytics('pageview', pageData);
        this.trackSEOMetrics();
    }

    // Setup scroll depth tracking
    setupScrollTracking() {
        let ticking = false;
        
        const trackScroll = () => {
            const scrollTop = window.pageYOffset;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = Math.round((scrollTop / docHeight) * 100);
            
            this.scrollDepth = scrollPercent;
            this.maxScrollDepth = Math.max(this.maxScrollDepth, scrollPercent);
            
            // Track milestone scroll depths
            const milestones = [25, 50, 75, 90];
            milestones.forEach(milestone => {
                if (scrollPercent >= milestone && !this.scrollMilestones?.[milestone]) {
                    this.scrollMilestones = this.scrollMilestones || {};
                    this.scrollMilestones[milestone] = true;
                    
                    this.sendAnalytics('scroll_depth', {
                        depth: milestone,
                        url: window.location.pathname,
                        timestamp: Date.now()
                    });
                }
            });
            
            ticking = false;
        };

        window.addEventListener('scroll', () => {
            this.updateActivity();
            if (!ticking) {
                requestAnimationFrame(trackScroll);
                ticking = true;
            }
        }, { passive: true });
    }

    // Setup click tracking for internal links
    setupClickTracking() {
        document.addEventListener('click', (event) => {
            this.updateActivity();
            
            const target = event.target.closest('a, button, [data-track]');
            if (!target) return;

            const clickData = {
                element: target.tagName.toLowerCase(),
                text: target.textContent?.trim().substring(0, 100),
                url: window.location.pathname,
                timestamp: Date.now()
            };

            // Track internal link clicks
            if (target.tagName === 'A') {
                const href = target.getAttribute('href');
                if (href) {
                    clickData.linkType = this.getLinkType(href);
                    clickData.destination = href;
                    
                    // Track outbound links
                    if (clickData.linkType === 'external') {
                        clickData.domain = new URL(href, window.location.origin).hostname;
                    }
                }
            }

            // Track CTA buttons
            if (target.classList.contains('cta-button') || target.dataset.track === 'cta') {
                clickData.type = 'cta';
                clickData.ctaText = target.textContent?.trim();
            }

            // Track deal interactions
            if (target.closest('.deal-card') || target.dataset.track === 'deal') {
                clickData.type = 'deal_interaction';
                const dealCard = target.closest('.deal-card');
                if (dealCard) {
                    clickData.dealId = dealCard.dataset.dealId;
                    clickData.dealName = dealCard.querySelector('.deal-title')?.textContent;
                }
            }

            this.sendAnalytics('click', clickData);
        });
    }

    // Setup user engagement tracking
    setupEngagementTracking() {
        // Track time on page
        setInterval(() => {
            if (this.isActive && (Date.now() - this.lastActivity) < 60000) {
                this.sendAnalytics('engagement', {
                    timeOnPage: Date.now() - this.pageLoadTime,
                    scrollDepth: this.maxScrollDepth,
                    interactions: this.interactions.length,
                    url: window.location.pathname
                });
            }
        }, 30000); // Every 30 seconds

        // Track tab visibility
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.isActive = false;
                this.sendAnalytics('tab_hidden', {
                    timeVisible: Date.now() - this.pageLoadTime,
                    url: window.location.pathname
                });
            } else {
                this.isActive = true;
                this.lastActivity = Date.now();
                this.sendAnalytics('tab_visible', {
                    url: window.location.pathname
                });
            }
        });
    }

    // Setup performance tracking for Core Web Vitals
    setupPerformanceTracking() {
        // Track page load performance
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = this.getPerformanceMetrics();
                this.sendAnalytics('performance', perfData);
            }, 0);
        });

        // Track Core Web Vitals
        this.trackCoreWebVitals();
    }

    // Track Core Web Vitals for SEO
    trackCoreWebVitals() {
        // Largest Contentful Paint (LCP)
        if ('PerformanceObserver' in window) {
            try {
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    
                    this.sendAnalytics('core_web_vitals', {
                        metric: 'LCP',
                        value: lastEntry.startTime,
                        url: window.location.pathname,
                        rating: lastEntry.startTime <= 2500 ? 'good' : 
                               lastEntry.startTime <= 4000 ? 'needs_improvement' : 'poor'
                    });
                });
                
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
            } catch (e) {
                console.log('LCP tracking not supported');
            }

            // First Input Delay (FID)
            try {
                const fidObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        this.sendAnalytics('core_web_vitals', {
                            metric: 'FID',
                            value: entry.processingStart - entry.startTime,
                            url: window.location.pathname,
                            rating: entry.processingStart - entry.startTime <= 100 ? 'good' :
                                   entry.processingStart - entry.startTime <= 300 ? 'needs_improvement' : 'poor'
                        });
                    });
                });
                
                fidObserver.observe({ entryTypes: ['first-input'] });
            } catch (e) {
                console.log('FID tracking not supported');
            }
        }

        // Cumulative Layout Shift (CLS)
        this.trackCLS();
    }

    // Track Cumulative Layout Shift
    trackCLS() {
        let clsValue = 0;
        let clsEntries = [];

        if ('PerformanceObserver' in window) {
            try {
                const clsObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                            clsEntries.push(entry);
                        }
                    }
                });

                clsObserver.observe({ entryTypes: ['layout-shift'] });

                // Send CLS data on page unload
                window.addEventListener('beforeunload', () => {
                    this.sendAnalytics('core_web_vitals', {
                        metric: 'CLS',
                        value: clsValue,
                        url: window.location.pathname,
                        rating: clsValue <= 0.1 ? 'good' :
                               clsValue <= 0.25 ? 'needs_improvement' : 'poor'
                    });
                });
            } catch (e) {
                console.log('CLS tracking not supported');
            }
        }
    }

    // Setup exit tracking
    setupExitTracking() {
        window.addEventListener('beforeunload', () => {
            const sessionData = {
                sessionDuration: Date.now() - this.pageLoadTime,
                maxScrollDepth: this.maxScrollDepth,
                interactions: this.interactions.length,
                bounced: this.isBounce(),
                url: window.location.pathname,
                exitType: 'beforeunload'
            };

            // Use sendBeacon for reliable exit tracking
            this.sendAnalytics('session_end', sessionData, true);
        });

        // Track page abandonment
        window.addEventListener('pagehide', () => {
            this.sendAnalytics('page_hide', {
                url: window.location.pathname,
                timeOnPage: Date.now() - this.pageLoadTime
            }, true);
        });
    }

    // Get performance metrics
    getPerformanceMetrics() {
        const perf = performance.timing;
        const navigation = performance.navigation;
        
        return {
            loadTime: perf.loadEventEnd - perf.navigationStart,
            domReady: perf.domContentLoadedEventEnd - perf.navigationStart,
            firstByte: perf.responseStart - perf.navigationStart,
            dns: perf.domainLookupEnd - perf.domainLookupStart,
            connection: perf.connectEnd - perf.connectStart,
            response: perf.responseEnd - perf.responseStart,
            navigationType: navigation.type,
            redirectCount: navigation.redirectCount,
            url: window.location.pathname
        };
    }

    // Track SEO-specific metrics
    trackSEOMetrics() {
        const seoData = {
            title: document.title,
            metaDescription: document.querySelector('meta[name="description"]')?.content,
            h1Count: document.querySelectorAll('h1').length,
            imageCount: document.querySelectorAll('img').length,
            internalLinks: document.querySelectorAll('a[href^="/"]').length,
            externalLinks: document.querySelectorAll('a[href^="http"]:not([href*="' + window.location.hostname + '"])').length,
            wordCount: this.getWordCount(),
            hasStructuredData: !!document.querySelector('script[type="application/ld+json"]'),
            url: window.location.pathname
        };

        this.sendAnalytics('seo_metrics', seoData);
    }

    // Utility methods
    generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    updateActivity() {
        this.lastActivity = Date.now();
        this.isActive = true;
    }

    isOrganicTraffic() {
        const referrer = document.referrer.toLowerCase();
        const searchEngines = ['google', 'bing', 'yahoo', 'duckduckgo', 'baidu'];
        return searchEngines.some(engine => referrer.includes(engine));
    }

    getSearchEngine() {
        const referrer = document.referrer.toLowerCase();
        if (referrer.includes('google')) return 'google';
        if (referrer.includes('bing')) return 'bing';
        if (referrer.includes('yahoo')) return 'yahoo';
        if (referrer.includes('duckduckgo')) return 'duckduckgo';
        return 'unknown';
    }

    extractKeywords() {
        // Extract keywords from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('q') || urlParams.get('query') || '';
    }

    getLinkType(href) {
        if (href.startsWith('http') && !href.includes(window.location.hostname)) {
            return 'external';
        }
        if (href.startsWith('/') || href.includes(window.location.hostname)) {
            return 'internal';
        }
        if (href.startsWith('mailto:')) return 'email';
        if (href.startsWith('tel:')) return 'phone';
        return 'other';
    }

    getConnectionInfo() {
        if ('connection' in navigator) {
            return {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            };
        }
        return null;
    }

    getWordCount() {
        const text = document.body.innerText || '';
        return text.trim().split(/\s+/).length;
    }

    isBounce() {
        const timeOnPage = Date.now() - this.pageLoadTime;
        return timeOnPage < this.bounceThreshold && this.interactions.length === 0;
    }

    // Send analytics data
    sendAnalytics(event, data, useBeacon = false) {
        const payload = {
            event,
            data,
            sessionId: this.sessionId,
            timestamp: Date.now(),
            url: window.location.href
        };

        if (useBeacon && navigator.sendBeacon) {
            navigator.sendBeacon('/api/analytics', JSON.stringify(payload));
        } else {
            // Use fetch with keepalive for reliability
            fetch('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(() => {
                // Fail silently for analytics
            });
        }
    }

    // Public methods for manual tracking
    trackEvent(eventName, eventData = {}) {
        this.sendAnalytics('custom_event', {
            name: eventName,
            ...eventData,
            url: window.location.pathname
        });
    }

    trackConversion(conversionType, value = null) {
        this.sendAnalytics('conversion', {
            type: conversionType,
            value,
            url: window.location.pathname,
            sessionDuration: Date.now() - this.pageLoadTime
        });
    }

    // Get analytics summary
    getAnalyticsSummary() {
        return {
            sessionId: this.sessionId,
            timeOnPage: Date.now() - this.pageLoadTime,
            scrollDepth: this.maxScrollDepth,
            interactions: this.interactions.length,
            isActive: this.isActive,
            bounced: this.isBounce()
        };
    }
}

// Initialize traffic analytics
const trafficAnalytics = new TrafficAnalytics();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => trafficAnalytics.init());
} else {
    trafficAnalytics.init();
}

// Export for use in other modules
window.TrafficAnalytics = trafficAnalytics;
