/**
 * SEO-Optimized Content Management System
 * Lightweight content optimization for dynamic coupon pages
 */

class ContentManager {
    constructor() {
        this.cache = new Map();
        this.seoKeywords = [];
        this.contentQueue = [];
        this.isProcessing = false;
    }

    // Initialize content optimization
    init() {
        this.optimizePageContent();
        this.setupLazyLoading();
        this.enhanceInternalLinks();
        this.trackContentPerformance();
    }

    // Optimize page content for SEO
    optimizePageContent() {
        // Optimize headings hierarchy
        this.optimizeHeadings();
        
        // Add structured data
        this.addStructuredData();
        
        // Optimize meta descriptions
        this.optimizeMetaContent();
        
        // Enhance content readability
        this.enhanceReadability();
    }

    // Optimize heading structure for SEO
    optimizeHeadings() {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let h1Count = 0;
        
        headings.forEach(heading => {
            if (heading.tagName === 'H1') {
                h1Count++;
                if (h1Count > 1) {
                    // Convert extra H1s to H2s for SEO
                    const newH2 = document.createElement('h2');
                    newH2.innerHTML = heading.innerHTML;
                    newH2.className = heading.className;
                    heading.parentNode.replaceChild(newH2, heading);
                }
            }
            
            // Add anchor links for better navigation
            if (heading.id) {
                heading.style.scrollMarginTop = '80px';
            }
        });
    }

    // Add JSON-LD structured data
    addStructuredData() {
        const softwareName = document.querySelector('#software-name')?.textContent;
        const description = document.querySelector('.deal-description')?.textContent;
        
        if (softwareName && description) {
            const structuredData = {
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "name": softwareName,
                "description": description,
                "offers": {
                    "@type": "Offer",
                    "category": "Software Discount",
                    "availability": "https://schema.org/InStock"
                }
            };
            
            const script = document.createElement('script');
            script.type = 'application/ld+json';
            script.textContent = JSON.stringify(structuredData);
            document.head.appendChild(script);
        }
    }

    // Optimize meta content dynamically
    optimizeMetaContent() {
        const title = document.title;
        const metaDesc = document.querySelector('meta[name="description"]');
        
        if (title && metaDesc) {
            // Ensure meta description is optimal length (150-160 chars)
            let desc = metaDesc.content;
            if (desc.length > 160) {
                desc = desc.substring(0, 157) + '...';
                metaDesc.content = desc;
            }
        }
    }

    // Enhance content readability
    enhanceReadability() {
        const contentElements = document.querySelectorAll('p, li, .description');
        
        contentElements.forEach(element => {
            const text = element.textContent;
            if (text.length > 200) {
                // Add reading time estimate
                const words = text.split(' ').length;
                const readTime = Math.ceil(words / 200); // 200 words per minute
                
                if (readTime > 1) {
                    element.setAttribute('data-read-time', `${readTime} min read`);
                }
            }
        });
    }

    // Setup lazy loading for images and content
    setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            imageObserver.unobserve(img);
                        }
                    }
                });
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }

    // Enhance internal linking for SEO
    enhanceInternalLinks() {
        const internalLinks = document.querySelectorAll('a[href^="/"]');
        
        internalLinks.forEach(link => {
            // Add rel attributes for SEO
            if (!link.rel) {
                link.rel = 'internal';
            }
            
            // Track internal link clicks
            link.addEventListener('click', () => {
                this.trackInternalClick(link.href);
            });
        });
    }

    // Track content performance metrics
    trackContentPerformance() {
        // Track scroll depth
        let maxScroll = 0;
        window.addEventListener('scroll', () => {
            const scrollPercent = Math.round(
                (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
            );
            maxScroll = Math.max(maxScroll, scrollPercent);
        });

        // Track time on page
        const startTime = Date.now();
        window.addEventListener('beforeunload', () => {
            const timeOnPage = Math.round((Date.now() - startTime) / 1000);
            this.sendAnalytics({
                type: 'content_engagement',
                timeOnPage,
                maxScroll,
                url: window.location.pathname
            });
        });
    }

    // Track internal link clicks
    trackInternalClick(href) {
        this.sendAnalytics({
            type: 'internal_link_click',
            href,
            source: window.location.pathname
        });
    }

    // Send analytics data
    sendAnalytics(data) {
        if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/analytics', JSON.stringify(data));
        }
    }

    // Cache content for performance
    cacheContent(key, content) {
        this.cache.set(key, {
            content,
            timestamp: Date.now()
        });
    }

    // Get cached content
    getCachedContent(key, maxAge = 300000) { // 5 minutes default
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < maxAge) {
            return cached.content;
        }
        return null;
    }
}

// Initialize content manager
const contentManager = new ContentManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => contentManager.init());
} else {
    contentManager.init();
}

// Export for use in other modules
window.ContentManager = contentManager;
