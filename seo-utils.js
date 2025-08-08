// SEO Utilities for Dynamic Title and Meta Generation
class SEOManager {
    constructor() {
        this.currentDate = new Date();
        this.months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
    }

    // Get current month and year
    getCurrentMonthYear() {
        const month = this.months[this.currentDate.getMonth()];
        const year = this.currentDate.getFullYear();
        return { month, year };
    }

    // Generate SEO-friendly title
    generateSEOTitle(deal) {
        const { month, year } = this.getCurrentMonthYear();
        const discount = this.extractDiscountNumber(deal.discount);
        
        // Template: "70% OFF TaskMagic Coupon Codes - July 2025 Promo Codes"
        return `${discount}% OFF ${deal.software_name} Coupon Codes - ${month} ${year} Promo Codes`;
    }

    // Generate SEO-friendly meta description
    generateMetaDescription(deal) {
        const { month, year } = this.getCurrentMonthYear();
        const discount = this.extractDiscountNumber(deal.discount);
        
        return `Save ${discount}% on ${deal.software_name} with our exclusive ${month} ${year} coupon codes. Use promo code ${deal.coupon_code || 'SAVE' + discount} for instant discount. Limited time offer!`;
    }

    // Generate SEO-friendly H1 heading
    generateH1Heading(deal) {
        const { month, year } = this.getCurrentMonthYear();
        const discount = this.extractDiscountNumber(deal.discount);
        
        return `${discount}% OFF ${deal.software_name} Coupon Codes ${month} ${year}`;
    }

    // Generate SEO-friendly URL slug
    generateURLSlug(deal) {
        const { month, year } = this.getCurrentMonthYear();
        const discount = this.extractDiscountNumber(deal.discount);
        const softwareName = deal.software_name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        return `${discount}-off-${softwareName}-coupon-codes-${month.toLowerCase()}-${year}`;
    }

    // Extract discount number from text like "20% off" -> 20
    extractDiscountNumber(discountText) {
        const match = discountText.match(/(\d+)/);
        return match ? parseInt(match[1]) : 50; // Default to 50 if no number found
    }

    // Generate breadcrumb structure
    generateBreadcrumbs(deal) {
        const { month, year } = this.getCurrentMonthYear();
        
        return [
            { name: 'Home', url: '/' },
            { name: 'Coupon Codes', url: '/coupons' },
            { name: deal.category_name, url: `/category/${deal.category_name.toLowerCase()}` },
            { name: `${deal.software_name} ${month} ${year}`, url: '#', active: true }
        ];
    }

    // Generate structured data (JSON-LD) for SEO
    generateStructuredData(deal) {
        const { month, year } = this.getCurrentMonthYear();
        const discount = this.extractDiscountNumber(deal.discount);
        
        return {
            "@context": "https://schema.org",
            "@type": "Offer",
            "name": `${deal.software_name} ${discount}% Discount`,
            "description": deal.description,
            "category": deal.category_name,
            "priceSpecification": {
                "@type": "PriceSpecification",
                "price": "0",
                "priceCurrency": "USD",
                "valueAddedTaxIncluded": false
            },
            "availability": "https://schema.org/InStock",
            "validFrom": `${year}-${String(this.currentDate.getMonth() + 1).padStart(2, '0')}-01`,
            "validThrough": this.getEndOfMonth(),
            "seller": {
                "@type": "Organization",
                "name": deal.software_name,
                "url": deal.website_url
            },
            "url": deal.referral_link || deal.website_url,
            "discount": `${discount}%`,
            "couponCode": deal.coupon_code
        };
    }

    // Get end of current month for validThrough
    getEndOfMonth() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const lastDay = new Date(year, month + 1, 0).getDate();
        return `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;
    }

    // Generate keywords for meta tags
    generateKeywords(deal) {
        const { month, year } = this.getCurrentMonthYear();
        const discount = this.extractDiscountNumber(deal.discount);
        const softwareName = deal.software_name.toLowerCase();
        
        return [
            `${softwareName} coupon`,
            `${softwareName} promo code`,
            `${softwareName} discount`,
            `${softwareName} ${discount}% off`,
            `${softwareName} ${month.toLowerCase()} ${year}`,
            `${deal.category_name.toLowerCase()} coupons`,
            `${deal.coupon_code}`,
            `save on ${softwareName}`,
            `${softwareName} deal`,
            `${month.toLowerCase()} ${year} coupons`
        ].join(', ');
    }

    // Update page SEO elements
    updatePageSEO(deal) {
        // Update title
        document.title = this.generateSEOTitle(deal);
        
        // Update meta description
        this.updateMetaTag('description', this.generateMetaDescription(deal));
        
        // Update meta keywords
        this.updateMetaTag('keywords', this.generateKeywords(deal));
        
        // Update Open Graph tags
        this.updateMetaProperty('og:title', this.generateSEOTitle(deal));
        this.updateMetaProperty('og:description', this.generateMetaDescription(deal));
        this.updateMetaProperty('og:url', window.location.href);
        this.updateMetaProperty('og:type', 'website');
        
        // Update Twitter Card tags
        this.updateMetaName('twitter:card', 'summary_large_image');
        this.updateMetaName('twitter:title', this.generateSEOTitle(deal));
        this.updateMetaName('twitter:description', this.generateMetaDescription(deal));
        
        // Update canonical URL
        this.updateCanonicalURL(deal);
        
        // Add structured data
        this.addStructuredData(deal);
        
        // Update H1 if exists
        const h1 = document.querySelector('h1');
        if (h1) {
            h1.textContent = this.generateH1Heading(deal);
        }
    }

    // Helper method to update meta tags
    updateMetaTag(name, content) {
        let meta = document.querySelector(`meta[name="${name}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = name;
            document.head.appendChild(meta);
        }
        meta.content = content;
    }

    // Helper method to update meta property tags
    updateMetaProperty(property, content) {
        let meta = document.querySelector(`meta[property="${property}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('property', property);
            document.head.appendChild(meta);
        }
        meta.content = content;
    }

    // Helper method to update meta name tags
    updateMetaName(name, content) {
        let meta = document.querySelector(`meta[name="${name}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = name;
            document.head.appendChild(meta);
        }
        meta.content = content;
    }

    // Update canonical URL
    updateCanonicalURL(deal) {
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
        }
        
        const baseURL = window.location.origin;
        const slug = this.generateURLSlug(deal);
        canonical.href = `${baseURL}/${slug}`;
    }

    // Add structured data to page
    addStructuredData(deal) {
        // Remove existing structured data
        const existingScript = document.querySelector('script[type="application/ld+json"]');
        if (existingScript) {
            existingScript.remove();
        }
        
        // Add new structured data
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(this.generateStructuredData(deal));
        document.head.appendChild(script);
    }

    // Generate content variations for different months
    generateMonthlyContent(deal) {
        const { month, year } = this.getCurrentMonthYear();
        const discount = this.extractDiscountNumber(deal.discount);
        
        return {
            heroText: `Exclusive ${month} ${year} Deal!`,
            urgencyText: `Limited Time ${month} Offer - Don't Miss Out!`,
            ctaText: `Get ${discount}% OFF Now - ${month} Special`,
            footerText: `© ${year} - Best ${deal.software_name} Deals Updated ${month} ${year}`,
            lastUpdated: `Last Updated: ${month} ${this.currentDate.getDate()}, ${year}`
        };
    }

    // Check if it's a new month and update accordingly
    shouldUpdateForNewMonth() {
        const storedMonth = localStorage.getItem('lastUpdateMonth');
        const currentMonth = this.currentDate.getMonth();
        
        if (storedMonth === null || parseInt(storedMonth) !== currentMonth) {
            localStorage.setItem('lastUpdateMonth', currentMonth.toString());
            return true;
        }
        
        return false;
    }

    // Generate multiple page variations for SEO
    generatePageVariations(deal) {
        const { month, year } = this.getCurrentMonthYear();
        const discount = this.extractDiscountNumber(deal.discount);
        const softwareName = deal.software_name;
        
        return {
            primary: {
                title: `${discount}% OFF ${softwareName} Coupon Codes - ${month} ${year} Promo Codes`,
                url: `/${softwareName.toLowerCase().replace(/\s+/g, '-')}-coupon-codes-${month.toLowerCase()}-${year}`,
                h1: `${softwareName} Coupon Codes ${month} ${year} - Save ${discount}%`
            },
            alternative1: {
                title: `${softwareName} Promo Codes ${month} ${year} - ${discount}% Discount`,
                url: `/${softwareName.toLowerCase().replace(/\s+/g, '-')}-promo-codes-${month.toLowerCase()}-${year}`,
                h1: `${month} ${year} ${softwareName} Promo Codes - ${discount}% OFF`
            },
            alternative2: {
                title: `Save ${discount}% on ${softwareName} - ${month} ${year} Deals`,
                url: `/${softwareName.toLowerCase().replace(/\s+/g, '-')}-deals-${month.toLowerCase()}-${year}`,
                h1: `${softwareName} Deals ${month} ${year} - Up to ${discount}% Savings`
            }
        };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SEOManager;
} else {
    window.SEOManager = SEOManager;
}
