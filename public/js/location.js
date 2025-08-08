/**
 * SEO-Optimized Location and Geographic Targeting
 * Enhances local SEO and geographic relevance for coupon pages
 */

class LocationSEO {
    constructor() {
        this.userLocation = null;
        this.geoData = null;
        this.locationCache = new Map();
        this.supportedCountries = ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IN', 'BR'];
        this.currencyMap = {
            'US': 'USD', 'CA': 'CAD', 'GB': 'GBP', 'AU': 'AUD',
            'DE': 'EUR', 'FR': 'EUR', 'IN': 'INR', 'BR': 'BRL'
        };
    }

    // Initialize location-based SEO
    async init() {
        await this.detectUserLocation();
        this.optimizeForLocation();
        this.addLocationStructuredData();
        this.setupRegionalContent();
        this.trackLocationMetrics();
    }

    // Detect user location for geo-targeting
    async detectUserLocation() {
        try {
            // Try multiple location detection methods
            await this.getLocationFromIP();
            
            // Fallback to browser geolocation if available
            if (!this.userLocation && 'geolocation' in navigator) {
                await this.getBrowserLocation();
            }
            
            // Final fallback to timezone detection
            if (!this.userLocation) {
                this.getLocationFromTimezone();
            }
            
        } catch (error) {
            console.log('Location detection failed, using defaults');
            this.setDefaultLocation();
        }
    }

    // Get location from IP address
    async getLocationFromIP() {
        try {
            // Use multiple IP geolocation services for reliability
            const services = [
                'https://ipapi.co/json/',
                'https://ip-api.com/json/',
                'https://ipinfo.io/json'
            ];

            for (const service of services) {
                try {
                    const response = await fetch(service);
                    if (response.ok) {
                        const data = await response.json();
                        this.processLocationData(data);
                        if (this.userLocation) break;
                    }
                } catch (e) {
                    continue; // Try next service
                }
            }
        } catch (error) {
            console.log('IP geolocation failed');
        }
    }

    // Get location from browser geolocation API
    getBrowserLocation() {
        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        const locationData = await this.reverseGeocode(latitude, longitude);
                        this.processLocationData(locationData);
                        resolve();
                    } catch (error) {
                        resolve();
                    }
                },
                () => resolve(),
                { timeout: 5000, enableHighAccuracy: false }
            );
        });
    }

    // Reverse geocode coordinates to location data
    async reverseGeocode(lat, lon) {
        try {
            const response = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
            );
            return await response.json();
        } catch (error) {
            return null;
        }
    }

    // Get location from timezone
    getLocationFromTimezone() {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const timezoneMap = {
            'America/New_York': { country: 'US', region: 'Eastern' },
            'America/Chicago': { country: 'US', region: 'Central' },
            'America/Denver': { country: 'US', region: 'Mountain' },
            'America/Los_Angeles': { country: 'US', region: 'Pacific' },
            'Europe/London': { country: 'GB', region: 'GMT' },
            'Europe/Paris': { country: 'FR', region: 'CET' },
            'Europe/Berlin': { country: 'DE', region: 'CET' },
            'Asia/Kolkata': { country: 'IN', region: 'IST' },
            'Australia/Sydney': { country: 'AU', region: 'AEST' }
        };

        if (timezoneMap[timezone]) {
            this.userLocation = timezoneMap[timezone];
        }
    }

    // Process location data from various sources
    processLocationData(data) {
        if (!data) return;

        this.geoData = data;
        this.userLocation = {
            country: data.country_code || data.countryCode || data.country,
            region: data.region || data.regionName || data.principalSubdivision,
            city: data.city || data.locality,
            timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    }

    // Set default location if detection fails
    setDefaultLocation() {
        this.userLocation = {
            country: 'US',
            region: 'Global',
            city: 'Online',
            timezone: 'UTC'
        };
    }

    // Optimize content for user's location
    optimizeForLocation() {
        if (!this.userLocation) return;

        // Update currency displays
        this.updateCurrencyDisplay();
        
        // Add location-specific content
        this.addLocationContent();
        
        // Update meta tags for local SEO
        this.updateLocationMeta();
        
        // Add hreflang tags
        this.addHreflangTags();
    }

    // Update currency displays based on location
    updateCurrencyDisplay() {
        const currency = this.currencyMap[this.userLocation.country] || 'USD';
        const currencyElements = document.querySelectorAll('[data-currency]');
        
        currencyElements.forEach(element => {
            const amount = parseFloat(element.dataset.amount || element.textContent.replace(/[^\d.]/g, ''));
            if (amount) {
                element.textContent = this.formatCurrency(amount, currency);
            }
        });
    }

    // Format currency based on locale
    formatCurrency(amount, currency) {
        try {
            return new Intl.NumberFormat(this.getLocale(), {
                style: 'currency',
                currency: currency
            }).format(amount);
        } catch (error) {
            return `${currency} ${amount}`;
        }
    }

    // Get locale string from location
    getLocale() {
        const localeMap = {
            'US': 'en-US', 'CA': 'en-CA', 'GB': 'en-GB',
            'AU': 'en-AU', 'DE': 'de-DE', 'FR': 'fr-FR',
            'IN': 'en-IN', 'BR': 'pt-BR'
        };
        return localeMap[this.userLocation.country] || 'en-US';
    }

    // Add location-specific content
    addLocationContent() {
        // Add location indicator
        const locationIndicator = document.createElement('div');
        locationIndicator.className = 'location-indicator';
        locationIndicator.innerHTML = `
            <span class="location-icon">📍</span>
            <span class="location-text">Available in ${this.userLocation.region || this.userLocation.country}</span>
        `;
        
        const header = document.querySelector('header') || document.querySelector('.hero-section');
        if (header) {
            header.appendChild(locationIndicator);
        }

        // Update deal availability text
        this.updateAvailabilityText();
    }

    // Update availability text based on location
    updateAvailabilityText() {
        const availabilityElements = document.querySelectorAll('.availability, [data-availability]');
        
        availabilityElements.forEach(element => {
            if (this.userLocation.country) {
                element.textContent = `Available in ${this.userLocation.country}`;
                element.style.color = '#28a745';
            }
        });
    }

    // Update meta tags for local SEO
    updateLocationMeta() {
        // Add geo meta tags
        this.addMetaTag('geo.region', `${this.userLocation.country}-${this.userLocation.region}`);
        this.addMetaTag('geo.placename', this.userLocation.city);
        this.addMetaTag('geo.position', this.geoData?.latitude + ';' + this.geoData?.longitude);
        
        // Update existing meta description with location
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && this.userLocation.country) {
            const currentDesc = metaDesc.content;
            if (!currentDesc.includes(this.userLocation.country)) {
                metaDesc.content = currentDesc + ` Available in ${this.userLocation.country}.`;
            }
        }
    }

    // Add meta tag helper
    addMetaTag(name, content) {
        if (!content) return;
        
        let meta = document.querySelector(`meta[name="${name}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = name;
            document.head.appendChild(meta);
        }
        meta.content = content;
    }

    // Add hreflang tags for international SEO
    addHreflangTags() {
        const currentPath = window.location.pathname;
        const supportedLocales = {
            'en-US': '/us' + currentPath,
            'en-GB': '/uk' + currentPath,
            'en-CA': '/ca' + currentPath,
            'en-AU': '/au' + currentPath,
            'de-DE': '/de' + currentPath,
            'fr-FR': '/fr' + currentPath
        };

        Object.entries(supportedLocales).forEach(([locale, href]) => {
            const link = document.createElement('link');
            link.rel = 'alternate';
            link.hreflang = locale;
            link.href = window.location.origin + href;
            document.head.appendChild(link);
        });

        // Add x-default
        const defaultLink = document.createElement('link');
        defaultLink.rel = 'alternate';
        defaultLink.hreflang = 'x-default';
        defaultLink.href = window.location.origin + currentPath;
        document.head.appendChild(defaultLink);
    }

    // Add location-based structured data
    addLocationStructuredData() {
        if (!this.userLocation) return;

        const structuredData = {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "geo": {
                "@type": "GeoCoordinates",
                "addressCountry": this.userLocation.country,
                "addressRegion": this.userLocation.region
            },
            "audience": {
                "@type": "Audience",
                "geographicArea": {
                    "@type": "Country",
                    "name": this.userLocation.country
                }
            }
        };

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(structuredData);
        document.head.appendChild(script);
    }

    // Setup regional content variations
    setupRegionalContent() {
        // Show/hide region-specific deals
        const regionalDeals = document.querySelectorAll('[data-region]');
        regionalDeals.forEach(deal => {
            const dealRegions = deal.dataset.region.split(',');
            if (!dealRegions.includes(this.userLocation.country)) {
                deal.style.display = 'none';
            }
        });

        // Update contact information for region
        this.updateRegionalContact();
    }

    // Update contact information based on region
    updateRegionalContact() {
        const contactInfo = {
            'US': { phone: '+1-800-DEALS', hours: '9 AM - 5 PM EST' },
            'GB': { phone: '+44-800-DEALS', hours: '9 AM - 5 PM GMT' },
            'AU': { phone: '+61-800-DEALS', hours: '9 AM - 5 PM AEST' }
        };

        const info = contactInfo[this.userLocation.country];
        if (info) {
            const phoneElements = document.querySelectorAll('.contact-phone');
            const hoursElements = document.querySelectorAll('.contact-hours');
            
            phoneElements.forEach(el => el.textContent = info.phone);
            hoursElements.forEach(el => el.textContent = info.hours);
        }
    }

    // Track location-based metrics
    trackLocationMetrics() {
        const locationData = {
            country: this.userLocation?.country,
            region: this.userLocation?.region,
            city: this.userLocation?.city,
            timezone: this.userLocation?.timezone,
            url: window.location.pathname,
            timestamp: Date.now()
        };

        // Send to analytics
        this.sendLocationAnalytics(locationData);
    }

    // Send location analytics
    sendLocationAnalytics(data) {
        if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/analytics/location', JSON.stringify(data));
        }
    }

    // Get user's location data
    getLocation() {
        return this.userLocation;
    }

    // Check if user is in supported region
    isSupportedRegion() {
        return this.supportedCountries.includes(this.userLocation?.country);
    }
}

// Initialize location SEO
const locationSEO = new LocationSEO();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => locationSEO.init());
} else {
    locationSEO.init();
}

// Export for use in other modules
window.LocationSEO = locationSEO;
